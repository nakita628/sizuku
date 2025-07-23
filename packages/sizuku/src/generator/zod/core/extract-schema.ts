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
 * Extract field information from object property
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

  const fieldName = property.getName()
  if (!fieldName) return null

  const fieldStartPos = property.getStart()
  const { definition, description } = parseFieldComments(
    extractFieldComments(sourceText, fieldStartPos),
    '@z.',
  )

  return {
    name: fieldName,
    definition,
    description,
  }
}

/**
 * Extract relation field with type inference
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
  if (!Node.isCallExpression(init)) {
    return {
      name,
      definition: '',
      description: undefined,
    }
  }

  const expr = init.getExpression()
  if (!Node.isIdentifier(expr)) {
    return {
      name,
      definition: '',
      description: undefined,
    }
  }

  const fnName = expr.getText()
  const args = init.getArguments()

  if (args.length === 0) {
    return {
      name,
      definition: '',
      description: undefined,
    }
  }

  const firstArg = args[0]
  if (!Node.isIdentifier(firstArg)) {
    return {
      name,
      definition: '',
      description: undefined,
    }
  }

  const referencedTable = firstArg.getText()
  const schema = schemaName(referencedTable)

  const definition = fnName === 'many' ? `z.array(${schema})` : fnName === 'one' ? schema : ''

  const fieldStartPos = property.getStart()
  const commentLines = extractFieldComments(sourceText, fieldStartPos)
  const { description } = parseFieldComments(commentLines, '@z.')

  return { name, definition, description }
}

/**
 * Find object literal in call expression arguments
 */
const findObjectLiteralInArgs = (callExpr: CallExpression): ObjectLiteralExpression | null => {
  const args = callExpr.getArguments()
  for (const arg of args) {
    const objectLiteral = findObjectLiteralExpression(arg)
    if (objectLiteral) {
      return objectLiteral
    }
  }
  return null
}

/**
 * Extract fields from any call expression
 */
export const extractFieldsFromCallExpression = (
  callExpr: CallExpression,
  sourceText: string,
): {
  name: string
  fields: {
    name: string
    definition: string
    description?: string
  }[]
}['fields'] => {
  const objectLiteral = findObjectLiteralInArgs(callExpr)
  if (!objectLiteral) return []

  const isRelation = isRelationFunctionCall(callExpr)

  return objectLiteral
    .getProperties()
    .map((prop) =>
      isRelation
        ? extractRelationFieldFromProperty(prop, sourceText)
        : extractFieldFromProperty(prop, sourceText),
    )
    .filter((field): field is NonNullable<typeof field> => field !== null)
}

/**
 * Extract a single schema (variable declaration)
 */
export const extractSchemaFromDeclaration = (
  declaration: Node,
  sourceText: string,
): {
  name: string
  fields: {
    name: string
    definition: string
    description?: string
  }[]
} | null => {
  if (!Node.isVariableDeclaration(declaration)) return null

  const name = declaration.getName()
  if (!name) return null

  const initializer = declaration.getInitializer()

  if (Node.isCallExpression(initializer)) {
    if (isRelationFunctionCall(initializer)) return null

    const fields = extractFieldsFromCallExpression(initializer, sourceText)
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
