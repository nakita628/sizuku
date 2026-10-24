import { parseSync } from "oxc-parser";
import { parseSource } from "../../../helper/ast.js";
import { diagramSchema, extractRelationSchemas, tableCalls } from "../../../helper/index.js";
import { stripImports } from "../../../utils/index.js";

/** The first syntax error of a schema source, at the UTF-16 offset it starts; null when it parses. */
export function findSyntaxError(source: string) {
  const { errors } = parseSync("schema.ts", source, { lang: "ts", sourceType: "module" });
  const [first] = errors;
  if (first === undefined) return null;
  return { message: first.message, offset: first.labels[0]?.start ?? 0 };
}

/** The tables, relations and enums of a schema that parses, as the ER diagram reads them. */
export function readSchema(source: string) {
  return diagramSchema(stripImports(source));
}

/** Where each exported table is declared, as offsets into the whole file, imports included. */
export function findTableSpans(source: string) {
  const { program, text } = parseSource(source.split("\n"));
  return tableCalls(program, text).map(({ varName, start, end }) => ({
    name: varName,
    start,
    end,
  }));
}

/** The names `relations()` gives each table's relations, which `db.query.*.findMany({ with })` takes. */
export function readRelationNames(source: string) {
  const names: Record<string, string[]> = {};
  for (const block of extractRelationSchemas(stripImports(source), "zod")) {
    names[block.baseName] = [...(names[block.baseName] ?? []), ...block.fields.map((f) => f.name)];
  }
  return names;
}

const WRAP_START = "async function __sizuku_query() {\n";

/**
 * A query parsed as the body of an async function, so `await` and `return` mean what they do when
 * it runs: its first syntax error, or else its last statement when that is an expression
 * statement. Offsets are in the query's own text.
 */
export function parseQuery(code: string) {
  const wrapped = `${WRAP_START}${code}\n}`;
  const { program, errors } = parseSync("query.ts", wrapped, { lang: "ts", sourceType: "module" });
  const own = (offset: number) => Math.min(Math.max(0, offset - WRAP_START.length), code.length);
  const [first] = errors;
  if (first !== undefined) {
    return {
      error: { message: first.message, offset: own(first.labels[0]?.start ?? 0) },
      last: null,
    };
  }
  const fn = program.body[0];
  const statements = fn?.type === "FunctionDeclaration" ? (fn.body?.body ?? []) : [];
  const last = statements.at(-1);
  if (last?.type !== "ExpressionStatement") return { error: null, last: null };
  return {
    error: null,
    last: {
      start: own(last.start),
      end: own(last.end),
      expression: { start: own(last.expression.start), end: own(last.expression.end) },
    },
  };
}
