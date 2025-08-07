import { Node } from 'ts-morph'
import { extractFieldComments, schemaName } from '../utils/index.js'
import type { FieldExtractionResult } from './build-schema-extractor.js'

/**
 * Field comment parser function type for parsing comment lines.
 */
export type FieldCommentParser = (lines: string[]) => {
  /** Validation definition string */
  definition: string
  /** Optional field description */
  description?: string
}

/**
 * Generates relation definition based on function name and reference table.
 *
 * @param fnName - The relation function name ('many' or 'one')
 * @param refTable - The referenced table name
 * @param prefix - Schema prefix ('v' or 'z') for validation library
 * @returns The generated relation definition string
 */
function generateRelationDefinition(fnName: string, refTable: string, prefix: 'v' | 'z'): string {
  const schema = schemaName(refTable)
  return fnName === 'many' ? `${prefix}.array(${schema})` : fnName === 'one' ? schema : ''
}

/**
 * Creates a relation field extractor function.
 *
 * This function creates a field extractor specifically for relation fields
 * (like `many(post)` or `one(user)`). It processes the relation function calls
 * and generates appropriate validation definitions based on the relation type.
 *
 * @param parseFieldComments - Function to parse field comments
 * @param prefix - Schema prefix ('v' or 'z') for validation library
 * @returns Function that extracts relation fields from property
 *
 * @example
 * ```typescript
 * const extractor = createExtractRelationFieldFromProperty(
 *   (lines) => parseFieldComments(lines, '@z.'),
 *   'z'
 * )
 * const field = extractor(propertyNode, sourceText)
 * // Returns: { name: 'posts', definition: 'z.array(PostSchema)', description: 'User posts' }
 * ```
 */
export function createExtractRelationFieldFromProperty(
  parseFieldComments: FieldCommentParser,
  prefix: 'v' | 'z',
) {
  return (property: Node, sourceText: string): FieldExtractionResult | null => {
    if (!Node.isPropertyAssignment(property)) return null

    const name = property.getName()
    if (!name) return null

    const init = property.getInitializer()
    if (!Node.isCallExpression(init)) {
      return { name, definition: '', description: undefined }
    }

    const expr = init.getExpression()
    if (!Node.isIdentifier(expr)) {
      return { name, definition: '', description: undefined }
    }

    const fnName = expr.getText()
    const args = init.getArguments()

    if (!(args.length && Node.isIdentifier(args[0]))) {
      return { name, definition: '', description: undefined }
    }

    const refTable = args[0].getText()
    const definition = generateRelationDefinition(fnName, refTable, prefix)

    const { description } = parseFieldComments(
      extractFieldComments(sourceText, property.getStart()),
    )

    return { name, definition, description }
  }
}
