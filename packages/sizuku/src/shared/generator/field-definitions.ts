/**
 * @param schema
 * @returns
 */
export function fieldDefinitions(schema: {
  name: string
  fields: {
    name: string
    definition: string
    description?: string
  }[]
}, comment: boolean) {
  return schema.fields
    .map(({ name, definition, description }) => {
      const commentCode = description && comment ? `/**\n* ${description}\n*/\n` : ''
      return `${commentCode}${name}:${definition}`
    })
    .join(',\n')
}
