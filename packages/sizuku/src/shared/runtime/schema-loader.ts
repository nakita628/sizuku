/**
 * Schema loader that extracts runtime information from Drizzle ORM schemas
 */

import type { AnyColumn } from 'drizzle-orm'
import { createMany, createOne, getTableColumns, is, One, Relations, type Table } from 'drizzle-orm'
import type { ForeignKey as MySqlForeignKey } from 'drizzle-orm/mysql-core'
import { MySqlTable } from 'drizzle-orm/mysql-core'
import type { ForeignKey as PgForeignKey } from 'drizzle-orm/pg-core'
import { isPgEnum, type PgEnum, PgTable } from 'drizzle-orm/pg-core'
import type { ForeignKey as SQLiteForeignKey } from 'drizzle-orm/sqlite-core'
import { SQLiteTable } from 'drizzle-orm/sqlite-core'
import {
  AnyInlineForeignKeys,
  MySqlInlineForeignKeys,
  PgInlineForeignKeys,
  Schema,
  SQLiteInlineForeignKeys,
  TableName,
} from '../../symbols.js'
import type {
  DrizzleDialect,
  RuntimeColumnInfo,
  RuntimeEnumInfo,
  RuntimeForeignKey,
  RuntimeRelationInfo,
  RuntimeSchemaInfo,
  RuntimeTableInfo,
} from './types.js'

type AnyForeignKey = PgForeignKey | MySqlForeignKey | SQLiteForeignKey

interface AnyTable {
  readonly [TableName]: string
  readonly [Schema]?: string
  readonly [AnyInlineForeignKeys]?: AnyForeignKey[]
}

/**
 * Detect the dialect of a Drizzle table
 */
function detectDialect(table: unknown): DrizzleDialect | null {
  if (is(table, PgTable)) return 'pg'
  if (is(table, MySqlTable)) return 'mysql'
  if (is(table, SQLiteTable)) return 'sqlite'
  return null
}

/**
 * Get the inline foreign keys symbol for a given dialect
 */
function getInlineForeignKeysSymbol(dialect: DrizzleDialect): symbol {
  switch (dialect) {
    case 'pg':
      return PgInlineForeignKeys
    case 'mysql':
      return MySqlInlineForeignKeys
    case 'sqlite':
      return SQLiteInlineForeignKeys
    default:
      return AnyInlineForeignKeys
  }
}

/**
 * Check if a column is auto-incrementing
 */
function isAutoIncrement(column: AnyColumn, dialect: DrizzleDialect): boolean {
  const sqlType = column.getSQLType().toLowerCase()

  if (dialect === 'pg') {
    return sqlType === 'serial' || sqlType === 'smallserial' || sqlType === 'bigserial'
  }

  if (dialect === 'mysql') {
    if (sqlType === 'serial') return true
    const col = column as unknown as { autoIncrement?: boolean }
    return col.autoIncrement === true
  }

  if (dialect === 'sqlite') {
    const col = column as unknown as { autoIncrement?: boolean }
    return sqlType === 'integer' && (column.primary || col.autoIncrement === true)
  }

  return false
}

/**
 * Extract column information from a Drizzle column
 */
function extractColumnInfo(column: AnyColumn, dialect: DrizzleDialect): RuntimeColumnInfo {
  return {
    name: column.name,
    sqlType: column.getSQLType(),
    isPrimaryKey: column.primary,
    isNotNull: column.notNull,
    isUnique: column.isUnique,
    hasDefault: column.default !== undefined,
    defaultValue: column.default,
    isAutoIncrement: isAutoIncrement(column, dialect),
  }
}

/**
 * Extract foreign key information from inline foreign keys
 */
function extractForeignKeys(fks: AnyForeignKey[], sourceTableName: string): RuntimeForeignKey[] {
  return fks.map((fk) => {
    const ref = fk.reference()
    const foreignTable = ref.foreignTable as unknown as AnyTable

    return {
      sourceTable: sourceTableName,
      sourceColumns: ref.columns.map((col) => col.name),
      foreignTable: foreignTable[TableName],
      foreignColumns: ref.foreignColumns.map((col) => col.name),
      onDelete: fk.onDelete,
      onUpdate: fk.onUpdate,
    }
  })
}

/**
 * Extract table information from a Drizzle table
 */
function extractTableInfo(table: unknown, key: string, dialect: DrizzleDialect): RuntimeTableInfo {
  const anyTable = table as unknown as AnyTable
  const tableName = anyTable[TableName]
  const schemaName = anyTable[Schema]
  const fkSymbol = getInlineForeignKeysSymbol(dialect)

  const drizzleColumns = getTableColumns(table as Table)
  const columns: RuntimeColumnInfo[] = []

  for (const columnName in drizzleColumns) {
    const column = drizzleColumns[columnName]
    columns.push(extractColumnInfo(column as AnyColumn, dialect))
  }

  const inlineFKs = (anyTable[fkSymbol as typeof AnyInlineForeignKeys] || []) as AnyForeignKey[]
  const foreignKeys = extractForeignKeys(inlineFKs, tableName)

  return {
    name: key,
    tableName,
    schema: schemaName,
    dialect,
    columns,
    foreignKeys,
  }
}

/**
 * Extract relation information from Drizzle relations
 */
function extractRelationInfo(
  relationsObj: Relations,
  _allTables: Map<string, RuntimeTableInfo>,
): RuntimeRelationInfo[] {
  const results: RuntimeRelationInfo[] = []
  const sourceTable = relationsObj.table as unknown as AnyTable
  const sourceTableName = sourceTable[TableName]

  const config = relationsObj.config({
    one: createOne(relationsObj.table),
    many: createMany(relationsObj.table),
  })

  for (const relationName in config) {
    const relation = config[relationName]
    const referencedTable = relation.referencedTable as unknown as AnyTable
    const referencedTableName = referencedTable[TableName]

    const info: RuntimeRelationInfo = {
      type: is(relation, One) ? 'one' : 'many',
      sourceTable: sourceTableName,
      referencedTable: referencedTableName,
      relationName: relation.relationName,
    }

    if (is(relation, One) && relation.config) {
      const fields = relation.config.fields
      const references = relation.config.references

      if (fields && fields.length > 0) {
        info.sourceColumns = fields.map((col) => col.name)
      }
      if (references && references.length > 0) {
        info.foreignColumns = references.map((col) => col.name)
      }
    }

    results.push(info)
  }

  return results
}

/**
 * Extract enum information from PostgreSQL enums
 */
function extractEnumInfo(enumObj: PgEnum<[string, ...string[]]>): RuntimeEnumInfo {
  return {
    name: enumObj.enumName,
    values: [...enumObj.enumValues],
  }
}

/**
 * Load schema information from a Drizzle schema module
 *
 * @param schemaModule - The imported Drizzle schema module (e.g., import * as schema from './schema')
 * @returns RuntimeSchemaInfo containing all extracted schema information
 */
export function loadSchemaFromModule(schemaModule: Record<string, unknown>): RuntimeSchemaInfo {
  const tables: RuntimeTableInfo[] = []
  const relations: RuntimeRelationInfo[] = []
  const enums: RuntimeEnumInfo[] = []
  const tableMap = new Map<string, RuntimeTableInfo>()
  let detectedDialect: DrizzleDialect | null = null

  for (const key in schemaModule) {
    const value = schemaModule[key]

    if (isPgEnum(value)) {
      enums.push(extractEnumInfo(value))
      if (!detectedDialect) detectedDialect = 'pg'
      continue
    }

    const dialect = detectDialect(value)
    if (dialect) {
      if (!detectedDialect) detectedDialect = dialect
      const tableInfo = extractTableInfo(value, key, dialect)
      tables.push(tableInfo)
      tableMap.set(tableInfo.tableName, tableInfo)
    }
  }

  for (const key in schemaModule) {
    const value = schemaModule[key]

    if (is(value, Relations)) {
      const relationInfos = extractRelationInfo(value, tableMap)
      relations.push(...relationInfos)
    }
  }

  return {
    dialect: detectedDialect || 'pg',
    tables,
    relations,
    enums,
  }
}

/**
 * Load schema from a file path by dynamically importing it
 *
 * @param schemaPath - Path to the schema file
 * @returns Promise<RuntimeSchemaInfo> containing all extracted schema information
 */
export async function loadSchemaFromPath(schemaPath: string): Promise<RuntimeSchemaInfo> {
  const schemaModule = await import(schemaPath)
  return loadSchemaFromModule(schemaModule)
}
