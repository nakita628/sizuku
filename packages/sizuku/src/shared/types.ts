export type SchemaField = {
  name: string
  definition: string
  description?: string
}

export type Schema = {
  name: string
  fields: SchemaField[]
}
