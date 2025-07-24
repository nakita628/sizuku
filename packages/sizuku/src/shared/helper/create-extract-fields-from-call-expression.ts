import type { CallExpression, Node, ObjectLiteralExpression } from 'ts-morph'

export function createExtractFieldsFromCallExpression(
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
  findObjectLiteralExpression: (expr: Node) => ObjectLiteralExpression | null,
  findObjectLiteralInArgs: (
    call: CallExpression,
    finder: (expr: Node) => ObjectLiteralExpression | null,
  ) => ObjectLiteralExpression | null,
  isRelationFunctionCall: (call: CallExpression) => boolean,
) {
  return (
    callExpr: CallExpression,
    sourceText: string,
  ): {
    name: string
    definition: string
    description?: string
  }[] => {
    const objectLiteral = findObjectLiteralInArgs(callExpr, findObjectLiteralExpression)
    if (!objectLiteral) return []

    const isRelation = isRelationFunctionCall(callExpr)

    return objectLiteral
      .getProperties()
      .map((prop) =>
        isRelation
          ? extractRelationFieldFromProperty(prop, sourceText)
          : extractFieldFromProperty(prop, sourceText),
      )
      .filter(
        (
          field,
        ): field is {
          name: string
          definition: string
          description?: string
        } => field !== null,
      )
  }
}
