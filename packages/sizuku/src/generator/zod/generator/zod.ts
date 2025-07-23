import { fieldDefinitions } from '../../../shared/generator/field-definitions.js'
import { capitalize } from '../../../shared/utils/index.js'

/**
 * Generates a Zod schema for a given schema and config.
 *
 * @param schema - The schema to generate code for.
 * @param config - The configuration for the code generation.
 * @returns The generated Zod schema.
 */
export function zod(schema: {
  name: string
  fields: {
    name: string
    definition: string
    description?: string
  }[]
}, comment: boolean) {
  return `export const ${capitalize(schema.name)}Schema = z.object({${fieldDefinitions(schema, comment)}})`
}
