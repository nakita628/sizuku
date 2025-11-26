import { capitalize, fieldDefinitions } from '../../../utils/index.js'

/**
 * Generates a Valibot schema for a given schema and config.
 *
 * @param schema - The schema to generate code for.
 * @param comment - Whether to include comments in the generated code.
 * @returns The generated Valibot schema.
 */
export function valibot(
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
  const res = fieldDefinitions(schema, comment)
  const objectType =
    schema.objectType === 'strict'
      ? 'strictObject'
      : schema.objectType === 'loose'
        ? 'looseObject'
        : 'object'
  return `export const ${capitalize(schema.name)}Schema = v.${objectType}({${res}})`
}
