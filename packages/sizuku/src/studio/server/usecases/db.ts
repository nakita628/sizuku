import { Effect } from "effect";
import * as DocsDomain from "../domain/docs.js";
import * as ParseDomain from "../domain/parse.js";
import * as SqlDomain from "../domain/sql.js";
import type { CellValue } from "../domain/sql.js";
import { DatabaseUnavailableError, InvalidInputError, UnknownTableError } from "../errors/index.js";
import { NO_DATABASE_MESSAGE } from "../constants/index.js";
import { readText } from "../services/file.js";
import { getStudio } from "../services/studio.js";

type Values = Readonly<Record<string, CellValue>>;

/** The tables of the saved schema; none while it does not parse. */
function tables() {
  return Effect.gen(function* () {
    const source = yield* readText(getStudio().schemaPath);
    return ParseDomain.makeParseError({ source }) === null
      ? DocsDomain.makeDbTables({ source })
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
}) {
  return Effect.gen(function* () {
    const db = yield* driver();
    const found = yield* table(input.table);
    const total = yield* db.query(
      SqlDomain.makeCountStatement({ dialect: db.dialect, table: found }),
    );
    const page = yield* db.query(
      SqlDomain.makeSelectStatement({
        dialect: db.dialect,
        table: found,
        skip: input.skip,
        take: input.take,
      }),
    );
    return {
      rows: page.rows.map((row) => SqlDomain.makeRow({ table: found, row })),
      total: Number(total.rows[0]?.count ?? 0),
      skip: input.skip,
      take: input.take,
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

export function runSql(input: { readonly sql: string }) {
  return Effect.gen(function* () {
    const db = yield* driver();
    const started = performance.now();
    const result = yield* db.query({ sql: input.sql, params: [] });
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
