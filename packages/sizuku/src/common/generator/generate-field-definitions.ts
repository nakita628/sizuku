import type { Schema } from '../type'
import type { Config } from '../config'
/**
 * @function generateFieldDefinitions
 * @param schema
 * @returns
 */
export function generateFieldDefinitions(schema: Schema, config: Config) {
  return schema.fields
    .map(({ name, definition, description }) => {
      const comment = description && config.comment ? `/**\n* ${description}\n*/\n` : ''
      return `${comment}${name}:${definition}`
    })
    .join(',\n')
}
