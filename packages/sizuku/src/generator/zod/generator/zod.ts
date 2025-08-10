import { capitalize, fieldDefinitions } from '../../../utils/index.js'

/**
 * Generates a Zod schema for a given schema and config.
 *
 * @param schema - The schema to generate code for.
 * @param config - The configuration for the code generation.
 * @returns The generated Zod schema.
 */
export function zod(
  schema: {
    name: string
    fields: {
      name: string
      definition: string
      description?: string
    }[]
    objectType?: 'strict' | 'loose'
  },
  comment: boolean,
) {
  const objectType =
    schema.objectType === 'strict'
      ? 'strictObject'
      : schema.objectType === 'loose'
        ? 'looseObject'
        : 'object'

  return `export const ${capitalize(schema.name)}Schema = z.${objectType}({${fieldDefinitions(schema, comment)}})`
}
