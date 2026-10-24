import * as z from "zod";
import type { SchemaModel } from "../../../types/index.js";
import { RelationFields } from "./docs.js";
import { makePosition } from "./parse.js";
import { Dialect } from "./sql.js";

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

const MakeSchemaDialectInput = z
  .object({ source: z.string().meta({ description: "The schema source" }) })
  .readonly()
  .meta({ description: "A schema source" });

/** The dialect the schema is written for, read from the table builder it calls. */
export function makeSchemaDialect(input: z.infer<typeof MakeSchemaDialectInput>): Dialect | null {
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

const SPAN = {
  start: z.number().meta({ description: "Its first offset in the query" }),
  end: z.number().meta({ description: "The offset just past it" }),
} as const;

const MakeQueryBodyInput = z
  .object({
    code: z
      .string()
      .meta({ description: "The query as written", example: "db.select().from(user)" }),
    error: z
      .object({
        message: z.string().meta({ description: "What the parser says" }),
        offset: z.number().meta({ description: "Where the error starts in the query" }),
      })
      .readonly()
      .nullable()
      .meta({ description: "Its first syntax error; null when it parsed" }),
    last: z
      .object({
        ...SPAN,
        expression: z
          .object(SPAN)
          .readonly()
          .meta({ description: "The expression the statement is made of" }),
      })
      .readonly()
      .nullable()
      .meta({ description: "Its last statement, when that is an expression statement" }),
  })
  .readonly()
  .meta({ description: "A query and what the parser found in it" });

/**
 * The query as the body of an async function, its last expression statement turned into a
 * `return`, so `db.select().from(user)` gives its rows the way a REPL gives a value. A query
 * that does not parse fails with the line and column of the error in the query's own text.
 */
export function makeQueryBody(input: z.infer<typeof MakeQueryBodyInput>) {
  const { code, error, last } = input;
  if (error !== null) {
    const position = makePosition({ source: code, offset: error.offset });
    return { body: null, error: { message: error.message, ...position } } as const;
  }
  if (last === null) return { body: code, error: null } as const;
  const expression = code.slice(last.expression.start, last.expression.end);
  return {
    body: `${code.slice(0, last.start)}return (${expression});${code.slice(last.end)}`,
    error: null,
  } as const;
}

const Names = z
  .array(z.string())
  .readonly()
  .meta({ description: "The names the schema exports", example: ["user", "post"] });

const MakeTypePreambleInput = z
  .object({
    dialect: Dialect,
    schemaImport: z
      .string()
      .meta({ description: "The schema as the query file imports it", example: "./schema.ts" }),
    names: Names,
  })
  .readonly()
  .meta({ description: "What a query is type-checked against" });

/**
 * The lines the language service reads in front of a query: `db` typed as the schema's Drizzle
 * database, the schema's exports and the operators imported, and the query inside an async
 * function so `await` and `return` mean what they do when it runs. `suffix` closes it.
 */
export function makeTypePreamble(input: z.infer<typeof MakeTypePreambleInput>) {
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

const MakeRuntimeModuleInput = z
  .object({
    dialect: Dialect,
    schemaUrl: z.string().meta({ description: "The file URL the schema is loaded from" }),
    names: Names,
    body: z.string().meta({ description: "The query as the body of the function" }),
  })
  .readonly()
  .meta({ description: "What a query runs with" });

/**
 * The module a query runs as: Drizzle's proxy driver for the dialect over `callback`, which the
 * studio answers from its own connection, with the schema loaded from `schemaUrl`.
 */
export function makeRuntimeModule(input: z.infer<typeof MakeRuntimeModuleInput>) {
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

const MakeQueryTouchedInput = z
  .object({
    models: z.array(z.custom<SchemaModel>()).readonly().meta({ description: "The tables" }),
    relationFields: RelationFields,
    names: z
      .array(z.string())
      .readonly()
      .meta({ description: "The identifiers the query reads", example: ["db", "post", "eq"] }),
    members: z
      .array(
        z
          .object({
            object: z.string().meta({ description: "The object read", example: "post" }),
            property: z
              .string()
              .meta({ description: "The property read off it", example: "title" }),
          })
          .readonly(),
      )
      .readonly()
      .meta({ description: "The `a.b` accesses of the query" }),
    queries: z
      .array(z.string())
      .readonly()
      .meta({ description: "The tables of `db.query.<table>`", example: ["user"] }),
    withs: z
      .array(z.string())
      .readonly()
      .meta({ description: "The relation names given to `with`", example: ["posts"] }),
    writes: z
      .array(z.string())
      .readonly()
      .meta({ description: "The names handed to insert, update or delete", example: ["post"] }),
  })
  .readonly()
  .meta({ description: "The tables of a schema and the names a query uses" });

/**
 * The tables a query touches, each with the columns it names: a table read by its name or through
 * `db.query`, and the tables its `with` reaches through the relations of the ones already touched;
 * the ones it inserts into, updates or deletes from are marked as written.
 */
export function makeQueryTouched(input: z.infer<typeof MakeQueryTouchedInput>) {
  const named = new Set([...input.names, ...input.queries]);
  const touched = new Set(input.models.map((m) => m.name).filter((name) => named.has(name)));
  // A `with` can nest, so the relations are followed until nothing new is reached.
  const withs = new Set(input.withs);
  let grew = true;
  while (grew) {
    grew = false;
    for (const field of input.relationFields) {
      if (touched.has(field.table) && withs.has(field.name) && !touched.has(field.target)) {
        touched.add(field.target);
        grew = true;
      }
    }
  }
  return input.models
    .filter((model) => touched.has(model.name))
    .map((model) => {
      const fields = new Set(model.fields.map((f) => f.name));
      const columns = input.members
        .filter((m) => m.object === model.name && fields.has(m.property))
        .map((m) => m.property);
      return {
        table: model.name,
        columns: [...new Set(columns)],
        write: input.writes.includes(model.name),
      };
    });
}
