import type { Schema } from '../../../shared/types.js'
import { capitalize } from '../../../shared/utils/capitalize.js'
import { fieldDefinitions } from '../../../shared/generator/generate-field-definitions.js'

/**
 * @param schema
 * @param config
 * @returns
 */
export function valibot(schema: Schema, comment: boolean) {
  const res = fieldDefinitions(schema, comment)
  return `export const ${capitalize(schema.name)}Schema = v.object({${res}})`
}
