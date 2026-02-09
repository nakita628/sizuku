/**
 * Comment extractor for parsing annotations from Drizzle schema source code
 *
 * Supports annotations like:
 * - @z.string().min(1) - Zod validations
 * - @v.string() - Valibot validations
 * - @a."string.uuid" - ArkType validations
 * - @e.Schema.UUID - Effect validations
 * - @description "User's email address" - Description annotations
 * - @relation Post.userId User.id one-to-many - Relation annotations
 */

import type { ColumnCommentMap, CommentAnnotation, CommentInfo, TableCommentMap } from './types.js'

/**
 * Regex patterns for different annotation types
 */
const ANNOTATION_PATTERNS = {
  zod: /@z\.([^\n@]+)/g,
  valibot: /@v\.([^\n@]+)/g,
  arktype: /@a\.([^\n@]+)/g,
  effect: /@e\.([^\n@]+)/g,
  description: /@description\s+["']([^"']+)["']/g,
  relation: /@relation\s+([^\n]+)/g,
  custom: /@(\w+)\.(\w+)\s+([^\n@]+)/g,
}

/**
 * Parse a single annotation from a comment
 */
function parseAnnotation(
  type: CommentAnnotation['type'],
  key: string,
  value: string,
): CommentAnnotation {
  return {
    type,
    key: key.trim(),
    value: value.trim(),
  }
}

/**
 * Extract all annotations from a comment string
 */
function extractAnnotationsFromComment(comment: string): CommentAnnotation[] {
  const annotations: CommentAnnotation[] = []

  // Extract Zod annotations
  for (const match of comment.matchAll(new RegExp(ANNOTATION_PATTERNS.zod.source, 'g'))) {
    annotations.push(parseAnnotation('zod', 'schema', match[1]))
  }

  // Extract Valibot annotations
  for (const match of comment.matchAll(new RegExp(ANNOTATION_PATTERNS.valibot.source, 'g'))) {
    annotations.push(parseAnnotation('valibot', 'schema', match[1]))
  }

  // Extract ArkType annotations
  for (const match of comment.matchAll(new RegExp(ANNOTATION_PATTERNS.arktype.source, 'g'))) {
    annotations.push(parseAnnotation('arktype', 'schema', match[1]))
  }

  // Extract Effect annotations
  for (const match of comment.matchAll(new RegExp(ANNOTATION_PATTERNS.effect.source, 'g'))) {
    annotations.push(parseAnnotation('effect', 'schema', match[1]))
  }

  // Extract description annotations
  for (const match of comment.matchAll(new RegExp(ANNOTATION_PATTERNS.description.source, 'g'))) {
    annotations.push(parseAnnotation('description', 'description', match[1]))
  }

  // Extract relation annotations
  for (const match of comment.matchAll(new RegExp(ANNOTATION_PATTERNS.relation.source, 'g'))) {
    annotations.push(parseAnnotation('relation', 'relation', match[1]))
  }

  // Extract custom annotations
  for (const match of comment.matchAll(new RegExp(ANNOTATION_PATTERNS.custom.source, 'g'))) {
    const namespace = match[1]
    const key = match[2]
    const value = match[3]
    // Skip if it's a known namespace
    if (!['z', 'v', 'a', 'e', 'description', 'relation'].includes(namespace)) {
      annotations.push(parseAnnotation('custom', `${namespace}.${key}`, value))
    }
  }

  return annotations
}

/**
 * Extract the content between table definition braces
 */
function extractTableContent(source: string, startIndex: number): string | null {
  let depth = 0
  let start = -1
  let end = -1

  for (let i = startIndex; i < source.length; i++) {
    const char = source[i]
    if (char === '{') {
      if (depth === 0) {
        start = i + 1
      }
      depth++
    } else if (char === '}') {
      depth--
      if (depth === 0) {
        end = i
        break
      }
    }
  }

  if (start !== -1 && end !== -1) {
    return source.substring(start, end)
  }
  return null
}

/**
 * Extract column annotations from table content
 */
function extractColumnAnnotations(tableContent: string, tableName: string): ColumnCommentMap {
  const columnComments: ColumnCommentMap = new Map()

  // Pattern to find column definitions with preceding comments
  const columnPattern =
    /(?:\/\*\*?([\s\S]*?)\*\/|\/\/\/([^\n]*(?:\n\s*\/\/\/[^\n]*)*))\s*(\w+)\s*:/g

  for (const columnMatch of tableContent.matchAll(columnPattern)) {
    const blockComment = columnMatch[1] || ''
    const lineComment = columnMatch[2] || ''
    const columnName = columnMatch[3]
    const comment = blockComment || lineComment.replace(/\n\s*\/\/\//g, '\n')

    const annotations = extractAnnotationsFromComment(comment)
    if (annotations.length > 0) {
      columnComments.set(`${tableName}.${columnName}`, annotations)
    }
  }

  return columnComments
}

/**
 * Simple source code parser to extract comments associated with tables and columns
 */
export function extractCommentsFromSource(sourceCode: string): CommentInfo {
  const tableComments: TableCommentMap = new Map()
  const columnComments: ColumnCommentMap = new Map()

  // Pattern to find table definitions with preceding comments
  const tablePattern =
    /(?:\/\*\*?([\s\S]*?)\*\/|\/\/\/([^\n]*(?:\n\/\/\/[^\n]*)*))\s*(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:\w+\.table|pgTable|mysqlTable|sqliteTable)\s*\(\s*["'](\w+)["']/g

  for (const tableMatch of sourceCode.matchAll(tablePattern)) {
    const blockComment = tableMatch[1] || ''
    const lineComment = tableMatch[2] || ''
    const _variableName = tableMatch[3]
    const tableName = tableMatch[4]
    const comment = blockComment || lineComment.replace(/\n\/\/\//g, '\n')

    const annotations = extractAnnotationsFromComment(comment)
    if (annotations.length > 0) {
      tableComments.set(tableName, annotations)
    }

    const tableStart = (tableMatch.index ?? 0) + tableMatch[0].length
    const tableContent = extractTableContent(sourceCode, tableStart)

    if (tableContent) {
      const colAnnotations = extractColumnAnnotations(tableContent, tableName)
      for (const [key, value] of colAnnotations) {
        columnComments.set(key, value)
      }
    }
  }

  return {
    tableComments,
    columnComments,
  }
}

/**
 * Parse annotations from a comment string
 */
export function parseAnnotations(comment: string): CommentAnnotation[] {
  return extractAnnotationsFromComment(comment)
}

/**
 * Create an empty CommentInfo object
 */
export function createEmptyCommentInfo(): CommentInfo {
  return {
    tableComments: new Map(),
    columnComments: new Map(),
  }
}
