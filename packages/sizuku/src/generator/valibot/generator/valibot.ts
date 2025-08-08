import { fieldDefinitions } from '../../../shared/generator/field-definitions.js'

/**
 * @param schema
 * @param config
 * @returns
 */
export function valibot(
  schema: {
    name: string
    fields: {
      name: string
      definition: string
      description?: string
    }[]
  },
  comment: boolean,
) {
  const res = fieldDefinitions(schema, comment)
  return `export const ${schema.name}Schema = v.object({${res}})`
}
