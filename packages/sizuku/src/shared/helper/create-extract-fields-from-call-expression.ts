import type { CallExpression, Node, ObjectLiteralExpression } from 'ts-morph'
import type { FieldExtractionResult } from './build-schema-extractor.js'

/**
 * Field extractor function type for processing object literal properties.
 */
export type FieldExtractor = (property: Node, sourceText: string) => FieldExtractionResult | null

/**
 * Relation field extractor function type for processing relation properties.
 */
export type RelationFieldExtractor = (
  property: Node,
  sourceText: string,
) => FieldExtractionResult | null

/**
 * Object literal finder function type for locating object literals in AST.
 */
export type ObjectLiteralFinder = (expr: Node) => ObjectLiteralExpression | null

/**
 * Object literal in args finder function type for finding object literals in function arguments.
 */
export type ObjectLiteralInArgsFinder = (
  call: CallExpression,
  finder: ObjectLiteralFinder,
) => ObjectLiteralExpression | null

/**
 * Relation function checker type for identifying relation-related function calls.
 */
export type RelationFunctionChecker = (call: CallExpression) => boolean

/**
 * Creates a field extractor for call expressions with customizable strategies.
 *
 * This function creates a field extractor that can process call expressions
 * (like `mysqlTable(...)`) and extract fields from their object literal arguments.
 * It supports both regular fields and relation fields with different extraction strategies.
 *
 * @param extractFieldFromProperty - Function to extract field from property
 * @param extractRelationFieldFromProperty - Function to extract relation field from property
 * @param findObjectLiteralExpression - Function to find object literal expression
 * @param findObjectLiteralInArgs - Function to find object literal in call arguments
 * @param isRelationFunctionCall - Function to check if call is relation function
 * @returns Function that extracts fields from call expression
 *
 * @example
 * ```typescript
 * const extractor = createExtractFieldsFromCallExpression(
 *   extractField,
 *   extractRelationField,
 *   findObjectLiteral,
 *   findObjectLiteralInArgs,
 *   isRelationFunction
 * )
 * const fields = extractor(callExpression, sourceText)
 * ```
 */
export function createExtractFieldsFromCallExpression(
  extractFieldFromProperty: FieldExtractor,
  extractRelationFieldFromProperty: RelationFieldExtractor,
  findObjectLiteralExpression: ObjectLiteralFinder,
  findObjectLiteralInArgs: ObjectLiteralInArgsFinder,
  isRelationFunctionCall: RelationFunctionChecker,
) {
  return (callExpr: CallExpression, sourceText: string): FieldExtractionResult[] => {
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
      .filter((field): field is FieldExtractionResult => field !== null)
  }
}
