import type { CallExpression, ObjectLiteralExpression } from 'ts-morph'
import { Node } from 'ts-morph'
import { findObjectLiteralExpression } from '../../../shared/helper/find-object-literal-expression.js'
import { isRelationFunctionCall } from '../../../shared/helper/is-relation-function.js'
import {
  extractFieldComments,
  parseFieldComments,
  schemaName,
} from '../../../shared/utils/index.js'

/**
 * Extract an ordinary column field.
 */
export const extractFieldFromProperty = (
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

  const { definition, description } = parseFieldComments(
    extractFieldComments(sourceText, property.getStart()),
    '@v.',
  )

  return { name, definition, description }
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
  const schema = schemaName(refTable)
  const definition = fnName === 'many' ? `v.array(${schema})` : fnName === 'one' ? schema : ''

  const commentLines = extractFieldComments(sourceText, property.getStart())
  const { description } = parseFieldComments(commentLines, '@v.')

  return { name, definition, description }
}

/** find the first object literal among call expression arguments */
const findObjectLiteralInArgs = (call: CallExpression): ObjectLiteralExpression | null => {
  for (const arg of call.getArguments()) {
    const obj = findObjectLiteralExpression(arg)
    if (obj) return obj
  }
  return null
}

/** extract fields from mysqlTable / relations call expression */
export const extractFieldsFromCallExpression = (
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
  const relation = isRelationFunctionCall(call)
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
export const extractSchemaFromDeclaration = (
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
    if (isRelationFunctionCall(init)) return null
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
