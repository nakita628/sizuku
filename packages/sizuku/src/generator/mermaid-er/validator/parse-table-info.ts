import type { AccumulatorType, TableInfo } from '../type'

type FieldInfo = {
  name: string
  type: string
  description: string
  line: number
}

type ExtendedAccumulator = AccumulatorType & {
  tempFields: FieldInfo[]
  currentTableStartLine: number
}

/**
 * Parse table info from code
 * @function parseTableInfo
 * @param code - The code to parse the table info from
 * @returns The parsed table info
 */
export function parseTableInfo(code: string[]): TableInfo[] {
  const initialAccumulator: ExtendedAccumulator = {
    tables: [],
    currentTable: null,
    currentDescription: '',
    tempFields: [],
    currentTableStartLine: 0,
  }

  const result = code.reduce<ExtendedAccumulator>((acc, line, index) => {
    // extract description
    const descriptionMatch = line.match(/\/\/\/\s*([^@].*)/)
    if (
      descriptionMatch &&
      !(line.includes('@z.') || line.includes('@v.')) &&
      !line.includes('@relation')
    ) {
      acc.currentDescription = descriptionMatch[1]?.trim() ?? null
      return acc
    }

    // extract table name
    const tableMatch = line.match(/export const (\w+)\s*=\s*mysqlTable/)
    if (tableMatch) {
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
      acc.tempFields = []
      acc.currentTableStartLine = index
      return acc
    }

    // field info extraction
    if (!acc.currentTable) {
      return acc
    }

    const fieldMatch = line.match(/^\s*([^:]+):\s*([^(]+)\(/)
    if (fieldMatch) {
      const [_, fieldName, fieldType] = fieldMatch
      const description = line.includes('.primaryKey()')
        ? `(PK) ${acc.currentDescription || ''}`
        : acc.currentDescription || ''

      acc.tempFields.push({
        name: fieldName.trim(),
        type: fieldType.trim(),
        description,
        line: index,
      })
      acc.currentDescription = ''
      return acc
    }

    // detect foreign key constraint
    if (line.includes('.references') || line.includes('relations')) {
      const lastIndex = acc.tempFields.length - 1
      if (lastIndex >= 0) {
        const lastField = acc.tempFields[lastIndex]
        acc.tempFields[lastIndex] = {
          name: lastField.name,
          type: lastField.type,
          description: `(FK) ${lastField.description}`,
          line: lastField.line,
        }
      }
      return acc
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
