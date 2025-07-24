import type { CallExpression } from 'ts-morph'
import { Node } from 'ts-morph'
import { isRelationFunctionCall } from '../../shared/helper/is-relation-function.js'

/**
 * Creates a schema extractor from customizable strategies.
 *
 * @param extractFieldsFromCall - Function to extract fields from a call expression (e.g. mysqlTable(...)).
 * @param extractFieldFromProperty - Function to extract a single field from an object literal property.
 * @returns A function that extracts a schema from a variable declaration node.
 */
export function buildSchemaExtractor(
  extractFieldsFromCall: (
    call: CallExpression,
    sourceText: string,
  ) => {
    name: string
    definition: string
    description?: string
  }[],
  extractFieldFromProperty: (
    prop: Node,
    sourceText: string,
  ) => {
    name: string
    definition: string
    description?: string
  } | null,
): (
  declaration: Node,
  sourceText: string,
) => {
  name: string
  fields: {
    name: string
    definition: string
    description?: string
  }[]
} | null {
  return (declaration, sourceText) => {
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
