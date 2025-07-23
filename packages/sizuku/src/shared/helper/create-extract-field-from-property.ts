import { Node } from 'ts-morph'
import { extractFieldComments } from '../../shared/utils/index.js'

/**
 * Creates a field extractor function using a custom parseFieldComments implementation.
 *
 * @param parseFieldComments - A function that parses comment lines into { definition, description }
 * @returns A property node extractor function.
 */
export function createExtractFieldFromProperty(
  parseFieldComments: (commentLines: string[]) => { definition: string; description?: string },
) {
  return (
    property: Node,
    sourceText: string,
  ): {
    name: string
    definition: string
    description?: string
  } | null => {
    if (!Node.isPropertyAssignment(property)) return null

    const name = property.getName()
    if (!name) return null

    const commentLines = extractFieldComments(sourceText, property.getStart())
    const { definition, description } = parseFieldComments(commentLines)

    return { name, definition, description }
  }
}
