import { capitalize, fieldDefinitions } from '../../../utils/index.js'

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
    objectType?: 'strict' | 'loose'
  },
  comment: boolean,
) {
  const res = fieldDefinitions(schema, comment)
  const objectType =
    schema.objectType === 'strict'
      ? 'strictObject'
      : schema.objectType === 'loose'
        ? 'looseObject'
        : 'object'

  return `export const ${capitalize(schema.name)}Schema = v.${objectType}({${res}})`
}
