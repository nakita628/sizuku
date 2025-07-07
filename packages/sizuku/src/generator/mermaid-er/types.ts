export type Relation = {
  fromModel: string
  toModel: string
  fromField: string
  toField: string
  type: string
}

export type ERContent = readonly string[]

export type TableInfo = {
  name: string
  fields: {
    type: string
    name: string
    description: string | null
  }[]
}

export type AccumulatorType = {
  tables: TableInfo[]
  currentTable: TableInfo | null
  currentDescription: string
}
