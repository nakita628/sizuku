import { parseSync, Visitor } from "oxc-parser";
import type { Node } from "oxc-parser";
import {
  arrowObject,
  declaratorName,
  exportedDeclarations,
  isArrow,
  isCall,
  isPropertyAssignment,
  parseSource,
  unwrapParens,
} from "../../../helper/ast.js";
import { diagramSchema, tableCalls } from "../../../helper/index.js";
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

/**
 * The relations `relations()` declares, as `db.query.*.findMany({ with })` names them: the table,
 * the name it gives the relation, and the table `one()` or `many()` points at.
 */
export function readRelationFields(source: string) {
  const { program } = parseSource(stripImports(source));
  return exportedDeclarations(program).flatMap(({ declarator }) => {
    const call = declarator.init;
    if (declaratorName(declarator) === null || !isCall(call)) return [];
    if (call.callee.type !== "Identifier" || call.callee.name !== "relations") return [];
    const [base, define] = call.arguments;
    if (base?.type !== "Identifier" || !isArrow(define)) return [];
    const object = arrowObject(define);
    return (object?.properties ?? []).flatMap((property) => {
      if (!isPropertyAssignment(property) || property.key.type !== "Identifier") return [];
      const value = unwrapParens(property.value);
      const target = isCall(value) ? value.arguments[0] : undefined;
      if (target?.type !== "Identifier") return [];
      return [{ table: base.name, name: property.key.name, target: target.name }];
    });
  });
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

/**
 * The names a query uses: every identifier it reads, `table.column` member accesses, the tables
 * of `db.query.<table>`, and the keys of every `with: { ... }`, nested ones included.
 */
export function readQueryNames(code: string) {
  const { program, errors } = parseSync("query.ts", `async function __q() {\n${code}\n}`, {
    lang: "ts",
    sourceType: "module",
  });
  if (errors.length > 0) return null;
  // A property name is an identifier too; `post.title` reads `post`, not `title`.
  const keys = new Set<Node>();
  const identifiers: Node[] = [];
  const names = new Set<string>();
  const members: { readonly object: string; readonly property: string }[] = [];
  const queries = new Set<string>();
  const withs = new Set<string>();
  new Visitor({
    Identifier(node) {
      identifiers.push(node);
    },
    MemberExpression(node) {
      if (node.computed || node.property.type !== "Identifier") return;
      keys.add(node.property);
      const object = node.object;
      if (object.type === "Identifier") {
        members.push({ object: object.name, property: node.property.name });
      }
      if (
        object.type === "MemberExpression" &&
        !object.computed &&
        object.property.type === "Identifier" &&
        object.property.name === "query"
      ) {
        queries.add(node.property.name);
      }
    },
    Property(node) {
      if (node.computed || node.shorthand) return;
      keys.add(node.key);
      if (node.key.type !== "Identifier" || node.key.name !== "with") return;
      const value = unwrapParens(node.value as Parameters<typeof unwrapParens>[0]);
      if (value.type !== "ObjectExpression") return;
      for (const entry of value.properties) {
        if (entry.type === "Property" && !entry.computed && entry.key.type === "Identifier") {
          withs.add(entry.key.name);
        }
      }
    },
  }).visit(program);
  for (const node of identifiers) {
    if (!keys.has(node) && node.type === "Identifier") names.add(node.name);
  }
  return { names: [...names], members, queries: [...queries], withs: [...withs] };
}
