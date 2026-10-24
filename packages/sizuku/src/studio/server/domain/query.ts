import { parseSync } from "oxc-parser";
import type { Dialect } from "./sql.js";
import { makePosition } from "./parse.js";

/**
 * What drizzle-orm exports for writing queries, in scope without an import. One that the
 * installed version lacks is simply undefined at run time.
 */
export const OPERATORS = [
  "eq",
  "ne",
  "gt",
  "gte",
  "lt",
  "lte",
  "and",
  "or",
  "not",
  "isNull",
  "isNotNull",
  "inArray",
  "notInArray",
  "exists",
  "notExists",
  "between",
  "notBetween",
  "like",
  "notLike",
  "ilike",
  "notIlike",
  "arrayContains",
  "arrayContained",
  "arrayOverlaps",
  "asc",
  "desc",
  "sql",
  "count",
  "countDistinct",
  "avg",
  "avgDistinct",
  "sum",
  "sumDistinct",
  "max",
  "min",
  "getTableColumns",
] as const;

const PROXIES = {
  sqlite: { module: "drizzle-orm/sqlite-proxy", type: "SqliteRemoteDatabase" },
  postgresql: { module: "drizzle-orm/pg-proxy", type: "PgRemoteDatabase" },
  mysql: { module: "drizzle-orm/mysql-proxy", type: "MySqlRemoteDatabase" },
} as const;

/** The dialect the schema is written for, read from the table builder it calls. */
export function makeSchemaDialect(input: { readonly source: string }): Dialect | null {
  if (/\bpgTable\s*\(/u.test(input.source)) return "postgresql";
  if (/\bmysqlTable\s*\(/u.test(input.source)) return "mysql";
  if (/\bsqliteTable\s*\(/u.test(input.source)) return "sqlite";
  return null;
}

/** The names a query has in scope: every export of the schema, and the operators it does not shadow. */
function scope(names: readonly string[]) {
  const tables = names.filter((name) => name !== "db");
  const operators = OPERATORS.filter((name) => !tables.includes(name));
  return { tables, operators };
}

const WRAP_START = "async function __sizuku_query() {\n";

/**
 * The query as the body of an async function, its last expression statement turned into a
 * `return`, so `db.select().from(user)` gives its rows the way a REPL gives a value. A query
 * that does not parse fails with the line and column of the error in the query's own text.
 */
export function makeQueryBody(input: { readonly code: string }) {
  const wrapped = `${WRAP_START}${input.code}\n}`;
  const { program, errors } = parseSync("query.ts", wrapped, { lang: "ts", sourceType: "module" });
  const [first] = errors;
  if (first !== undefined) {
    const offset = Math.max(0, (first.labels[0]?.start ?? 0) - WRAP_START.length);
    const position = makePosition({
      source: input.code,
      offset: Math.min(offset, input.code.length),
    });
    return { body: null, error: { message: first.message, ...position } } as const;
  }
  const fn = program.body[0];
  const statements = fn?.type === "FunctionDeclaration" ? (fn.body?.body ?? []) : [];
  const last = statements.at(-1);
  if (last?.type !== "ExpressionStatement") return { body: input.code, error: null } as const;
  const start = last.start - WRAP_START.length;
  const end = last.end - WRAP_START.length;
  const expression = wrapped.slice(last.expression.start, last.expression.end);
  return {
    body: `${input.code.slice(0, start)}return (${expression});${input.code.slice(end)}`,
    error: null,
  } as const;
}

/**
 * The lines the language service reads in front of a query: `db` typed as the schema's Drizzle
 * database, the schema's exports and the operators imported, and the query inside an async
 * function so `await` and `return` mean what they do when it runs. `suffix` closes it.
 */
export function makeTypePreamble(input: {
  readonly dialect: Dialect;
  /** The schema as the query file imports it: `./schema.ts`. */
  readonly schemaImport: string;
  readonly names: readonly string[];
}) {
  const proxy = PROXIES[input.dialect];
  const { tables, operators } = scope(input.names);
  const lines = [
    `import type { ${proxy.type} } from "${proxy.module}";`,
    `import * as __schema from "${input.schemaImport}";`,
    `import { ${operators.join(", ")} } from "drizzle-orm";`,
    ...(tables.length > 0 ? [`import { ${tables.join(", ")} } from "${input.schemaImport}";`] : []),
    `declare const db: ${proxy.type}<typeof __schema>;`,
    `export default async function __sizuku_query() {`,
    "",
  ];
  return { preamble: lines.join("\n"), suffix: "\n}\n" };
}

/**
 * The module a query runs as: Drizzle's proxy driver for the dialect over `callback`, which the
 * studio answers from its own connection, with the schema loaded from `schemaUrl`.
 */
export function makeRuntimeModule(input: {
  readonly dialect: Dialect;
  readonly schemaUrl: string;
  readonly names: readonly string[];
  readonly body: string;
}) {
  const proxy = PROXIES[input.dialect];
  const { tables, operators } = scope(input.names);
  // MySQL's relational queries need to be told the server is not PlanetScale.
  const config =
    input.dialect === "mysql" ? `{ schema: __schema, mode: "default" }` : "{ schema: __schema }";
  return [
    `import { drizzle as __drizzle } from "${proxy.module}";`,
    `import * as __schema from "${input.schemaUrl}";`,
    `import * as __orm from "drizzle-orm";`,
    `export default async function (__callback) {`,
    `  const db = __drizzle(__callback, ${config});`,
    `  const { ${operators.join(", ")} } = __orm;`,
    ...(tables.length > 0 ? [`  const { ${tables.join(", ")} } = __schema;`] : []),
    input.body,
    `}`,
  ].join("\n");
}

/** A value a query returned, as JSON can carry it: dates as ISO strings, big integers as text. */
export function makeJsonValue(value: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
  if (value === undefined || value === null) return null;
  if (typeof value === "bigint") {
    return Number.isSafeInteger(Number(value)) ? Number(value) : value.toString();
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
  if (typeof value === "function" || typeof value === "symbol") return String(value);
  if (typeof value !== "object") return value;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (value instanceof Uint8Array) return `\\x${Buffer.from(value).toString("hex")}`;
  if (seen.has(value)) return "[Circular]";
  seen.add(value);
  if (value instanceof Map) {
    return Object.fromEntries([...value].map(([k, v]) => [String(k), makeJsonValue(v, seen)]));
  }
  if (value instanceof Set || Array.isArray(value)) {
    return [...value].map((item) => makeJsonValue(item, seen));
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, makeJsonValue(item, seen)]),
  );
}
