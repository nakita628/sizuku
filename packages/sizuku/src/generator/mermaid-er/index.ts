import path from 'node:path'
import { mkdir, writeFile } from '../../shared/fsp/index.js'
import type { MergedSchema } from '../../shared/runtime/types.js'
import { erContent, erContentFromMergedSchema } from './generator/index.js'
import { extractRelationsFromSchema, parseTableInfo } from './validator/index.js'

/**
 * Generate Mermaid ER diagram
 * @param code - The code to generate Mermaid ER diagram from
 * @param output - The output file path
 */
export async function sizukuMermaidER(
  code: string[],
  output: string,
): Promise<
  | {
      ok: true
      value: undefined
    }
  | {
      ok: false
      error: string
    }
> {
  const tables = parseTableInfo(code)
  const relations = extractRelationsFromSchema(code)
  const ERContent = erContent(relations, tables)

  const mkdirResult = await mkdir(path.dirname(output))
  if (!mkdirResult.ok) {
    return {
      ok: false,
      error: mkdirResult.error,
    }
  }
  const writeFileResult = await writeFile(output, ERContent)
  if (!writeFileResult.ok) {
    return {
      ok: false,
      error: writeFileResult.error,
    }
  }
  return {
    ok: true,
    value: undefined,
  }
}

/**
 * Generate Mermaid ER diagram from MergedSchema (runtime-based)
 *
 * This function uses runtime schema information extracted from Drizzle ORM
 * to generate Mermaid ER diagrams. It automatically detects relations from
 * foreign keys and relations() without requiring @relation annotations.
 *
 * @param schema - The merged schema containing runtime and comment information
 * @param output - The output file path
 */
export async function sizukuMermaidERFromMerged(
  schema: MergedSchema,
  output: string,
): Promise<
  | {
      ok: true
      value: undefined
    }
  | {
      ok: false
      error: string
    }
> {
  const ERContent = erContentFromMergedSchema(schema)

  const mkdirResult = await mkdir(path.dirname(output))
  if (!mkdirResult.ok) {
    return {
      ok: false,
      error: mkdirResult.error,
    }
  }
  const writeFileResult = await writeFile(output, ERContent)
  if (!writeFileResult.ok) {
    return {
      ok: false,
      error: writeFileResult.error,
    }
  }
  return {
    ok: true,
    value: undefined,
  }
}
