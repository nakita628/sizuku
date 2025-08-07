import { Node } from 'ts-morph'
import { extractFieldComments } from '../utils/index.js'
import type { FieldExtractionResult } from './build-schema-extractor.js'

/**
 * Field comment parser function type for parsing comment lines.
 */
export type FieldCommentParser = (commentLines: string[]) => {
  /** Validation definition string */
  definition: string
  /** Optional field description */
  description?: string
}

/**
 * Creates a field extractor function using a custom parseFieldComments implementation.
 *
 * This function creates a field extractor that processes object literal properties
 * and extracts field information including name, validation definition, and description
 * from associated comments.
 *
 * @param parseFieldComments - A function that parses comment lines into { definition, description }
 * @returns A property node extractor function
 *
 * @example
 * ```typescript
 * const extractor = createExtractFieldFromProperty((lines) => parseFieldComments(lines, '@z.'))
 * const field = extractor(propertyNode, sourceText)
 * // Returns: { name: 'id', definition: 'z.uuid()', description: 'Primary key' }
 * ```
 */
export function createExtractFieldFromProperty(parseFieldComments: FieldCommentParser) {
  return (property: Node, sourceText: string): FieldExtractionResult | null => {
    if (!Node.isPropertyAssignment(property)) return null

    const name = property.getName()
    if (!name) return null

    const commentLines = extractFieldComments(sourceText, property.getStart())
    const { definition, description } = parseFieldComments(commentLines)

    return { name, definition, description }
  }
}
