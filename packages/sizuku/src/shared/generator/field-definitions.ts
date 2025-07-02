import type { Schema } from '../types.js'
/**
 * @param schema
 * @returns
 */
export function fieldDefinitions(schema: Schema, comment: boolean) {
  return schema.fields
    .map(({ name, definition, description }) => {
      const commentCode = description && comment ? `/**\n* ${description}\n*/\n` : ''
      return `${commentCode}${name}:${definition}`
    })
    .join(',\n')
}
