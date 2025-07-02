import { fieldDefinitions } from '../../../shared/generator/field-definitions.js'
import type { Schema } from '../../../shared/types.js'
import { capitalize } from '../../../shared/utils/capitalize.js'

/**
 * Generates a Zod schema for a given schema and config.
 *
 * @param schema - The schema to generate code for.
 * @param config - The configuration for the code generation.
 * @returns The generated Zod schema.
 */
export function zod(schema: Schema, comment: boolean) {
  console.log(schema)

  return `export const ${capitalize(schema.name)}Schema = z.object({${fieldDefinitions(schema, comment)}})`
}
