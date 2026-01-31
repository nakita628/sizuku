/**
 * Runtime types for extracting schema information from Drizzle ORM
 */

export type DrizzleDialect = 'pg' | 'mysql' | 'sqlite'

/**
 * Runtime column information extracted from Drizzle table
 */
export interface RuntimeColumnInfo {
  name: string
  sqlType: string
  isPrimaryKey: boolean
  isNotNull: boolean
  isUnique: boolean
  hasDefault: boolean
  defaultValue?: unknown
  isAutoIncrement?: boolean
}

/**
 * Foreign key information extracted from table references
 */
export interface RuntimeForeignKey {
  sourceTable: string
  sourceColumns: string[]
  foreignTable: string
  foreignColumns: string[]
  onDelete?: string
  onUpdate?: string
}

/**
 * Runtime table information extracted from Drizzle table
 */
export interface RuntimeTableInfo {
  name: string
  tableName: string
  schema?: string
  dialect: DrizzleDialect
  columns: RuntimeColumnInfo[]
  foreignKeys: RuntimeForeignKey[]
  primaryKeyColumns?: string[]
}

/**
 * Relation information extracted from Drizzle relations() function
 */
export interface RuntimeRelationInfo {
  type: 'one' | 'many'
  sourceTable: string
  referencedTable: string
  sourceColumns?: string[]
  foreignColumns?: string[]
  relationName?: string
}

/**
 * Enum information extracted from schema (PostgreSQL only)
 */
export interface RuntimeEnumInfo {
  name: string
  values: string[]
}

/**
 * Complete runtime schema information
 */
export interface RuntimeSchemaInfo {
  dialect: DrizzleDialect
  tables: RuntimeTableInfo[]
  relations: RuntimeRelationInfo[]
  enums: RuntimeEnumInfo[]
}

/**
 * Comment annotations extracted from source code
 */
export interface CommentAnnotation {
  type: 'zod' | 'valibot' | 'arktype' | 'effect' | 'description' | 'relation' | 'custom'
  key: string
  value: string
}

/**
 * Column comments map: tableName.columnName -> annotations
 */
export type ColumnCommentMap = Map<string, CommentAnnotation[]>

/**
 * Table comments map: tableName -> annotations
 */
export type TableCommentMap = Map<string, CommentAnnotation[]>

/**
 * Combined comment information
 */
export interface CommentInfo {
  tableComments: TableCommentMap
  columnComments: ColumnCommentMap
}

/**
 * Merged column information with runtime data and comments
 */
export interface MergedColumnInfo extends RuntimeColumnInfo {
  annotations: CommentAnnotation[]
}

/**
 * Merged table information with runtime data and comments
 */
export interface MergedTableInfo extends Omit<RuntimeTableInfo, 'columns'> {
  columns: MergedColumnInfo[]
  annotations: CommentAnnotation[]
}

/**
 * Merged relation information with additional metadata
 */
export interface MergedRelationInfo extends RuntimeRelationInfo {
  annotations?: CommentAnnotation[]
}

/**
 * Complete merged schema combining runtime and comment information
 */
export interface MergedSchema {
  dialect: DrizzleDialect
  tables: MergedTableInfo[]
  relations: MergedRelationInfo[]
  enums: RuntimeEnumInfo[]
}
