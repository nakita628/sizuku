import type { CallExpression, Node, ObjectLiteralExpression } from 'ts-morph'
import { Node as tsNode } from 'ts-morph'
import { findObjectLiteralExpression } from '../../../shared/helper/find-object-literal-expression.js'
import { isRelationFunctionCall } from '../../../shared/helper/is-relation-function.js'

const findObjectLiteralInArgs = (call: CallExpression): ObjectLiteralExpression | null => {
  for (const arg of call.getArguments()) {
    const obj = findObjectLiteralExpression(arg)
    if (obj) return obj
  }
  return null
}

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
    call: CallExpression,
    sourceText: string,
  ): {
    name: string
    definition: string
    description?: string
  }[] => {
    const obj = findObjectLiteralInArgs(call)
    if (!obj) return []
    const isRelation = isRelationFunctionCall(call)

    return obj
      .getProperties()
      .map((prop) =>
        isRelation
          ? extractRelationFieldFromProperty(prop, sourceText)
          : extractFieldFromProperty(prop, sourceText),
      )
      .filter((field): field is NonNullable<typeof field> => field !== null)
  }
}

export const createExtractSchemaFromDeclaration = (
  extractFieldsFromCallExpression: (
    call: CallExpression,
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
    if (!tsNode.isVariableDeclaration(decl)) return null
    const name = decl.getName()
    if (!name) return null
    const init = decl.getInitializer()

    if (tsNode.isCallExpression(init)) {
      if (isRelationFunctionCall(init)) return null
      const fields = extractFieldsFromCallExpression(init, sourceText)
      return { name, fields }
    }

    if (tsNode.isObjectLiteralExpression(init)) {
      const fields = init
        .getProperties()
        .map((p) => extractFieldFromProperty(p, sourceText))
        .filter((f): f is NonNullable<typeof f> => f !== null)
      return { name, fields }
    }

    // fallback
    return { name, fields: [] }
  }
}
