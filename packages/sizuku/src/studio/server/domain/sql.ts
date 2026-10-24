import * as z from "zod";

export const Dialect = z
  .enum(["sqlite", "postgresql", "mysql"])
  .meta({ description: "The SQL dialect a database speaks" });
export type Dialect = z.infer<typeof Dialect>;

const CellValue = z
  .union([z.string(), z.number(), z.boolean(), z.null()])
  .meta({ description: "A value as the API carries it: what JSON can hold in a cell" });
export type CellValue = z.infer<typeof CellValue>;

export type Statement = { readonly sql: string; readonly params: readonly unknown[] };

const Values = z
  .record(z.string(), CellValue)
  .readonly()
  .meta({ description: "Values by property name", example: { title: "Hello" } });

const Table = z
  .object({
    table: z.string().meta({ description: "The database table name", example: "posts" }),
    columns: z
      .array(
        z
          .object({
            name: z.string().meta({ description: "The property name", example: "authorId" }),
            column: z.string().meta({ description: "The column name", example: "author_id" }),
          })
          .readonly(),
      )
      .readonly()
      .meta({ description: "Its columns" }),
    key: z
      .array(z.string())
      .readonly()
      .meta({ description: "The properties that identify a row", example: ["id"] }),
  })
  .readonly()
  .meta({ description: "A table as the data views read and write it" });
type Table = z.infer<typeof Table>;

const Url = z
  .object({ url: z.string().meta({ description: "A connection URL", example: "file:./dev.db" }) })
  .readonly()
  .meta({ description: "A connection URL" });

/** The dialect a connection URL speaks; null for a scheme sizuku does not know. */
export function makeDialect(input: z.infer<typeof Url>): Dialect | null {
  const { url } = input;
  if (/^postgres(ql)?:\/\//u.test(url)) return "postgresql";
  if (/^(mysql|mariadb):\/\//u.test(url)) return "mysql";
  if (/^(file|sqlite):/u.test(url) || /\.(db|sqlite3?)$/u.test(url) || url === ":memory:") {
    return "sqlite";
  }
  return null;
}

/** The file a SQLite URL names: `file:./dev.db` and `sqlite:./dev.db` both mean `./dev.db`. */
export function makeSqlitePath(input: z.infer<typeof Url>) {
  return input.url.replace(/^(file|sqlite):(\/\/)?/u, "");
}

/** The URL with its password replaced, for showing on the page. */
export function makeRedactedUrl(input: z.infer<typeof Url>) {
  return input.url.replace(/(\/\/[^:/@]+:)[^@]*@/u, "$1****@");
}

const MakeIdentifierInput = z
  .object({ dialect: Dialect, name: z.string().meta({ description: "A table or column name" }) })
  .readonly()
  .meta({ description: "A name to quote" });

/** The name quoted as the dialect quotes identifiers. */
export function makeIdentifier(input: z.infer<typeof MakeIdentifierInput>) {
  return input.dialect === "mysql"
    ? `\`${input.name.replaceAll("`", "``")}\``
    : `"${input.name.replaceAll('"', '""')}"`;
}

/** The placeholder of the n-th parameter (1-based). */
function placeholder(dialect: Dialect, n: number) {
  return dialect === "postgresql" ? `$${n}` : "?";
}

const MakeParamInput = z
  .object({ dialect: Dialect, value: CellValue })
  .readonly()
  .meta({ description: "A value to bind" });

/** A value as the driver takes it: SQLite has no boolean, so true and false go as 1 and 0. */
export function makeParam(input: z.infer<typeof MakeParamInput>) {
  if (input.dialect === "sqlite" && typeof input.value === "boolean") return input.value ? 1 : 0;
  return input.value;
}

/** A value a driver returned, as JSON can carry it. */
export function makeCell(value: unknown): CellValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
  if (typeof value === "bigint") {
    return Number.isSafeInteger(Number(value)) ? Number(value) : value.toString();
  }
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (value instanceof Uint8Array) return `\\x${Buffer.from(value).toString("hex")}`;
  return JSON.stringify(value);
}

function columnOf(table: Table, name: string) {
  return table.columns.find((c) => c.name === name)?.column ?? null;
}

const MakeUnknownFieldsInput = z
  .object({ table: Table, values: Values })
  .readonly()
  .meta({ description: "Values to write to a table" });

/** The fields of `values` that the table does not have, for a 422. */
export function makeUnknownFields(input: z.infer<typeof MakeUnknownFieldsInput>) {
  return Object.keys(input.values).filter((name) => columnOf(input.table, name) === null);
}

const Search = z
  .string()
  .meta({ description: "Text to look for in any column; empty matches every row", example: "ada" });

/**
 * The WHERE clause of a search: any column, read as text, holds the text, whatever its case
 * (`ILIKE` on PostgreSQL, `LOWER` on MySQL, whose binary columns would match case-sensitively;
 * SQLite's `LIKE` ignores the case already). `%`, `_` and the escape are matched as written, and
 * the parameters are numbered from `from`.
 */
function searchClause(dialect: Dialect, table: Table, search: string, from: number) {
  if (search === "") return { sql: "", params: [] };
  const pattern = `%${search.replaceAll(/[!%_]/gu, "!$&")}%`;
  const tests = table.columns.map(({ column }, index) => {
    const name = makeIdentifier({ dialect, name: column });
    const param = placeholder(dialect, from + index);
    if (dialect === "postgresql") return `CAST(${name} AS TEXT) ILIKE ${param} ESCAPE '!'`;
    if (dialect === "mysql") return `LOWER(CAST(${name} AS CHAR)) LIKE LOWER(${param}) ESCAPE '!'`;
    return `CAST(${name} AS TEXT) LIKE ${param} ESCAPE '!'`;
  });
  return { sql: ` WHERE ${tests.join(" OR ")}`, params: table.columns.map(() => pattern) };
}

const MakeCountStatementInput = z
  .object({ dialect: Dialect, table: Table, search: Search.optional() })
  .readonly()
  .meta({ description: "A table to count, or the rows of it a search matches" });

/** How many rows the table has, or how many of them the search matches. */
export function makeCountStatement(input: z.infer<typeof MakeCountStatementInput>) {
  const where = searchClause(input.dialect, input.table, input.search ?? "", 1);
  return {
    sql: `SELECT COUNT(*) AS count FROM ${makeIdentifier({ dialect: input.dialect, name: input.table.table })}${where.sql}`,
    params: where.params,
  };
}

const MakeSelectStatementInput = z
  .object({
    dialect: Dialect,
    table: Table,
    skip: z.number().meta({ description: "How many rows to skip", example: 0 }),
    take: z.number().meta({ description: "How many rows to read", example: 50 }),
    search: Search.optional(),
  })
  .readonly()
  .meta({ description: "A page of a table" });

/** One page of rows, or of the rows a search matches, ordered by the key so paging is stable. */
export function makeSelectStatement(input: z.infer<typeof MakeSelectStatementInput>): Statement {
  const { dialect, table } = input;
  const order = table.key
    .map((name) => columnOf(table, name))
    .filter((column) => column !== null)
    .map((column) => makeIdentifier({ dialect, name: column }));
  const where = searchClause(dialect, table, input.search ?? "", 1);
  const next = where.params.length + 1;
  return {
    sql: [
      `SELECT * FROM ${makeIdentifier({ dialect, name: table.table })}${where.sql}`,
      ...(order.length > 0 ? [`ORDER BY ${order.join(", ")}`] : []),
      `LIMIT ${placeholder(dialect, next)} OFFSET ${placeholder(dialect, next + 1)}`,
    ].join(" "),
    params: [...where.params, input.take, input.skip],
  };
}

const MakeRowInput = z
  .object({
    table: Table,
    row: z
      .record(z.string(), z.unknown())
      .readonly()
      .meta({ description: "A row as the driver returned it, by column name" }),
  })
  .readonly()
  .meta({ description: "A row of a table" });

/** A database row keyed back by property name; a column the schema does not know keeps its own. */
export function makeRow(input: z.infer<typeof MakeRowInput>) {
  return Object.fromEntries(
    Object.entries(input.row).map(([column, value]) => [
      input.table.columns.find((c) => c.column === column)?.name ?? column,
      makeCell(value),
    ]),
  );
}

const MakeInsertStatementInput = z
  .object({ dialect: Dialect, table: Table, values: Values })
  .readonly()
  .meta({ description: "A row to add; the columns left out take their defaults" });

export function makeInsertStatement(input: z.infer<typeof MakeInsertStatementInput>): Statement {
  const { dialect, table } = input;
  const entries = Object.entries(input.values);
  const name = makeIdentifier({ dialect, name: table.table });
  if (entries.length === 0) {
    return {
      sql:
        dialect === "mysql"
          ? `INSERT INTO ${name} () VALUES ()`
          : `INSERT INTO ${name} DEFAULT VALUES`,
      params: [],
    };
  }
  const columns = entries.map(([field]) =>
    makeIdentifier({ dialect, name: columnOf(table, field) ?? field }),
  );
  return {
    sql: `INSERT INTO ${name} (${columns.join(", ")}) VALUES (${entries.map((_, i) => placeholder(dialect, i + 1)).join(", ")})`,
    params: entries.map(([, value]) => makeParam({ dialect, value })),
  };
}

// NULL is matched with IS NULL and takes no parameter, so only the other columns are numbered.
function whereClause(
  dialect: Dialect,
  table: Table,
  where: z.infer<typeof Values>,
  offset: number,
) {
  const entries = Object.entries(where);
  const bound = entries.filter(([, value]) => value !== null);
  const conditions = entries.map(([field, value]) => {
    const column = makeIdentifier({ dialect, name: columnOf(table, field) ?? field });
    if (value === null) return `${column} IS NULL`;
    const n = offset + bound.findIndex(([name]) => name === field) + 1;
    return `${column} = ${placeholder(dialect, n)}`;
  });
  return {
    sql: conditions.join(" AND "),
    params: bound.map(([, value]) => makeParam({ dialect, value })),
  };
}

const MakeUpdateStatementInput = z
  .object({
    dialect: Dialect,
    table: Table,
    where: Values.meta({ description: "The key of the row to change" }),
    values: Values.meta({ description: "The values to set" }),
  })
  .readonly()
  .meta({ description: "A change to one row" });

export function makeUpdateStatement(input: z.infer<typeof MakeUpdateStatementInput>): Statement {
  const { dialect, table } = input;
  const entries = Object.entries(input.values);
  const set = entries.map(
    ([field], i) =>
      `${makeIdentifier({ dialect, name: columnOf(table, field) ?? field })} = ${placeholder(dialect, i + 1)}`,
  );
  const where = whereClause(dialect, table, input.where, entries.length);
  return {
    sql: `UPDATE ${makeIdentifier({ dialect, name: table.table })} SET ${set.join(", ")} WHERE ${where.sql}`,
    params: [...entries.map(([, value]) => makeParam({ dialect, value })), ...where.params],
  };
}

const MakeDeleteStatementInput = z
  .object({
    dialect: Dialect,
    table: Table,
    where: Values.meta({ description: "The key of the row to delete" }),
  })
  .readonly()
  .meta({ description: "A row to delete" });

export function makeDeleteStatement(input: z.infer<typeof MakeDeleteStatementInput>): Statement {
  const where = whereClause(input.dialect, input.table, input.where, 0);
  return {
    sql: `DELETE FROM ${makeIdentifier({ dialect: input.dialect, name: input.table.table })} WHERE ${where.sql}`,
    params: where.params,
  };
}
