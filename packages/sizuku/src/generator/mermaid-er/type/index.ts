export type RelationType =
  | 'one-to-one'
  | 'one-to-many'
  | 'many-to-one'
  | 'many-to-many'
  | 'one-to-zero-one'
  | 'zero-one-to-one'
  | 'zero-to-many'
  | 'many-to-zero-one'
  | 'zero-one-to-many'
  | 'zero-to-one'
  | 'zero-to-zero-one'
  | 'one-to-many-optional'
  | 'one-to-one-optional'
  | 'many-to-many-optional'
  | 'zero-one-to-zero-one'
  | 'many-to-zero-many'
  | 'zero-many-to-many'
  | 'zero-many-to-zero-many'

export type Relation = {
  fromModel: string
  toModel: string
  fromField: string
  toField: string
  type: RelationType
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
