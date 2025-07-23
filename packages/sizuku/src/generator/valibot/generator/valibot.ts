import { fieldDefinitions } from '../../../shared/generator/field-definitions.js'
import type { Schema } from '../../../shared/types.js'
import { capitalize } from '../../../shared/utils/capitalize.js'

/**
 * @param schema
 * @param config
 * @returns
 */
export function valibot(schema: Schema, comment: boolean) {
  const res = fieldDefinitions(schema, comment)
  return `export const ${capitalize(schema.name)}Schema = v.object({${res}})`
}
