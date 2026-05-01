import type { CallExpression, ObjectLiteralExpression } from "ts-morph";
import { Node, Project } from "ts-morph";
import {
  containsSubstring,
  extractFieldComments,
  makeCapitalized,
  parseFieldComments,
  removeOptionalSuffix,
  splitByDot,
  splitByTo,
  splitByWhitespace,
  startsWith,
  trimString,
  type ValidationTag,
} from "../utils/index.js";

export type ValidationLibrary = "zod" | "valibot" | "arktype" | "effect";

export type SchemaExtractionResult = {
  name: string;
  baseName?: string;
  fields: {
    name: string;
    definition: string;
    description?: string;
  }[];
  objectType?: "strict" | "loose";
};

export type RelationSchemaExtractionResult = {
  name: string;
  baseName: string;
  fields: {
    name: string;
    definition: string;
    description?: string;
  }[];
  objectType?: "strict" | "loose";
};

type FieldExtractionResult = {
  name: string;
  definition: string;
  description?: string;
};

type SchemaPrefix = "z" | "v" | "type" | "Schema";

function generateRelationDefinition(fnName: string, refTable: string, prefix: SchemaPrefix) {
  const schema = `${makeCapitalized(refTable)}Schema`;
  if (fnName === "many") {
    if (prefix === "type") {
      return `${schema}.array()`;
    }
    if (prefix === "Schema") {
      return `Schema.Array(${schema})`;
    }
    return `${prefix}.array(${schema})`;
  }
  if (fnName === "one") {
    return schema;
  }
  return "";
}

function processArrowFunctionBody(body: Node) {
  if (Node.isObjectLiteralExpression(body)) return body;

  if (Node.isParenthesizedExpression(body)) {
    return findObjectLiteralExpression(body.getExpression());
  }

  if (Node.isBlock(body)) {
    const ret = body.getStatements().find(Node.isReturnStatement);
    if (ret && Node.isReturnStatement(ret)) {
      const re = ret.getExpression();
      return re && Node.isObjectLiteralExpression(re) ? re : null;
    }
  }

  return null;
}

function findObjectLiteralExpression(expr: Node): ObjectLiteralExpression | null {
  if (Node.isObjectLiteralExpression(expr)) return expr;

  if (Node.isParenthesizedExpression(expr)) {
    return findObjectLiteralExpression(expr.getExpression());
  }

  if (Node.isArrowFunction(expr)) {
    return processArrowFunctionBody(expr.getBody());
  }

  return null;
}

function findObjectLiteralInArgs(
  call: CallExpression,
  finder: (expr: Node) => ObjectLiteralExpression | null,
) {
  for (const arg of call.getArguments()) {
    const obj = finder(arg);
    if (obj) return obj;
  }
  return null;
}

function isRelationFunctionCall(callExpr: CallExpression) {
  const expression = callExpr.getExpression();
  if (!Node.isIdentifier(expression)) return false;

  const functionName = expression.getText();
  return functionName === "relations" || functionName.includes("relation");
}

function createExtractFieldFromProperty(
  parseFieldComments: (commentLines: readonly string[]) => {
    readonly definition: string;
    readonly description?: string;
    readonly objectType?: "strict" | "loose";
  },
) {
  return (property: Node, sourceText: string): FieldExtractionResult | null => {
    if (!Node.isPropertyAssignment(property)) return null;

    const name = property.getName();
    if (!name) return null;

    const commentLines = extractFieldComments(sourceText, property.getStart());
    const { definition, description } = parseFieldComments(commentLines);

    return { name, definition, description };
  };
}

function createExtractRelationFieldFromProperty(
  parseFieldComments: (lines: readonly string[]) => {
    readonly definition: string;
    readonly description?: string;
    readonly objectType?: "strict" | "loose";
  },
  prefix: SchemaPrefix,
) {
  return (property: Node, sourceText: string): FieldExtractionResult | null => {
    if (!Node.isPropertyAssignment(property)) return null;

    const name = property.getName();
    if (!name) return null;

    const init = property.getInitializer();
    if (!Node.isCallExpression(init)) {
      return { name, definition: "", description: undefined };
    }

    const expr = init.getExpression();
    if (!Node.isIdentifier(expr)) {
      return { name, definition: "", description: undefined };
    }

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
    );

    return { name, definition, description };
  };
}

function extractFieldsFromProperties(
  properties: Node[],
  isRelation: boolean,
  extractFieldFromProperty: (prop: Node, sourceText: string) => FieldExtractionResult | null,
  extractRelationFieldFromProperty: (
    prop: Node,
    sourceText: string,
  ) => FieldExtractionResult | null,
  sourceText: string,
) {
  return properties
    .map((prop) =>
      isRelation
        ? extractRelationFieldFromProperty(prop, sourceText)
        : extractFieldFromProperty(prop, sourceText),
    )
    .filter((field): field is FieldExtractionResult => field !== null);
}

function createExtractFieldsFromCallExpression(
  extractFieldFromProperty: (prop: Node, sourceText: string) => FieldExtractionResult | null,
  extractRelationFieldFromProperty: (
    prop: Node,
    sourceText: string,
  ) => FieldExtractionResult | null,
  findObjectLiteralExpression: (expr: Node) => ObjectLiteralExpression | null,
  findObjectLiteralInArgs: (
    call: CallExpression,
    finder: (expr: Node) => ObjectLiteralExpression | null,
  ) => ObjectLiteralExpression | null,
  isRelationFunctionCall: (call: CallExpression) => boolean,
) {
  return (callExpr: CallExpression, sourceText: string): FieldExtractionResult[] => {
    const objectLiteral = findObjectLiteralInArgs(callExpr, findObjectLiteralExpression);
    if (!objectLiteral) return [];

    const isRelation = isRelationFunctionCall(callExpr);
    const properties = objectLiteral.getProperties();

    return extractFieldsFromProperties(
      properties,
      isRelation,
      extractFieldFromProperty,
      extractRelationFieldFromProperty,
      sourceText,
    );
  };
}

function makeSchemaExtractor(
  extractFieldsFromCall: (call: CallExpression, sourceText: string) => FieldExtractionResult[],
  extractFieldFromProperty: (prop: Node, sourceText: string) => FieldExtractionResult | null,
  parseFieldComments: (
    commentLines: readonly string[],
    tag: ValidationTag,
  ) => {
    readonly definition: string;
    readonly description?: string;
    readonly objectType?: "strict" | "loose";
  },
  commentPrefix: ValidationTag,
) {
  return (
    variableStatement: Node,
    sourceText: string,
    originalSourceCode: string,
  ): SchemaExtractionResult | null => {
    if (!Node.isVariableStatement(variableStatement)) return null;

    const declarations = variableStatement.getDeclarations();
    if (declarations.length === 0) return null;

    const declaration = declarations[0];
    const name = declaration.getName();
    if (!name) return null;

    // ts-morph doesn't capture all comments properly; parse the original source
    const statementStart = variableStatement.getStart();
    const originalSourceLines = originalSourceCode.split("\n");

    const lineNumber = originalSourceLines.reduce(
      (state, line, i) =>
        state.found
          ? state
          : state.acc >= statementStart
            ? { acc: state.acc, index: i, found: true }
            : { acc: state.acc + line.length + 1, index: 0, found: false },
      { acc: 0, index: 0, found: false },
    ).index;

    const commentLines: string[] = [];
    for (let i = lineNumber - 1; i >= 0; i--) {
      const line = originalSourceLines[i];
      const trimmedLine = trimString(line);
      if (trimmedLine === "") continue;
      if (startsWith(trimmedLine, "///")) {
        commentLines.unshift(line);
      } else {
        break;
      }
    }

    const { objectType } = parseFieldComments(commentLines, commentPrefix);

    const initializer = declaration.getInitializer();

    if (Node.isCallExpression(initializer)) {
      if (isRelationFunctionCall(initializer)) return null;
      const fields = extractFieldsFromCall(initializer, sourceText);
      return { name, fields, objectType };
    }

    if (Node.isObjectLiteralExpression(initializer)) {
      const fields = initializer
        .getProperties()
        .map((prop) => extractFieldFromProperty(prop, sourceText))
        .filter((field): field is NonNullable<typeof field> => field !== null);
      return { name, fields, objectType };
    }

    return { name, fields: [], objectType };
  };
}

export function extractSchemas(lines: string[], library: ValidationLibrary) {
  const sourceCode = lines.join("\n");

  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      allowJs: true,
      skipLibCheck: true,
    },
  });

  const sourceFile = project.createSourceFile("temp.ts", sourceCode);
  const sourceText = sourceFile.getFullText();

  const commentPrefixMap: Record<string, ValidationTag> = {
    zod: "@z.",
    valibot: "@v.",
    arktype: "@a.",
    effect: "@e.",
  };
  const schemaPrefixMap: Record<string, SchemaPrefix> = {
    zod: "z",
    valibot: "v",
    arktype: "type",
    effect: "Schema",
  };
  const commentPrefix = commentPrefixMap[library];
  const schemaPrefix = schemaPrefixMap[library];

  const extractField = createExtractFieldFromProperty((lines) =>
    parseFieldComments(lines, commentPrefix),
  );
  const extractRelationField = createExtractRelationFieldFromProperty(
    (lines) => parseFieldComments(lines, commentPrefix),
    schemaPrefix,
  );
  const extractFieldsFromCall = createExtractFieldsFromCallExpression(
    extractField,
    extractRelationField,
    findObjectLiteralExpression,
    findObjectLiteralInArgs,
    isRelationFunctionCall,
  );
  const extractSchema = makeSchemaExtractor(
    extractFieldsFromCall,
    extractField,
    parseFieldComments,
    commentPrefix,
  );

  return sourceFile
    .getVariableStatements()
    .filter((stmt) => stmt.hasExportKeyword())
    .map((stmt) => extractSchema(stmt, sourceText, sourceCode))
    .filter((schema): schema is NonNullable<typeof schema> => schema !== null);
}

export function extractZodSchemas(lines: string[]) {
  return extractSchemas(lines, "zod");
}

export function extractValibotSchemas(lines: string[]) {
  return extractSchemas(lines, "valibot");
}

export function extractArktypeSchemas(lines: string[]) {
  return extractSchemas(lines, "arktype");
}

export function extractEffectSchemas(lines: string[]) {
  return extractSchemas(lines, "effect");
}

export function extractRelationSchemas(lines: string[], library: ValidationLibrary) {
  const sourceCode = lines.join("\n");
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: { allowJs: true, skipLibCheck: true },
  });

  const sourceFile = project.createSourceFile("temp.ts", sourceCode);
  const sourceText = sourceFile.getFullText();

  const commentPrefixMap: Record<string, ValidationTag> = {
    zod: "@z.",
    valibot: "@v.",
    arktype: "@a.",
    effect: "@e.",
  };
  const schemaPrefixMap: Record<string, SchemaPrefix> = {
    zod: "z",
    valibot: "v",
    arktype: "type",
    effect: "Schema",
  };
  const commentPrefix = commentPrefixMap[library];
  const schemaPrefix = schemaPrefixMap[library];

  // First, extract base schemas to get their objectType
  const baseSchemas = extractSchemas(lines, library);
  const baseSchemaMap = new Map(baseSchemas.map((schema) => [schema.name, schema.objectType]));

  const extractField = createExtractFieldFromProperty((lines) =>
    parseFieldComments(lines, commentPrefix),
  );
  const extractRelationField = createExtractRelationFieldFromProperty(
    (lines) => parseFieldComments(lines, commentPrefix),
    schemaPrefix,
  );
  const extractFieldsFromCall = createExtractFieldsFromCallExpression(
    extractField,
    extractRelationField,
    findObjectLiteralExpression,
    findObjectLiteralInArgs,
    isRelationFunctionCall,
  );

  function extract(declaration: Node) {
    if (!Node.isVariableDeclaration(declaration)) return null;
    const name = declaration.getName();
    if (!name) return null;
    const initializer = declaration.getInitializer();
    if (!Node.isCallExpression(initializer)) return null;
    if (!isRelationFunctionCall(initializer)) return null;
    const relArgs = initializer.getArguments();
    // relArgs[0] is the base table identifier (e.g. `user` in `relations(user, ...)`)
    const baseIdentifier = relArgs.length && Node.isIdentifier(relArgs[0]) ? relArgs[0] : undefined;
    if (!baseIdentifier) return null;
    const baseName = baseIdentifier.getText();
    const fields = extractFieldsFromCall(initializer, sourceText);

    // Inherit objectType from the base schema
    const objectType = baseSchemaMap.get(baseName);

    return { name, baseName, fields, objectType };
  }

  return sourceFile
    .getVariableStatements()
    .filter((stmt) => stmt.hasExportKeyword())
    .flatMap((stmt) => stmt.getDeclarations())
    .map((decl) => extract(decl))
    .filter((schema): schema is NonNullable<typeof schema> => schema !== null);
}

export function extractRelations(code: string[]) {
  return code.map(parseRelationLine).filter((r): r is NonNullable<typeof r> => r !== null);
}

export function parseRelationLine(line: string) {
  const trimmedLine = trimString(line);
  // Remove "///" prefix (3 chars) if present
  const cleanLine = startsWith(trimmedLine, "///") ? trimmedLine.substring(3) : trimmedLine;
  const finalLine = trimString(cleanLine);

  if (!startsWith(finalLine, "@relation")) return null;

  const parts = splitByWhitespace(finalLine);
  // Format: "@relation <from.field> <to.field> <type>" → 4 parts minimum
  if (parts.length < 4) return null;

  // parts[1] = "User.id", parts[2] = "Post.userId" → split by "." into [model, field]
  const fromParts = splitByDot(parts[1]);
  const toParts = splitByDot(parts[2]);

  if (fromParts.length !== 2 || toParts.length !== 2) return null;

  return {
    fromModel: fromParts[0],
    fromField: fromParts[1],
    toModel: toParts[0],
    toField: toParts[1],
    type: parts[3], // e.g. "one-to-many"
  };
}

const RELATIONSHIP_SYMBOLS: Readonly<Record<string, string>> = {
  "zero-one": "|o",
  one: "||",
  "zero-many": "}o",
  many: "}|",
};

export function toRelationSymbol(r: string) {
  return RELATIONSHIP_SYMBOLS[r] ?? null;
}

export function makeRelationLine(input: string) {
  const parts = splitByTo(input);
  if (!parts) return { ok: false, error: `Invalid input format: ${input}` } as const;

  const [fromRaw, toRawWithOptional] = parts;
  const [toRaw, isOptional] = containsSubstring(toRawWithOptional, "-optional")
    ? [removeOptionalSuffix(toRawWithOptional), true]
    : [toRawWithOptional, false];

  const fromSymbol = toRelationSymbol(fromRaw);
  const toSymbolStr = toRelationSymbol(toRaw);

  if (!fromSymbol || !toSymbolStr) {
    return { ok: false, error: `Invalid relationship string: ${input}` } as const;
  }

  const connector = isOptional ? ".." : "--";
  return { ok: true, value: `${fromSymbol}${connector}${toSymbolStr}` } as const;
}
