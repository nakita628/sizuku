import type { CallExpression, ObjectLiteralExpression } from "ts-morph";
import { Node, Project } from "ts-morph";
import { extractFieldComments, makeCapitalized, parseFieldComments } from "../utils/index.js";

function makeSourceFile(sourceCode: string) {
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: { allowJs: true, skipLibCheck: true },
  });
  return project.createSourceFile("temp.ts", sourceCode);
}

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

function findObjectLiteralExpression(expr: Node): ObjectLiteralExpression | null {
  if (Node.isObjectLiteralExpression(expr)) return expr;
  if (Node.isParenthesizedExpression(expr)) {
    return findObjectLiteralExpression(expr.getExpression());
  }
  if (Node.isArrowFunction(expr)) {
    const body = expr.getBody();
    if (Node.isObjectLiteralExpression(body)) return body;
    if (Node.isParenthesizedExpression(body)) {
      return findObjectLiteralExpression(body.getExpression());
    }
    if (Node.isBlock(body)) {
      const ret = body.getStatements().find(Node.isReturnStatement);
      const re = ret?.getExpression();
      return re && Node.isObjectLiteralExpression(re) ? re : null;
    }
  }
  return null;
}

function findObjectLiteralInArgs(call: CallExpression) {
  for (const arg of call.getArguments()) {
    const obj = findObjectLiteralExpression(arg);
    if (obj) return obj;
  }
  return null;
}

function isRelationFunctionCall(callExpr: CallExpression) {
  const expression = callExpr.getExpression();
  if (!Node.isIdentifier(expression)) return false;
  const fnName = expression.getText();
  return fnName === "relations" || fnName.includes("relation");
}

function extractFieldFromProperty(
  property: Node,
  sourceText: string,
  tag: "@z." | "@v." | "@a." | "@e.",
) {
  if (!Node.isPropertyAssignment(property)) return null;
  const name = property.getName();
  if (!name) return null;
  const { definition, description } = parseFieldComments(
    extractFieldComments(sourceText, property.getStart()),
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
  if (!Node.isPropertyAssignment(property)) return null;
  const name = property.getName();
  if (!name) return null;

  const init = property.getInitializer();
  if (!Node.isCallExpression(init)) return { name, definition: "", description: undefined };

  const expr = init.getExpression();
  if (!Node.isIdentifier(expr)) return { name, definition: "", description: undefined };

  const fnName = expr.getText();
  const args = init.getArguments();
  // args[0] is the referenced table identifier (e.g. `user` in `one(user, {...})`)
  if (!(args.length && Node.isIdentifier(args[0]))) {
    return { name, definition: "", description: undefined };
  }

  const refTable = args[0].getText();
  const definition = generateRelationDefinition(fnName, refTable, prefix);
  const { description } = parseFieldComments(
    extractFieldComments(sourceText, property.getStart()),
    tag,
  );
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
  return objectLiteral
    .getProperties()
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
  variableStatement: Node,
  sourceText: string,
  sourceCode: string,
  tag: "@z." | "@v." | "@a." | "@e.",
  prefix: "z" | "v" | "type" | "Schema",
) {
  if (!Node.isVariableStatement(variableStatement)) return null;
  const declaration = variableStatement.getDeclarations()[0];
  if (!declaration) return null;
  const name = declaration.getName();
  if (!name) return null;

  // ts-morph doesn't capture all comments properly; parse the original source
  const commentLines = findLeadingComments(sourceCode, variableStatement.getStart());
  const { objectType } = parseFieldComments(commentLines, tag);

  const initializer = declaration.getInitializer();

  if (Node.isCallExpression(initializer)) {
    if (isRelationFunctionCall(initializer)) return null;
    return {
      name,
      fields: extractFieldsFromCall(initializer, sourceText, tag, prefix),
      objectType,
    };
  }

  if (Node.isObjectLiteralExpression(initializer)) {
    const fields = initializer
      .getProperties()
      .map((prop) => extractFieldFromProperty(prop, sourceText, tag))
      .filter((f): f is NonNullable<typeof f> => f !== null);
    return { name, fields, objectType };
  }

  return { name, fields: [], objectType };
}

export function extractSchemas(lines: string[], library: "zod" | "valibot" | "arktype" | "effect") {
  const sourceCode = lines.join("\n");
  const sourceFile = makeSourceFile(sourceCode);
  const sourceText = sourceFile.getFullText();
  const tag = ({ zod: "@z.", valibot: "@v.", arktype: "@a.", effect: "@e." } as const)[library];
  const prefix = ({ zod: "z", valibot: "v", arktype: "type", effect: "Schema" } as const)[library];

  return sourceFile
    .getVariableStatements()
    .filter((stmt) => stmt.hasExportKeyword())
    .map((stmt) => extractSchema(stmt, sourceText, sourceCode, tag, prefix))
    .filter((schema): schema is NonNullable<typeof schema> => schema !== null);
}

export function extractRelationSchemas(
  lines: string[],
  library: "zod" | "valibot" | "arktype" | "effect",
) {
  const sourceCode = lines.join("\n");
  const sourceFile = makeSourceFile(sourceCode);
  const sourceText = sourceFile.getFullText();
  const tag = ({ zod: "@z.", valibot: "@v.", arktype: "@a.", effect: "@e." } as const)[library];
  const prefix = ({ zod: "z", valibot: "v", arktype: "type", effect: "Schema" } as const)[library];

  // Inherit objectType from the base schema
  const baseSchemaMap = new Map(
    extractSchemas(lines, library).map((schema) => [schema.name, schema.objectType]),
  );

  return sourceFile
    .getVariableStatements()
    .filter((stmt) => stmt.hasExportKeyword())
    .flatMap((stmt) => stmt.getDeclarations())
    .map((declaration) => {
      if (!Node.isVariableDeclaration(declaration)) return null;
      const name = declaration.getName();
      if (!name) return null;
      const initializer = declaration.getInitializer();
      if (!Node.isCallExpression(initializer)) return null;
      if (!isRelationFunctionCall(initializer)) return null;
      // relArgs[0] is the base table identifier (e.g. `user` in `relations(user, ...)`)
      const baseIdentifier = initializer.getArguments()[0];
      if (!baseIdentifier || !Node.isIdentifier(baseIdentifier)) return null;
      const baseName = baseIdentifier.getText();
      const fields = extractFieldsFromCall(initializer, sourceText, tag, prefix);
      const objectType = baseSchemaMap.get(baseName);
      return { name, baseName, fields, objectType };
    })
    .filter((schema) => schema !== null);
}
