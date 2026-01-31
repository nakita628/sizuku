/**
 * Runtime module for extracting and merging Drizzle schema information
 *
 * This module provides utilities for:
 * - Loading schema information from Drizzle ORM modules at runtime
 * - Extracting comment annotations from source code
 * - Merging runtime and comment information into a unified schema
 */

// Comment extractor exports
export {
  createEmptyCommentInfo,
  extractCommentsFromSource,
  parseAnnotations,
} from './comment-extractor.js'

// Schema loader exports
export { loadSchemaFromModule, loadSchemaFromPath } from './schema-loader.js'
// Schema merger exports
export {
  createMergedSchemaFromRuntime,
  findColumn,
  findTable,
  getForeignKeysTo,
  getTableRelations,
  mergeSchemaWithComments,
} from './schema-merger.js'
// Type exports
export type {
  ColumnCommentMap,
  CommentAnnotation,
  CommentInfo,
  DrizzleDialect,
  MergedColumnInfo,
  MergedRelationInfo,
  MergedSchema,
  MergedTableInfo,
  RuntimeColumnInfo,
  RuntimeEnumInfo,
  RuntimeForeignKey,
  RuntimeRelationInfo,
  RuntimeSchemaInfo,
  RuntimeTableInfo,
  TableCommentMap,
} from './types.js'
