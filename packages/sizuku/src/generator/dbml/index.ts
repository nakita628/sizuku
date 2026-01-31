import path from 'node:path'
import { mkdir, writeFile } from '../../shared/fsp/index.js'
import { extractRelationsFromSchema, parseTableInfo } from '../mermaid-er/validator/index.js'
import { dbmlContent } from './generator/index.js'

/**
 * Generate DBML schema from Drizzle schema code
 *
 * @param code - The code to generate DBML from
 * @param output - The output file path
 */
export async function sizukuDBML(
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
  const content = dbmlContent(relations, tables)

  const mkdirResult = await mkdir(path.dirname(output))
  if (!mkdirResult.ok) {
    return {
      ok: false,
      error: mkdirResult.error,
    }
  }
  const writeFileResult = await writeFile(output, content)
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
