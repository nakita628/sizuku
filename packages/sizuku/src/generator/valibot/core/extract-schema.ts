import type { CallExpression, ObjectLiteralExpression } from 'ts-morph'
import { Node, Project } from 'ts-morph'
import { extractFieldComments, isMetadataComment } from '../../../shared/utils/index.js'

/**
 * Parse the collected comment lines -> { valibotDefinition, description }
 */
const parseFieldComments = (
  commentLines: string[],
): { valibotDefinition: string; description: string | undefined } => {
  const cleaned = commentLines.map((l) => l.replace(/^\/\/\/\s*/, '').trim()).filter(Boolean)

  const valibotDefinition = cleaned.find((l) => l.startsWith('@v.'))?.replace(/^@/, '') ?? ''
  const descriptionLines = cleaned.filter((l) => !isMetadataComment(l))
  const description = descriptionLines.length ? descriptionLines.join(' ') : undefined

  return { valibotDefinition, description }
}

/**
 * Convert table name to Schema name (e.g. `user` -> `UserSchema`)
 */
const toSchemaName = (table: string): string =>
  `${table.charAt(0).toUpperCase() + table.slice(1)}Schema`

/**
 * Extract an ordinary column field.
 */
const extractFieldFromProperty = (
  property: Node,
  sourceText: string,
):
  | {
      name: string
      fields: {
        name: string
        definition: string
        description?: string
      }[]
    }['fields'][0]
  | null => {
  if (!Node.isPropertyAssignment(property)) return null
  const name = property.getName()
  if (!name) return null

  const commentLines = extractFieldComments(sourceText, property.getStart())
  const { valibotDefinition, description } = parseFieldComments(commentLines)

  return { name, definition: valibotDefinition, description }
}

/**
 * Extract a relation field (many / one) and infer Valibot schema.
 */
const extractRelationFieldFromProperty = (
  property: Node,
  sourceText: string,
):
  | {
      name: string
      fields: {
        name: string
        definition: string
        description?: string
      }[]
    }['fields'][0]
  | null => {
  if (!Node.isPropertyAssignment(property)) return null
  const name = property.getName()
  if (!name) return null

  const init = property.getInitializer()
  if (!Node.isCallExpression(init)) return { name, definition: '', description: undefined }

  const expr = init.getExpression()
  if (!Node.isIdentifier(expr)) return { name, definition: '', description: undefined }

  const fnName = expr.getText()
  const args = init.getArguments()
  if (!(args.length && Node.isIdentifier(args[0])))
    return { name, definition: '', description: undefined }

  const refTable = args[0].getText()
  const schemaName = toSchemaName(refTable)
  const definition =
    fnName === 'many' ? `v.array(${schemaName})` : fnName === 'one' ? schemaName : ''

  const commentLines = extractFieldComments(sourceText, property.getStart())
  const { description } = parseFieldComments(commentLines)

  return { name, definition, description }
}

/** Utility: unwrap arrow / paren / etc. until ObjectLiteralExpression or null */
const extractObjectLiteralFromExpression = (expr: Node): ObjectLiteralExpression | null => {
  if (Node.isObjectLiteralExpression(expr)) return expr
  if (Node.isParenthesizedExpression(expr))
    return extractObjectLiteralFromExpression(expr.getExpression())
  if (Node.isArrowFunction(expr)) {
    const body = expr.getBody()
    if (Node.isObjectLiteralExpression(body)) return body
    if (Node.isParenthesizedExpression(body))
      return extractObjectLiteralFromExpression(body.getExpression())
    if (Node.isBlock(body)) {
      const ret = body.getStatements().find(Node.isReturnStatement)
      if (ret && Node.isReturnStatement(ret)) {
        const re = ret.getExpression()
        return re && Node.isObjectLiteralExpression(re) ? re : null
      }
    }
  }
  return null
}

/** find the first object literal among call expression arguments */
const findObjectLiteralInArgs = (call: CallExpression): ObjectLiteralExpression | null => {
  for (const arg of call.getArguments()) {
    const obj = extractObjectLiteralFromExpression(arg)
    if (obj) return obj
  }
  return null
}

/** recognise `relations()` / `somethingRelation*` helpers */
const isRelationFunction = (call: CallExpression): boolean => {
  const expr = call.getExpression()
  return (
    Node.isIdentifier(expr) &&
    (expr.getText() === 'relations' || expr.getText().includes('relation'))
  )
}

/** extract fields from mysqlTable / relations call expression */
const extractFieldsFromCallExpression = (
  call: CallExpression,
  sourceText: string,
): {
  name: string
  fields: {
    name: string
    definition: string
    description?: string
  }[]
}['fields'] => {
  const obj = findObjectLiteralInArgs(call)
  if (!obj) return []
  const relation = isRelationFunction(call)
  return obj
    .getProperties()
    .map((p) =>
      relation
        ? extractRelationFieldFromProperty(p, sourceText)
        : extractFieldFromProperty(p, sourceText),
    )
    .filter((f): f is NonNullable<typeof f> => f !== null)
}

/** extract a single schema from variable declaration */
const extractSchemaFromDeclaration = (
  decl: Node,
  sourceText: string,
): {
  name: string
  fields: {
    name: string
    definition: string
    description?: string
  }[]
} | null => {
  if (!Node.isVariableDeclaration(decl)) return null
  const name = decl.getName()
  if (!name) return null
  const init = decl.getInitializer()

  // Handle call expressions (mysqlTable, relations, etc.)
  if (Node.isCallExpression(init)) {
    // ⛔ Skip relation helper exports (userRelations / postRelations ...)
    if (isRelationFunction(init)) return null
    const fields = extractFieldsFromCallExpression(init, sourceText)
    return { name, fields }
  }

  // Direct object literal export
  if (Node.isObjectLiteralExpression(init)) {
    const fields = init
      .getProperties()
      .map((p) => extractFieldFromProperty(p, sourceText))
      .filter((f): f is NonNullable<typeof f> => f !== null)
    return { name, fields }
  }

  return { name, fields: [] }
}

/**
 * Public API: extract schemas from code lines
 */
export function extractSchemas(lines: string[]): {
  name: string
  fields: {
    name: string
    definition: string
    description?: string
  }[]
}[] {
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: { allowJs: true, skipLibCheck: true },
  })
  const file = project.createSourceFile('temp.ts', lines.join('\n'))
  const fullText = file.getFullText()

  return file
    .getVariableStatements()
    .filter((s) => s.hasExportKeyword())
    .flatMap((s) => s.getDeclarations())
    .map((d) => extractSchemaFromDeclaration(d, fullText))
    .filter((s): s is NonNullable<typeof s> => s !== null)
}
