import { makeCapitalized, makeZodObject } from 'utils-lab'
import { fieldDefinitions } from '../../../utils/index.js'

/**
 * Generates a Zod schema for a given schema and config.
 *
 * @param schema - The schema to generate code for.
 * @param comment - Whether to include comments in the generated code.
 * @returns The generated Zod schema.
 */
export function zod(
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
  const wrapperType =
    schema.objectType === 'strict'
      ? 'strictObject'
      : schema.objectType === 'loose'
        ? 'looseObject'
        : 'object'
  const inner = fieldDefinitions(schema, comment)
  const objectCode = makeZodObject(inner, wrapperType)
  return `export const ${makeCapitalized(schema.name)}Schema = ${objectCode}`
}
