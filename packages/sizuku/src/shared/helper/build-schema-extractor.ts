import type { CallExpression } from 'ts-morph'
import { Node } from 'ts-morph'
import { isRelationFunctionCall } from './is-relation-function.js'
import type { SchemaExtractionResult, SchemaExtractor } from './extract-schemas.js'

/**
 * Field extraction result type containing field metadata.
 */
export type FieldExtractionResult = {
  /** Field name */
  name: string
  /** Validation definition string */
  definition: string
  /** Optional field description */
  description?: string
}

/**
 * Field extractor function type for processing object literal properties.
 */
export type FieldExtractor = (
  prop: Node,
  sourceText: string,
) => FieldExtractionResult | null

/**
 * Call expression field extractor function type for processing function calls.
 */
export type CallExpressionFieldExtractor = (
  call: CallExpression,
  sourceText: string,
) => FieldExtractionResult[]

/**
 * Creates a schema extractor from customizable strategies.
 *
 * This function builds a schema extractor that can handle both call expressions
 * (like `mysqlTable(...)`) and object literal expressions, with customizable
 * field extraction strategies.
 *
 * @param extractFieldsFromCall - Function to extract fields from a call expression
 * @param extractFieldFromProperty - Function to extract a single field from an object literal property
 * @returns A function that extracts a schema from a variable declaration node
 * 
 * @example
 * ```typescript
 * const extractor = buildSchemaExtractor(
 *   extractFieldsFromCall,
 *   extractFieldFromProperty
 * )
 * const schema = extractor(declaration, sourceText)
 * ```
 */
export function buildSchemaExtractor(
  extractFieldsFromCall: CallExpressionFieldExtractor,
  extractFieldFromProperty: FieldExtractor,
): SchemaExtractor {
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
