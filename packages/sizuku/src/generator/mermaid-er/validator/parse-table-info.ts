import type { AccumulatorType, TableInfo } from '../type/index.js'

type FieldInfo = {
  name: string
  type: string
  description: string
  line: number
}

type ExtendedAccumulator = AccumulatorType & {
  tempFields: FieldInfo[]
  currentTableStartLine: number
  insideRelations: boolean
  bracketDepth: number // track the depth of brackets
}

/**
 * Parse table info from code (all Drizzle definitions, relations excluded)
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
    insideRelations: false,
    bracketDepth: 0,
  }

  const result = code.reduce<ExtendedAccumulator>((acc, line, index) => {
    // detect relations function and manage state
    if (line.includes('relations(')) {
      acc.insideRelations = true
      acc.bracketDepth = 0
      return acc
    }

    // track the depth of brackets in the relations function
    if (acc.insideRelations) {
      // count the number of opening brackets
      const openBrackets = (line.match(/\{/g) || []).length
      const closeBrackets = (line.match(/\}/g) || []).length
      acc.bracketDepth += openBrackets - closeBrackets

      // if the bracket depth is 0 or less, the relations function ends
      if (acc.bracketDepth <= 0) {
        acc.insideRelations = false
        acc.bracketDepth = 0
      }
      return acc
    }

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

    // extract table name - all Drizzle table functions
    const tableMatch = line.match(/export const (\w+)\s*=\s*(\w+Table)\s*\(/)
    if (tableMatch) {
      const [_, tableName, tableFunction] = tableMatch

      // exclude variables containing "relation"
      if (tableName.toLowerCase().includes('relation')) {
        return acc
      }

      // check if it is a table function (xxxTable format)
      if (!tableFunction.endsWith('Table')) {
        return acc
      }

      if (acc.currentTable && acc.tempFields.length > 0) {
        acc.currentTable.fields = acc.tempFields.map((field) => ({
          name: field.name,
          type: field.type,
          description: field.description,
        }))
        acc.tables.push(acc.currentTable)
      }

      acc.currentTable = {
        name: tableName,
        fields: [],
      }
      acc.tempFields = []
      acc.currentTableStartLine = index
      return acc
    }

    // field info extraction (not in relations function)
    if (!acc.currentTable) {
      return acc
    }

    // Drizzle field definition pattern matching
    const fieldMatch = line.match(/^\s*([^:]+):\s*(\w+)\s*\(/)
    if (fieldMatch) {
      const [_, fieldName, fieldType] = fieldMatch

      // check if it is a Drizzle type function
      const drizzleTypes = [
        'varchar',
        'char',
        'text',
        'tinytext',
        'mediumtext',
        'longtext',
        'int',
        'tinyint',
        'smallint',
        'mediumint',
        'bigint',
        'decimal',
        'numeric',
        'float',
        'double',
        'real',
        'boolean',
        'serial',
        'timestamp',
        'datetime',
        'date',
        'time',
        'year',
        'json',
        'binary',
        'varbinary',
        'blob',
        'tinyblob',
        'mediumblob',
        'longblob',
        'enum',
        'set',
        'geometry',
        'point',
        'linestring',
        'polygon',
        // PostgreSQL types
        'uuid',
        'bytea',
        'inet',
        'cidr',
        'macaddr',
        'interval',
        'smallserial',
        'bigserial',
        'money',
        'bit',
        'varbit',
        // SQLite types
        'integer',
        'real',
        'blob',
        'numeric',
        // common types
        'primaryKey',
        'foreignKey',
        'unique',
        'index',
      ]

      if (drizzleTypes.includes(fieldType)) {
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
      }
      return acc
    }

    // detect foreign key constraint
    if (line.includes('.references')) {
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
