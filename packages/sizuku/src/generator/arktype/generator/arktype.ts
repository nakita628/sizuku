import { makeCapitalized } from 'utils-lab'
import { fieldDefinitions } from '../../../utils/index.js'

/**
 * Generates an ArkType schema for a given schema and config.
 *
 * @param schema - The schema to generate code for.
 * @param comment - Whether to include comments in the generated code.
 * @returns The generated ArkType schema.
 */
export function arktype(
  schema: {
    readonly name: string
    readonly fields: {
      readonly name: string
      readonly definition: string
      readonly description?: string
    }[]
    readonly objectType?: 'strict' | 'loose'
  },
  comment: boolean,
): string {
  const inner = fieldDefinitions(schema, comment)
  return `export const ${makeCapitalized(schema.name)}Schema = type({${inner}})`
}
