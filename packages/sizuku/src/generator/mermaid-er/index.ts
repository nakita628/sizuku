import { Result, ok, err } from 'neverthrow'
import { extractRelations } from './core/extract-relations.js'
import { erContent } from './generator/index.js'
import { parseTableInfo } from './validator/parse-table-info.js'
import { safeWriteFileAsync, type FileError } from '../../shared/utils/file.js'
import { tryCatchAsync } from '../../shared/utils/functional.js'
import type { Relation, TableInfo } from './types.js'

export type MermaidERGeneratorError = 
  | FileError
  | { type: 'PARSE_ERROR'; message: string }
  | { type: 'RELATION_EXTRACTION_ERROR'; message: string }
  | { type: 'CONTENT_GENERATION_ERROR'; message: string }

/**
 * Pure function to parse table information
 */
export function parseTableInfoSafe(code: string[]): Result<TableInfo[], MermaidERGeneratorError> {
  try {
    const tables = parseTableInfo(code)
    return ok(tables)
  } catch (error) {
    return err({
      type: 'PARSE_ERROR' as const,
      message: `Failed to parse table info: ${error}`,
    })
  }
}

/**
 * Pure function to extract relation information
 */
export function extractRelationsSafe(code: string[]): Result<Relation[], MermaidERGeneratorError> {
  try {
    const relations = extractRelations(code)
    return ok(relations)
  } catch (error) {
    return err({
      type: 'RELATION_EXTRACTION_ERROR' as const,
      message: `Failed to extract relations: ${error}`,
    })
  }
}

/**
 * Pure function to generate ER content
 */
export function generateERContent(
  relations: Relation[],
  tables: TableInfo[]
): Result<string, MermaidERGeneratorError> {
  try {
    const content = erContent(relations, tables)
    return ok(content)
  } catch (error) {
    return err({
      type: 'CONTENT_GENERATION_ERROR' as const,
      message: `Failed to generate ER content: ${error}`,
    })
  }
}

/**
 * Functional implementation to generate Mermaid ER diagram
 */
export async function generateMermaidERFile(
  code: string[],
  output: string
): Promise<Result<void, MermaidERGeneratorError>> {
  const tablesResult = parseTableInfoSafe(code)
  if (tablesResult.isErr()) {
    return err(tablesResult.error)
  }
  
  const relationsResult = extractRelationsSafe(code)
  if (relationsResult.isErr()) {
    return err(relationsResult.error)
  }
  
  const contentResult = generateERContent(relationsResult.value, tablesResult.value)
  if (contentResult.isErr()) {
    return err(contentResult.error)
  }
  
  return safeWriteFileAsync(output, contentResult.value)
}

/**
 * Function for backward compatibility (deprecated)
 * @deprecated Use generateMermaidERFile instead
 */
export async function sizukuMermaidER(code: string[], output: string): Promise<void> {
  const result = await generateMermaidERFile(code, output)
  if (result.isErr()) {
    throw new Error(result.error.message)
  }
}
