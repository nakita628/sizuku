import type { CallExpression, Node, ObjectLiteralExpression } from 'ts-morph'
import { Node as NodeUtil } from 'ts-morph'
import { findObjectLiteralExpression } from '../../../shared/helper/find-object-literal-expression.js'
import { isRelationFunctionCall } from '../../../shared/helper/is-relation-function.js'

/**
 * Find object literal in call expression arguments
 */
const findObjectLiteralInArgs = (callExpr: CallExpression): ObjectLiteralExpression | null => {
  for (const arg of callExpr.getArguments()) {
    const objectLiteral = findObjectLiteralExpression(arg)
    if (objectLiteral) return objectLiteral
  }
  return null
}

/**
 * Create field extractor for call expressions (e.g. mysqlTable)
 */
export const createExtractFieldsFromCallExpression = (
  extractFieldFromProperty: (
    property: Node,
    sourceText: string,
  ) => {
    name: string
    definition: string
    description?: string
  } | null,
  extractRelationFieldFromProperty: (
    property: Node,
    sourceText: string,
  ) => {
    name: string
    definition: string
    description?: string
  } | null,
) => {
  return (
    callExpr: CallExpression,
    sourceText: string,
  ): {
    name: string
    definition: string
    description?: string
  }[] => {
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
}

/**
 * Create schema extractor for declaration node
 */
export const createExtractSchemaFromDeclaration = (
  extractFieldsFromCallExpression: (
    callExpr: CallExpression,
    sourceText: string,
  ) => {
    name: string
    definition: string
    description?: string
  }[],
  extractFieldFromProperty: (
    property: Node,
    sourceText: string,
  ) => {
    name: string
    definition: string
    description?: string
  } | null,
) => {
  return (
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
    if (!NodeUtil.isVariableDeclaration(declaration)) return null

    const name = declaration.getName()
    if (!name) return null

    const initializer = declaration.getInitializer()

    if (NodeUtil.isCallExpression(initializer)) {
      if (isRelationFunctionCall(initializer)) return null

      const fields = extractFieldsFromCallExpression(initializer, sourceText)
      return { name, fields }
    }

    if (NodeUtil.isObjectLiteralExpression(initializer)) {
      const fields = initializer
        .getProperties()
        .map((prop) => extractFieldFromProperty(prop, sourceText))
        .filter((field): field is NonNullable<typeof field> => field !== null)

      return { name, fields }
    }

    return { name, fields: [] }
  }
}
