import type { CallExpression, ObjectLiteralExpression } from 'ts-morph'
import { Node, Project } from 'ts-morph'
import { extractFieldComments, parseFieldComments, schemaName } from '../utils/index.js'

/**
 * Supported validation library types.
 */
export type ValidationLibrary = 'zod' | 'valibot'

/**
 * Schema extraction result type containing table name and field definitions.
 */
export type SchemaExtractionResult = {
  /** The name of the table/schema */
  name: string
  /** Array of field definitions with name, validation definition, and description */
  fields: {
    /** Field name */
    name: string
    /** Validation definition (e.g., 'z.uuid()', 'v.pipe(v.string(), v.uuid())') */
    definition: string
    /** Optional field description from comments */
    description?: string
  }[]
}

/**
 * Field extraction result type containing field metadata.
 */
type FieldExtractionResult = {
  /** Field name */
  name: string
  /** Validation definition string */
  definition: string
  /** Optional field description */
  description?: string
}

/**
 * Generates relation definition based on function name and reference table.
 *
 * @param fnName - The relation function name ('many' or 'one')
 * @param refTable - The referenced table name
 * @param prefix - Schema prefix ('v' or 'z') for validation library
 * @returns The generated relation definition string
 */
function generateRelationDefinition(fnName: string, refTable: string, prefix: 'v' | 'z'): string {
  const schema = schemaName(refTable)
  return fnName === 'many' ? `${prefix}.array(${schema})` : fnName === 'one' ? schema : ''
}

/**
 * Processes arrow function body to find object literal expression.
 *
 * @param body - The arrow function body node
 * @returns The found object literal expression, or null if not found
 */
function processArrowFunctionBody(body: Node): ObjectLiteralExpression | null {
  if (Node.isObjectLiteralExpression(body)) return body

  if (Node.isParenthesizedExpression(body)) {
    return findObjectLiteralExpression(body.getExpression())
  }

  if (Node.isBlock(body)) {
    const ret = body.getStatements().find(Node.isReturnStatement)
    if (ret && Node.isReturnStatement(ret)) {
      const re = ret.getExpression()
      return re && Node.isObjectLiteralExpression(re) ? re : null
    }
  }

  return null
}

/**
 * Recursively extracts an `ObjectLiteralExpression` from a given AST node.
 *
 * @param expr - The root `Node` to search for object literals
 * @returns The found `ObjectLiteralExpression`, or `null` if not found
 */
function findObjectLiteralExpression(expr: Node): ObjectLiteralExpression | null {
  if (Node.isObjectLiteralExpression(expr)) return expr

  if (Node.isParenthesizedExpression(expr)) {
    return findObjectLiteralExpression(expr.getExpression())
  }

  if (Node.isArrowFunction(expr)) {
    return processArrowFunctionBody(expr.getBody())
  }

  return null
}

/**
 * Finds an object literal expression in call expression arguments.
 *
 * @param call - The call expression to search for object literals in its arguments
 * @param finder - Function to find object literal in a node
 * @returns The found object literal, or `null` if not found in any argument
 */
function findObjectLiteralInArgs(
  call: CallExpression,
  finder: (expr: Node) => ObjectLiteralExpression | null,
): ObjectLiteralExpression | null {
  for (const arg of call.getArguments()) {
    const obj = finder(arg)
    if (obj) return obj
  }
  return null
}

/**
 * Determines whether a given `CallExpression` is a relation-related function call.
 *
 * @param callExpr - The call expression node to check for relation functions
 * @returns `true` if the function is a relation function; otherwise, `false`
 */
function isRelationFunctionCall(callExpr: CallExpression): boolean {
  const expression = callExpr.getExpression()
  if (!Node.isIdentifier(expression)) return false

  const functionName = expression.getText()
  return functionName === 'relations' || functionName.includes('relation')
}

/**
 * Creates a field extractor function using a custom parseFieldComments implementation.
 *
 * @param parseFieldComments - A function that parses comment lines into { definition, description }
 * @returns A property node extractor function
 */
function createExtractFieldFromProperty(
  parseFieldComments: (commentLines: string[]) => { definition: string; description?: string },
) {
  return (property: Node, sourceText: string): FieldExtractionResult | null => {
    if (!Node.isPropertyAssignment(property)) return null

    const name = property.getName()
    if (!name) return null

    const commentLines = extractFieldComments(sourceText, property.getStart())
    const { definition, description } = parseFieldComments(commentLines)

    return { name, definition, description }
  }
}

/**
 * Creates a relation field extractor function.
 *
 * @param parseFieldComments - Function to parse field comments
 * @param prefix - Schema prefix ('v' or 'z') for validation library
 * @returns Function that extracts relation fields from property
 */
function createExtractRelationFieldFromProperty(
  parseFieldComments: (lines: string[]) => { definition: string; description?: string },
  prefix: 'v' | 'z',
) {
  return (property: Node, sourceText: string): FieldExtractionResult | null => {
    if (!Node.isPropertyAssignment(property)) return null

    const name = property.getName()
    if (!name) return null

    const init = property.getInitializer()
    if (!Node.isCallExpression(init)) {
      return { name, definition: '', description: undefined }
    }

    const expr = init.getExpression()
    if (!Node.isIdentifier(expr)) {
      return { name, definition: '', description: undefined }
    }

    const fnName = expr.getText()
    const args = init.getArguments()

    if (!(args.length && Node.isIdentifier(args[0]))) {
      return { name, definition: '', description: undefined }
    }

    const refTable = args[0].getText()
    const definition = generateRelationDefinition(fnName, refTable, prefix)

    const { description } = parseFieldComments(
      extractFieldComments(sourceText, property.getStart()),
    )

    return { name, definition, description }
  }
}

/**
 * Extracts fields from object literal properties using appropriate extractor.
 *
 * @param properties - Array of object literal properties
 * @param isRelation - Whether this is a relation function call
 * @param extractFieldFromProperty - Function to extract regular fields
 * @param extractRelationFieldFromProperty - Function to extract relation fields
 * @param sourceText - The source text for comment extraction
 * @returns Array of extracted field results
 */
function extractFieldsFromProperties(
  properties: Node[],
  isRelation: boolean,
  extractFieldFromProperty: (prop: Node, sourceText: string) => FieldExtractionResult | null,
  extractRelationFieldFromProperty: (
    prop: Node,
    sourceText: string,
  ) => FieldExtractionResult | null,
  sourceText: string,
): FieldExtractionResult[] {
  return properties
    .map((prop) =>
      isRelation
        ? extractRelationFieldFromProperty(prop, sourceText)
        : extractFieldFromProperty(prop, sourceText),
    )
    .filter((field): field is FieldExtractionResult => field !== null)
}

/**
 * Creates a field extractor for call expressions with customizable strategies.
 *
 * @param extractFieldFromProperty - Function to extract field from property
 * @param extractRelationFieldFromProperty - Function to extract relation field from property
 * @param findObjectLiteralExpression - Function to find object literal expression
 * @param findObjectLiteralInArgs - Function to find object literal in call arguments
 * @param isRelationFunctionCall - Function to check if call is relation function
 * @returns Function that extracts fields from call expression
 */
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
    const objectLiteral = findObjectLiteralInArgs(callExpr, findObjectLiteralExpression)
    if (!objectLiteral) return []

    const isRelation = isRelationFunctionCall(callExpr)
    const properties = objectLiteral.getProperties()

    return extractFieldsFromProperties(
      properties,
      isRelation,
      extractFieldFromProperty,
      extractRelationFieldFromProperty,
      sourceText,
    )
  }
}

/**
 * Creates a schema extractor from customizable strategies.
 *
 * @param extractFieldsFromCall - Function to extract fields from a call expression
 * @param extractFieldFromProperty - Function to extract a single field from an object literal property
 * @returns A function that extracts a schema from a variable declaration node
 */
function buildSchemaExtractor(
  extractFieldsFromCall: (call: CallExpression, sourceText: string) => FieldExtractionResult[],
  extractFieldFromProperty: (prop: Node, sourceText: string) => FieldExtractionResult | null,
) {
  return (declaration: Node, sourceText: string): SchemaExtractionResult | null => {
    if (!Node.isVariableDeclaration(declaration)) return null

    const name = declaration.getName()
    if (!name) return null

    const initializer = declaration.getInitializer()

    if (Node.isCallExpression(initializer)) {
      if (isRelationFunctionCall(initializer)) return null
      const fields = extractFieldsFromCall(initializer, sourceText)
      return { name, fields }
    }

    if (Node.isObjectLiteralExpression(initializer)) {
      const fields = initializer
        .getProperties()
        .map((prop) => extractFieldFromProperty(prop, sourceText))
        .filter((field): field is NonNullable<typeof field> => field !== null)
      return { name, fields }
    }

    return { name, fields: [] }
  }
}

/**
 * Extracts schemas from TypeScript source code using AST analysis.
 *
 * This function processes exported variable declarations to extract table schemas
 * with their field definitions and comments. It supports both Zod and Valibot schema extraction.
 *
 * @param lines - Array of source code lines to process
 * @param library - The validation library to extract schemas for ('zod' or 'valibot')
 * @returns Array of extracted schemas with field definitions
 *
 * @example
 * ```typescript
 * // For Zod schemas
 * const zodSchemas = extractSchemas(sourceLines, 'zod')
 *
 * // For Valibot schemas
 * const valibotSchemas = extractSchemas(sourceLines, 'valibot')
 * ```
 */
export function extractSchemas(
  lines: string[],
  library: ValidationLibrary,
): SchemaExtractionResult[] {
  const sourceCode = lines.join('\n')
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      allowJs: true,
      skipLibCheck: true,
    },
  })

  const sourceFile = project.createSourceFile('temp.ts', sourceCode)
  const sourceText = sourceFile.getFullText()

  const commentPrefix = library === 'zod' ? '@z.' : '@v.'
  const schemaPrefix = library === 'zod' ? 'z' : 'v'

  const extractField = createExtractFieldFromProperty((lines) =>
    parseFieldComments(lines, commentPrefix),
  )
  const extractRelationField = createExtractRelationFieldFromProperty(
    (lines) => parseFieldComments(lines, commentPrefix),
    schemaPrefix,
  )
  const extractFieldsFromCall = createExtractFieldsFromCallExpression(
    extractField,
    extractRelationField,
    findObjectLiteralExpression,
    findObjectLiteralInArgs,
    isRelationFunctionCall,
  )
  const extractSchema = buildSchemaExtractor(extractFieldsFromCall, extractField)

  return sourceFile
    .getVariableStatements()
    .filter((stmt) => stmt.hasExportKeyword())
    .flatMap((stmt) => stmt.getDeclarations())
    .map((decl) => extractSchema(decl, sourceText))
    .filter((schema): schema is NonNullable<typeof schema> => schema !== null)
}

/**
 * Extracts Zod schemas from TypeScript source code using AST analysis.
 *
 * This function processes exported variable declarations to extract table schemas
 * with their field definitions and comments. It automatically handles Zod schema extraction.
 *
 * @param lines - Array of source code lines to process
 * @returns Array of extracted schemas with field definitions
 *
 * @example
 * ```typescript
 * const schemas = extractZodSchemas(sourceLines)
 * // Returns: [{ name: 'user', fields: [{ name: 'id', definition: 'z.uuid()', description: 'Primary key' }] }]
 * ```
 */
export function extractZodSchemas(lines: string[]): SchemaExtractionResult[] {
  return extractSchemas(lines, 'zod')
}

/**
 * Extracts Valibot schemas from TypeScript source code using AST analysis.
 *
 * This function processes exported variable declarations to extract table schemas
 * with their field definitions and comments. It automatically handles Valibot schema extraction.
 *
 * @param lines - Array of source code lines to process
 * @returns Array of extracted schemas with field definitions
 *
 * @example
 * ```typescript
 * const schemas = extractValibotSchemas(sourceLines)
 * // Returns: [{ name: 'user', fields: [{ name: 'id', definition: 'v.pipe(v.string(), v.uuid())', description: 'Primary key' }] }]
 * ```
 */
export function extractValibotSchemas(lines: string[]): SchemaExtractionResult[] {
  return extractSchemas(lines, 'valibot')
}
