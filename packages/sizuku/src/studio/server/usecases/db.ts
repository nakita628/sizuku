import { Effect } from "effect";
import { analyze, paramsByStatement, splitStatements } from "../../../sql/index.js";
import * as DocsDomain from "../domain/docs.js";
import * as QueryDomain from "../domain/query.js";
import * as SqlDomain from "../domain/sql.js";
import type { CellValue } from "../domain/sql.js";
import { DatabaseUnavailableError, InvalidInputError, UnknownTableError } from "../errors/index.js";
import { NO_DATABASE_MESSAGE } from "../constants/index.js";
import { readText } from "../services/file.js";
import * as ParseService from "../services/parse.js";
import * as PlanService from "../services/plan.js";
import { getStudio } from "../services/studio.js";

type Values = Readonly<Record<string, CellValue>>;

/** The tables of the saved schema; none while it does not parse. */
function tables() {
  return Effect.gen(function* () {
    const source = yield* readText(getStudio().schemaPath);
    return ParseService.findSyntaxError(source) === null
      ? DocsDomain.makeDbTables({ models: ParseService.readSchema(source).models })
      : [];
  });
}

function driver() {
  const { driver } = getStudio().database;
  return driver === null
    ? Effect.fail(
        new DatabaseUnavailableError({
          reason: getStudio().database.status.error ?? NO_DATABASE_MESSAGE,
        }),
      )
    : Effect.succeed(driver);
}

function table(name: string) {
  return Effect.gen(function* () {
    const found = (yield* tables()).find((t) => t.name === name);
    if (found === undefined) return yield* new UnknownTableError({ table: name });
    return found;
  });
}

function checkFields(
  found: Effect.Success<ReturnType<typeof table>>,
  values: Values,
  field: string,
) {
  const unknown = SqlDomain.makeUnknownFields({ table: found, values });
  return unknown.length === 0
    ? Effect.void
    : Effect.fail(
        new InvalidInputError({
          field,
          message: `Unknown column${unknown.length > 1 ? "s" : ""} of ${found.name}: ${unknown.join(", ")}`,
        }),
      );
}

function requireSome(values: Values, field: string) {
  return Object.keys(values).length > 0
    ? Effect.void
    : Effect.fail(
        new InvalidInputError({ field, message: `${field} must name at least one column` }),
      );
}

export function readStatus() {
  return Effect.gen(function* () {
    return { ...getStudio().database.status, tables: yield* tables() };
  });
}

/** Row counts by table; a table whose count fails (not migrated yet, say) is left out. */
export function readCounts() {
  return Effect.gen(function* () {
    const db = yield* driver();
    const counted = yield* Effect.forEach(yield* tables(), (t) =>
      db.query(SqlDomain.makeCountStatement({ dialect: db.dialect, table: t })).pipe(
        Effect.map((result) => [[t.name, Number(result.rows[0]?.count ?? 0)] as const]),
        Effect.orElseSucceed(() => []),
      ),
    );
    return { counts: Object.fromEntries(counted.flat()) };
  });
}

export function readRows(input: {
  readonly table: string;
  readonly skip: number;
  readonly take: number;
  readonly search: string;
}) {
  return Effect.gen(function* () {
    const db = yield* driver();
    const found = yield* table(input.table);
    const search = input.search.trim();
    const total = yield* db.query(
      SqlDomain.makeCountStatement({ dialect: db.dialect, table: found, search }),
    );
    const page = yield* db.query(
      SqlDomain.makeSelectStatement({
        dialect: db.dialect,
        table: found,
        skip: input.skip,
        take: input.take,
        search,
      }),
    );
    return {
      rows: page.rows.map((row) => SqlDomain.makeRow({ table: found, row })),
      total: Number(total.rows[0]?.count ?? 0),
      skip: input.skip,
      take: input.take,
      search,
    };
  });
}

export function insertRow(input: { readonly table: string; readonly values: Values }) {
  return Effect.gen(function* () {
    const db = yield* driver();
    const found = yield* table(input.table);
    yield* checkFields(found, input.values, "values");
    const result = yield* db.query(
      SqlDomain.makeInsertStatement({ dialect: db.dialect, table: found, values: input.values }),
    );
    return { count: result.rowCount };
  });
}

export function updateRow(input: {
  readonly table: string;
  readonly where: Values;
  readonly values: Values;
}) {
  return Effect.gen(function* () {
    const db = yield* driver();
    const found = yield* table(input.table);
    yield* requireSome(input.where, "where");
    yield* requireSome(input.values, "values");
    yield* checkFields(found, input.where, "where");
    yield* checkFields(found, input.values, "values");
    const result = yield* db.query(
      SqlDomain.makeUpdateStatement({
        dialect: db.dialect,
        table: found,
        where: input.where,
        values: input.values,
      }),
    );
    return { count: result.rowCount };
  });
}

export function deleteRow(input: { readonly table: string; readonly where: Values }) {
  return Effect.gen(function* () {
    const db = yield* driver();
    const found = yield* table(input.table);
    yield* requireSome(input.where, "where");
    yield* checkFields(found, input.where, "where");
    const result = yield* db.query(
      SqlDomain.makeDeleteStatement({ dialect: db.dialect, table: found, where: input.where }),
    );
    return { count: result.rowCount };
  });
}

/** The statements of the text, or an InvalidInputError when it holds none. */
function statementsOf(sql: string) {
  const statements = splitStatements(sql);
  return statements.length === 0
    ? Effect.fail(new InvalidInputError({ field: "sql", message: "holds no statement" }))
    : Effect.succeed(statements);
}

/**
 * Runs the statements one by one, each with the values its own placeholders take, and returns
 * the rows of the last, or the rows it changed for a write, with the time the whole took.
 */
export function runSql(input: { readonly sql: string; readonly params: readonly CellValue[] }) {
  return Effect.gen(function* () {
    const db = yield* driver();
    const statements = yield* statementsOf(input.sql);
    const params = input.params.map((value) => SqlDomain.makeParam({ dialect: db.dialect, value }));
    const bound = paramsByStatement(statements, params);
    const started = performance.now();
    const results = yield* Effect.forEach(statements, (sql, index) =>
      db.query({ sql, params: bound[index] ?? [] }),
    );
    const result = results.at(-1) ?? { columns: [], rows: [], rowCount: 0 };
    const columns = result.columns.length > 0 ? result.columns : Object.keys(result.rows[0] ?? {});
    return {
      columns: [...columns],
      rows: result.rows.map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [key, SqlDomain.makeCell(value)]),
        ),
      ),
      rowCount: result.rowCount,
      durationMs: Math.round((performance.now() - started) * 100) / 100,
    };
  });
}

/** The execution plan the database chooses for the first statement of the text. */
export function explainSql(input: { readonly sql: string; readonly params: readonly CellValue[] }) {
  return Effect.gen(function* () {
    const db = yield* driver();
    const [first = ""] = yield* statementsOf(input.sql);
    const params = paramsByStatement(
      [first],
      input.params.map((value) => SqlDomain.makeParam({ dialect: db.dialect, value })),
    )[0];
    const { rows } = yield* db.query({
      sql: SqlDomain.makeExplainStatement({ dialect: db.dialect, sql: first }),
      params: params ?? [],
    });
    const plan =
      db.dialect === "postgresql"
        ? PlanService.makePostgresPlan({ document: rows[0]?.["QUERY PLAN"] ?? null })
        : db.dialect === "mysql"
          ? PlanService.makeMysqlPlan({ document: rows[0]?.["EXPLAIN"] ?? null })
          : PlanService.makeSqlitePlan({ rows });
    return { dialect: db.dialect, nodes: [...plan.nodes], raw: plan.raw };
  });
}

/**
 * Analyzes every statement of the text against the tables of the saved schema, in the connected
 * database's dialect, or the one the schema is written for while none is connected.
 */
export function analyzeSql(input: { readonly sql: string }) {
  return Effect.gen(function* () {
    const source = yield* readText(getStudio().schemaPath);
    const parses = ParseService.findSyntaxError(source) === null;
    const dialect =
      getStudio().database.status.dialect ?? QueryDomain.makeSchemaDialect({ source }) ?? "sqlite";
    return analyze(
      input.sql,
      SqlDomain.makeAnalysisSchema({
        dialect,
        models: parses ? ParseService.readSchema(source).models : [],
      }),
    );
  });
}
