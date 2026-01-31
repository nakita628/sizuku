/**
 * Schema merger that combines runtime schema information with extracted comments
 */

import type {
  CommentAnnotation,
  CommentInfo,
  MergedColumnInfo,
  MergedRelationInfo,
  MergedSchema,
  MergedTableInfo,
  RuntimeSchemaInfo,
} from './types.js'

/**
 * Merge runtime schema information with extracted comments
 *
 * @param runtimeInfo - Schema information extracted at runtime from Drizzle tables
 * @param comments - Comment annotations extracted from source code
 * @returns MergedSchema combining both sources of information
 */
export function mergeSchemaWithComments(
  runtimeInfo: RuntimeSchemaInfo,
  comments: CommentInfo,
): MergedSchema {
  const mergedTables: MergedTableInfo[] = runtimeInfo.tables.map((table) => {
    const tableAnnotations = comments.tableComments.get(table.tableName) || []

    const mergedColumns: MergedColumnInfo[] = table.columns.map((column) => ({
      ...column,
      annotations: comments.columnComments.get(`${table.tableName}.${column.name}`) || [],
    }))

    return {
      ...table,
      columns: mergedColumns,
      annotations: tableAnnotations,
    }
  })

  const mergedRelations: MergedRelationInfo[] = runtimeInfo.relations.map((relation) => ({
    ...relation,
    annotations: [],
  }))

  return {
    dialect: runtimeInfo.dialect,
    tables: mergedTables,
    relations: mergedRelations,
    enums: runtimeInfo.enums,
  }
}

/**
 * Create a MergedSchema from runtime info only (no comments)
 *
 * @param runtimeInfo - Schema information extracted at runtime from Drizzle tables
 * @returns MergedSchema with empty annotations
 */
export function createMergedSchemaFromRuntime(runtimeInfo: RuntimeSchemaInfo): MergedSchema {
  const mergedTables: MergedTableInfo[] = runtimeInfo.tables.map((table) => ({
    ...table,
    columns: table.columns.map((column) => ({
      ...column,
      annotations: [] as CommentAnnotation[],
    })),
    annotations: [] as CommentAnnotation[],
  }))

  const mergedRelations: MergedRelationInfo[] = runtimeInfo.relations.map((relation) => ({
    ...relation,
    annotations: [],
  }))

  return {
    dialect: runtimeInfo.dialect,
    tables: mergedTables,
    relations: mergedRelations,
    enums: runtimeInfo.enums,
  }
}

/**
 * Find a table in the merged schema by name
 */
export function findTable(schema: MergedSchema, tableName: string): MergedTableInfo | undefined {
  return schema.tables.find((t) => t.tableName === tableName)
}

/**
 * Find a column in the merged schema by table and column name
 */
export function findColumn(
  schema: MergedSchema,
  tableName: string,
  columnName: string,
): MergedColumnInfo | undefined {
  const table = findTable(schema, tableName)
  return table?.columns.find((c) => c.name === columnName)
}

/**
 * Get all relations for a specific table
 */
export function getTableRelations(schema: MergedSchema, tableName: string): MergedRelationInfo[] {
  return schema.relations.filter((r) => r.sourceTable === tableName)
}

/**
 * Get all foreign keys targeting a specific table
 */
export function getForeignKeysTo(
  schema: MergedSchema,
  tableName: string,
): Array<{ sourceTable: string; fk: MergedTableInfo['foreignKeys'][0] }> {
  const results: Array<{
    sourceTable: string
    fk: MergedTableInfo['foreignKeys'][0]
  }> = []

  for (const table of schema.tables) {
    for (const fk of table.foreignKeys) {
      if (fk.foreignTable === tableName) {
        results.push({ sourceTable: table.tableName, fk })
      }
    }
  }

  return results
}
