export type Dialect = "sqlite" | "postgresql" | "mysql";

/** A value as the API carries it: what JSON can hold in a cell. */
export type CellValue = string | number | boolean | null;

export type Statement = { readonly sql: string; readonly params: readonly unknown[] };

/** The dialect a connection URL speaks; null for a scheme sizuku does not know. */
export function makeDialect(input: { readonly url: string }): Dialect | null {
  const { url } = input;
  if (/^postgres(ql)?:\/\//u.test(url)) return "postgresql";
  if (/^(mysql|mariadb):\/\//u.test(url)) return "mysql";
  if (/^(file|sqlite):/u.test(url) || /\.(db|sqlite3?)$/u.test(url) || url === ":memory:") {
    return "sqlite";
  }
  return null;
}

/** The file a SQLite URL names: `file:./dev.db` and `sqlite:./dev.db` both mean `./dev.db`. */
export function makeSqlitePath(input: { readonly url: string }) {
  return input.url.replace(/^(file|sqlite):(\/\/)?/u, "");
}

/** The URL with its password replaced, for showing on the page. */
export function makeRedactedUrl(input: { readonly url: string }) {
  return input.url.replace(/(\/\/[^:/@]+:)[^@]*@/u, "$1****@");
}

export function makeIdentifier(input: { readonly dialect: Dialect; readonly name: string }) {
  return input.dialect === "mysql"
    ? `\`${input.name.replaceAll("`", "``")}\``
    : `"${input.name.replaceAll('"', '""')}"`;
}

/** The placeholder of the n-th parameter (1-based). */
function placeholder(dialect: Dialect, n: number) {
  return dialect === "postgresql" ? `$${n}` : "?";
}

/** A value as the driver takes it: SQLite has no boolean, so true and false go as 1 and 0. */
export function makeParam(input: { readonly dialect: Dialect; readonly value: CellValue }) {
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

type Table = {
  readonly table: string;
  readonly columns: readonly { readonly name: string; readonly column: string }[];
  readonly key: readonly string[];
};

function columnOf(table: Table, name: string) {
  return table.columns.find((c) => c.name === name)?.column ?? null;
}

/** The fields of `values` that the table does not have, for a 422. */
export function makeUnknownFields(input: {
  readonly table: Table;
  readonly values: Readonly<Record<string, CellValue>>;
}) {
  return Object.keys(input.values).filter((name) => columnOf(input.table, name) === null);
}

export function makeCountStatement(input: { readonly dialect: Dialect; readonly table: Table }) {
  return {
    sql: `SELECT COUNT(*) AS count FROM ${makeIdentifier({ dialect: input.dialect, name: input.table.table })}`,
    params: [],
  };
}

/** One page of rows, ordered by the key so that paging is stable. */
export function makeSelectStatement(input: {
  readonly dialect: Dialect;
  readonly table: Table;
  readonly skip: number;
  readonly take: number;
}): Statement {
  const { dialect, table } = input;
  const order = table.key
    .map((name) => columnOf(table, name))
    .filter((column) => column !== null)
    .map((column) => makeIdentifier({ dialect, name: column }));
  return {
    sql: [
      `SELECT * FROM ${makeIdentifier({ dialect, name: table.table })}`,
      ...(order.length > 0 ? [`ORDER BY ${order.join(", ")}`] : []),
      `LIMIT ${placeholder(dialect, 1)} OFFSET ${placeholder(dialect, 2)}`,
    ].join(" "),
    params: [input.take, input.skip],
  };
}

/** A database row keyed back by property name; a column the schema does not know keeps its own. */
export function makeRow(input: {
  readonly table: Table;
  readonly row: Readonly<Record<string, unknown>>;
}) {
  return Object.fromEntries(
    Object.entries(input.row).map(([column, value]) => [
      input.table.columns.find((c) => c.column === column)?.name ?? column,
      makeCell(value),
    ]),
  );
}

export function makeInsertStatement(input: {
  readonly dialect: Dialect;
  readonly table: Table;
  readonly values: Readonly<Record<string, CellValue>>;
}): Statement {
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
  where: Readonly<Record<string, CellValue>>,
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

export function makeUpdateStatement(input: {
  readonly dialect: Dialect;
  readonly table: Table;
  readonly where: Readonly<Record<string, CellValue>>;
  readonly values: Readonly<Record<string, CellValue>>;
}): Statement {
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

export function makeDeleteStatement(input: {
  readonly dialect: Dialect;
  readonly table: Table;
  readonly where: Readonly<Record<string, CellValue>>;
}): Statement {
  const where = whereClause(input.dialect, input.table, input.where, 0);
  return {
    sql: `DELETE FROM ${makeIdentifier({ dialect: input.dialect, name: input.table.table })} WHERE ${where.sql}`,
    params: where.params,
  };
}
