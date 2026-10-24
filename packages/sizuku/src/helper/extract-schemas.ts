import type { CallExpression, Node, Program, VariableDeclarator } from "oxc-parser";
import { extractFieldComments, makeCapitalized, parseFieldComments } from "../utils/index.js";
import {
  arrowObject,
  declaratorName,
  exportedDeclarations,
  isArrow,
  isCall,
  isObject,
  parseSource,
  textOf,
  unwrapParens,
} from "./ast.js";

function generateRelationDefinition(
  fnName: string,
  refTable: string,
  prefix: "z" | "v" | "type" | "Schema",
) {
  const schema = `${makeCapitalized(refTable)}Schema`;
  if (fnName === "many") {
    if (prefix === "type") return `${schema}.array()`;
    if (prefix === "Schema") return `Schema.Array(${schema})`;
    return `${prefix}.array(${schema})`;
  }
  if (fnName === "one") return schema;
  return "";
}

function findObjectLiteralInArgs(call: CallExpression) {
  for (const arg of call.arguments) {
    if (arg.type === "SpreadElement") continue;
    const expr = unwrapParens(arg);
    if (isObject(expr)) return expr;
    if (isArrow(expr)) {
      const obj = arrowObject(expr);
      if (obj) return obj;
    }
  }
  return null;
}

function isRelationFunctionCall(callExpr: CallExpression) {
  const expression = callExpr.callee;
  if (expression.type !== "Identifier") return false;
  const fnName = expression.name;
  return fnName === "relations" || fnName.includes("relation");
}

// A property's name as written: `id`, or `'id'` with its quotes, as ts-morph's
// `getName()` gave it. Shorthands, methods, accessors and spreads have none.
function propertyName(property: Node, text: string) {
  if (property.type !== "Property" || property.kind !== "init") return null;
  if (property.shorthand || property.method || property.computed) return null;
  return textOf(text, property.key) || null;
}

function extractFieldFromProperty(
  property: Node,
  sourceText: string,
  tag: "@z." | "@v." | "@a." | "@e.",
) {
  const name = propertyName(property, sourceText);
  if (!name) return null;
  const { definition, description } = parseFieldComments(
    extractFieldComments(sourceText, property.start),
    tag,
  );
  return { name, definition, description };
}

function extractRelationFieldFromProperty(
  property: Node,
  sourceText: string,
  tag: "@z." | "@v." | "@a." | "@e.",
  prefix: "z" | "v" | "type" | "Schema",
) {
  const name = propertyName(property, sourceText);
  if (!name || property.type !== "Property") return null;

  const init = property.value;
  if (!isCall(init)) return { name, definition: "", description: undefined };

  const expr = init.callee;
  if (expr.type !== "Identifier") return { name, definition: "", description: undefined };

  const fnName = expr.name;
  const args = init.arguments;
  // args[0] is the referenced table identifier (e.g. `user` in `one(user, {...})`)
  if (!(args.length && args[0].type === "Identifier")) {
    return { name, definition: "", description: undefined };
  }

  const refTable = args[0].name;
  const definition = generateRelationDefinition(fnName, refTable, prefix);
  const { description } = parseFieldComments(extractFieldComments(sourceText, property.start), tag);
  return { name, definition, description };
}

function extractFieldsFromCall(
  call: CallExpression,
  sourceText: string,
  tag: "@z." | "@v." | "@a." | "@e.",
  prefix: "z" | "v" | "type" | "Schema",
) {
  const objectLiteral = findObjectLiteralInArgs(call);
  if (!objectLiteral) return [];
  const isRelation = isRelationFunctionCall(call);
  return objectLiteral.properties
    .map((prop) =>
      isRelation
        ? extractRelationFieldFromProperty(prop, sourceText, tag, prefix)
        : extractFieldFromProperty(prop, sourceText, tag),
    )
    .filter((f): f is NonNullable<typeof f> => f !== null);
}

function findLeadingComments(sourceCode: string, statementStart: number) {
  const lines = sourceCode.split("\n");
  const lineNumber = sourceCode.slice(0, statementStart).split("\n").length - 1;
  const reversed = lines.slice(0, lineNumber).reverse();
  // Stop at the first non-empty line that isn't a `///` comment.
  const stopIdx = reversed.findIndex((l) => l.trim() !== "" && !l.trim().startsWith("///"));
  const candidates = stopIdx === -1 ? reversed : reversed.slice(0, stopIdx);
  return candidates.filter((l) => l.trim().startsWith("///")).reverse();
}

function extractSchema(
  declaration: VariableDeclarator,
  statementStart: number,
  sourceText: string,
  tag: "@z." | "@v." | "@a." | "@e.",
  prefix: "z" | "v" | "type" | "Schema",
) {
  const name = declaratorName(declaration);
  if (!name) return null;

  const commentLines = findLeadingComments(sourceText, statementStart);
  const { objectType } = parseFieldComments(commentLines, tag);

  const initializer = declaration.init;

  if (isCall(initializer)) {
    if (isRelationFunctionCall(initializer)) return null;
    return {
      name,
      fields: extractFieldsFromCall(initializer, sourceText, tag, prefix),
      objectType,
    };
  }

  if (isObject(initializer)) {
    const fields = initializer.properties
      .map((prop) => extractFieldFromProperty(prop, sourceText, tag))
      .filter((f): f is NonNullable<typeof f> => f !== null);
    return { name, fields, objectType };
  }

  return { name, fields: [], objectType };
}

// Only the first declarator of each `export const` statement is a schema.
function firstDeclarators(program: Program) {
  const seen = new Set<number>();
  return exportedDeclarations(program).filter(({ start }) => {
    if (seen.has(start)) return false;
    seen.add(start);
    return true;
  });
}

export function extractSchemas(lines: string[], library: "zod" | "valibot" | "arktype" | "effect") {
  const { program, text } = parseSource(lines);
  const tag = ({ zod: "@z.", valibot: "@v.", arktype: "@a.", effect: "@e." } as const)[library];
  const prefix = ({ zod: "z", valibot: "v", arktype: "type", effect: "Schema" } as const)[library];

  return firstDeclarators(program)
    .map(({ declarator, start }) => extractSchema(declarator, start, text, tag, prefix))
    .filter((schema): schema is NonNullable<typeof schema> => schema !== null);
}

export function extractRelationSchemas(
  lines: string[],
  library: "zod" | "valibot" | "arktype" | "effect",
) {
  const { program, text } = parseSource(lines);
  const tag = ({ zod: "@z.", valibot: "@v.", arktype: "@a.", effect: "@e." } as const)[library];
  const prefix = ({ zod: "z", valibot: "v", arktype: "type", effect: "Schema" } as const)[library];

  // Inherit objectType from the base schema
  const baseSchemaMap = new Map(
    extractSchemas(lines, library).map((schema) => [schema.name, schema.objectType]),
  );

  return exportedDeclarations(program)
    .map(({ declarator }) => {
      const name = declaratorName(declarator);
      if (!name) return null;
      const initializer = declarator.init;
      if (!isCall(initializer)) return null;
      if (!isRelationFunctionCall(initializer)) return null;
      // relArgs[0] is the base table identifier (e.g. `user` in `relations(user, ...)`)
      const baseIdentifier = initializer.arguments[0];
      if (baseIdentifier?.type !== "Identifier") return null;
      const baseName = baseIdentifier.name;
      const fields = extractFieldsFromCall(initializer, text, tag, prefix);
      const objectType = baseSchemaMap.get(baseName);
      return { name, baseName, fields, objectType };
    })
    .filter((schema) => schema !== null);
}

/**
 * The columns of the schema that carry no annotation in the library's tag, as `table.column`:
 * the ones a validator schema has nothing to write for.
 */
export function unannotatedColumns(
  lines: string[],
  library: "zod" | "valibot" | "arktype" | "effect",
) {
  return extractSchemas(lines, library).flatMap((schema) =>
    schema.fields
      .filter((field) => field.definition.trim() === "")
      .map((field) => `${schema.name}.${field.name}`),
  );
}
