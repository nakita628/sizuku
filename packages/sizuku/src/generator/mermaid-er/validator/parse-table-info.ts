import type { AccumulatorType, TableInfo } from '../type'

type FieldInfo = {
  name: string
  type: string
  description: string
  line: number
}

/**
 * Parse table info from code
 * @function parseTableInfo
 * @param code - The code to parse the table info from
 * @returns The parsed table info
 */
export function parseTableInfo(code: string[]): TableInfo[] {
  const initialAccumulator: AccumulatorType & {
    tempFields: FieldInfo[]
    currentTableStartLine: number
  } = {
    tables: [],
    currentTable: null,
    currentDescription: '',
    tempFields: [],
    currentTableStartLine: 0,
  }

  const result = code.reduce((acc, line, index) => {
    // extract description
    const descriptionMatch = line.match(/\/\/\/\s*([^@].*)/)
    if (
      descriptionMatch &&
      !line.includes('@z.') &&
      !line.includes('@v.') &&
      !line.includes('@relation')
    ) {
      acc.currentDescription = descriptionMatch[1]?.trim() ?? null
      return acc
    }

    // extract table name
    const tableMatch = line.match(/export const (\w+)\s*=\s*mysqlTable/)
    if (tableMatch) {
      // process fields of the previous table
      if (acc.currentTable && acc.tempFields.length > 0) {
        acc.currentTable.fields = acc.tempFields.map((field) => ({
          name: field.name,
          type: field.type,
          description: field.description,
        }))
        acc.tables.push(acc.currentTable)
      }

      acc.currentTable = {
        name: tableMatch[1],
        fields: [],
      }
      acc.currentTableStartLine = index
      // reset tempFields
      acc.tempFields = []
      return acc
    }

    // field info extraction
    if (acc.currentTable) {
      const fieldMatch = line.match(/^\s*([^:]+):\s*([^(]+)\(/)
      if (fieldMatch) {
        const [_, fieldName, fieldType] = fieldMatch
        const description =
          (line.includes('.primaryKey()') ? '(PK) ' : '') + (acc.currentDescription || '')

        acc.tempFields = [
          ...acc.tempFields,
          {
            name: fieldName.trim(),
            type: fieldType.trim(),
            description,
            line: index,
          },
        ]
        acc.currentDescription = ''
      }
      // detect foreign key constraint
      if (line.includes('.references') || line.includes('relations')) {
        const lastField = acc.tempFields[acc.tempFields.length - 1]
        if (lastField) {
          lastField.description = '(FK) ' + lastField.description
        }
      }
    }

    return acc
  }, initialAccumulator)

  // process fields of the last table
  if (result.currentTable && result.tempFields.length > 0) {
    result.currentTable.fields = result.tempFields.map((field) => ({
      name: field.name,
      type: field.type,
      description: field.description,
    }))
    result.tables.push(result.currentTable)
  }

  return result.tables
}
