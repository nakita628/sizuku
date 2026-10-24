import type { SeedRow, SeedValue } from "./config.js";
import type { Dialect, ModelTable, SeedColumn, SeedTableRows } from "./schema.js";

/** A statement with its values bound: what the driver runs. */
export type SeedStatement = { readonly sql: string; readonly params: readonly unknown[] };

/** The most values one INSERT binds; SQLite's limit is 32766, PostgreSQL's 65535. */
const MAX_PARAMS = 30_000;

/** Rows per INSERT, so a literal file stays readable. */
const MAX_ROWS = 200;

export function quoteIdentifier(dialect: Dialect, name: string) {
  return dialect === "mysql"
    ? `\`${name.replaceAll("`", "``")}\``
    : `"${name.replaceAll('"', '""')}"`;
}

/** The table as the dialect names it: `"auth"."users"` when it lives in a PostgreSQL schema. */
export function qualifiedName(dialect: Dialect, table: ModelTable) {
  const name = quoteIdentifier(dialect, table.table);
  return table.schema === null ? name : `${quoteIdentifier(dialect, table.schema)}.${name}`;
}

/** `YYYY-MM-DD HH:MM:SS.mmm` in UTC, the form every dialect parses. */
function timestamp(date: Date) {
  const iso = date.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 23)}`;
}

/**
 * The value as the driver binds it: Drizzle's own mapping of the column first (a boolean to 0 / 1
 * on SQLite, a date to the text or number its mode stores, JSON to text), then what is left made
 * bindable for the dialect.
 */
export function driverValue(dialect: Dialect, column: SeedColumn, value: SeedValue | undefined) {
  if (value === null || value === undefined) return null;
  const mapped: unknown = column.toDriver(value);
  if (mapped === null || mapped === undefined) return null;
  if (typeof mapped === "boolean") return dialect === "sqlite" ? (mapped ? 1 : 0) : mapped;
  if (typeof mapped === "bigint") return dialect === "sqlite" ? mapped : mapped.toString();
  if (mapped instanceof Date) return dialect === "mysql" ? timestamp(mapped) : mapped.toISOString();
  if (mapped instanceof Uint8Array) return dialect === "sqlite" ? mapped : Buffer.from(mapped);
  if (typeof mapped === "object") return JSON.stringify(mapped);
  return mapped;
}

function stringLiteral(dialect: Dialect, text: string) {
  const quoted = text.replaceAll("'", "''");
  // MySQL reads a backslash in a string as an escape unless told otherwise.
  return `'${dialect === "mysql" ? quoted.replaceAll("\\", "\\\\") : quoted}'`;
}

/** A bound value as a SQL literal of the dialect, for a script. */
export function renderLiteral(dialect: Dialect, value: unknown) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof Uint8Array) {
    const hex = Buffer.from(value).toString("hex");
    return dialect === "postgresql" ? `'\\x${hex}'` : `X'${hex}'`;
  }
  return stringLiteral(dialect, typeof value === "string" ? value : JSON.stringify(value));
}

/** The rows in runs that give the same columns, so each INSERT names one set. */
function runsOf(table: ModelTable, rows: readonly SeedRow[]) {
  const runs: { columns: readonly SeedColumn[]; rows: SeedRow[] }[] = [];
  for (const row of rows) {
    const columns = table.columns.filter((column) => row[column.field] !== undefined);
    const last = runs.at(-1);
    if (
      last !== undefined &&
      last.columns.length === columns.length &&
      last.columns.every((c, i) => c === columns[i])
    ) {
      last.rows.push(row);
    } else {
      runs.push({ columns, rows: [row] });
    }
  }
  return runs.flatMap((run) => {
    const size = Math.max(
      1,
      Math.min(MAX_ROWS, Math.floor(MAX_PARAMS / Math.max(run.columns.length, 1))),
    );
    return Array.from({ length: Math.ceil(run.rows.length / size) }, (_, i) => ({
      columns: run.columns,
      rows: run.rows.slice(i * size, (i + 1) * size),
    }));
  });
}

function placeholder(dialect: Dialect, n: number) {
  return dialect === "postgresql" ? `$${n}` : "?";
}

/**
 * The INSERTs of one table, its rows bound as parameters (`literal: false`) or written in
 * (`literal: true`). A PostgreSQL `generated always` identity takes the seeder's numbers only
 * with OVERRIDING SYSTEM VALUE.
 */
export function insertStatements(
  dialect: Dialect,
  entry: SeedTableRows<SeedRow>,
  literal: boolean,
): SeedStatement[] {
  const target = qualifiedName(dialect, entry.table);
  return runsOf(entry.table, entry.rows).flatMap(({ columns, rows }) => {
    if (columns.length === 0) {
      // A row of nothing but defaults: each is a statement of its own.
      const sql =
        dialect === "mysql"
          ? `INSERT INTO ${target} () VALUES ()`
          : `INSERT INTO ${target} DEFAULT VALUES`;
      return rows.map(() => ({ sql, params: [] }));
    }
    const names = columns.map((c) => quoteIdentifier(dialect, c.column)).join(", ");
    const values = rows.map((row) => columns.map((c) => driverValue(dialect, c, row[c.field])));
    const overriding =
      dialect === "postgresql" && columns.some((c) => c.identityAlways)
        ? " OVERRIDING SYSTEM VALUE"
        : "";
    const head = `INSERT INTO ${target} (${names})${overriding}`;
    if (literal) {
      const tuples = values.map(
        (row) => `  (${row.map((v) => renderLiteral(dialect, v)).join(", ")})`,
      );
      return [{ sql: `${head} VALUES\n${tuples.join(",\n")}`, params: [] }];
    }
    let n = 0;
    const tuples = values.map(
      (row) => `(${row.map(() => placeholder(dialect, (n += 1))).join(", ")})`,
    );
    return [{ sql: `${head} VALUES ${tuples.join(", ")}`, params: values.flat() }];
  });
}

/** `DELETE FROM` every seeded table, children first, so no key is left dangling. */
export function resetSql(dialect: Dialect, tables: readonly ModelTable[]) {
  const deletes = tables
    .toReversed()
    .map((table) => `DELETE FROM ${qualifiedName(dialect, table)}`);
  // MySQL checks keys row by row, so a self relation would block its own DELETE.
  return dialect === "mysql"
    ? ["SET FOREIGN_KEY_CHECKS = 0", ...deletes, "SET FOREIGN_KEY_CHECKS = 1"]
    : deletes;
}

/**
 * PostgreSQL sequences do not follow explicit values, so after seeding a serial or identity
 * column with 1..n the next insert would reuse 1. These move each sequence past the rows. SQLite
 * and MySQL move on by themselves.
 */
export function sequenceSql(dialect: Dialect, tables: readonly ModelTable[]) {
  if (dialect !== "postgresql") return [];
  return tables.flatMap((table) =>
    table.columns
      .filter((column) => column.autoincrement)
      .map((column) => {
        const target = qualifiedName(dialect, table);
        const name = quoteIdentifier(dialect, column.column);
        return `SELECT setval(pg_get_serial_sequence(${stringLiteral(dialect, target)}, ${stringLiteral(dialect, column.column)}), COALESCE((SELECT MAX(${name}) FROM ${target}), 0) + 1, false)`;
      }),
  );
}

/** The whole seed as one SQL script: a transaction around the optional reset, the inserts and the sequence fix-ups. */
export function makeSeedSql(input: {
  readonly dialect: Dialect;
  readonly entries: readonly SeedTableRows<SeedRow>[];
  readonly reset: boolean;
  readonly seed: number | null;
  readonly locale: readonly string[];
}) {
  const { dialect, entries } = input;
  const tables = entries.map((entry) => entry.table);
  const counts = entries.map((entry) => `${entry.table.name}: ${entry.rows.length}`).join(", ");
  const header = [
    `-- Generated by sizuku seed (seed ${input.seed ?? "random"}, locale ${input.locale.length === 0 ? "en" : input.locale.join(", ")})`,
    `-- ${counts}`,
  ];
  const open = dialect === "mysql" ? "START TRANSACTION;" : "BEGIN;";
  const pragma = dialect === "sqlite" ? ["PRAGMA foreign_keys = ON;"] : [];
  const reset = input.reset ? resetSql(dialect, tables).map((sql) => `${sql};`) : [];
  const inserts = entries.flatMap((entry) =>
    insertStatements(dialect, entry, true).map((statement) => `${statement.sql};`),
  );
  const sequences = sequenceSql(dialect, tables).map((sql) => `${sql};`);
  return `${[...header, ...pragma, open, ...reset, ...inserts, ...sequences, "COMMIT;"].join("\n")}\n`;
}
