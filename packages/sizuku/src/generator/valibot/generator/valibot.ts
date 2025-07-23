import { fieldDefinitions } from '../../../shared/generator/field-definitions.js'
import { capitalize } from '../../../shared/utils/index.js'

/**
 * @param schema
 * @param config
 * @returns
 */
export function valibot(schema: {
  name: string
  fields: {
    name: string
    definition: string
    description?: string
  }[]
}, comment: boolean) {
  const res = fieldDefinitions(schema, comment)
  return `export const ${capitalize(schema.name)}Schema = v.object({${res}})`
}
