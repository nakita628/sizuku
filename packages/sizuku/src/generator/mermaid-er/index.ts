import path from 'node:path'
import { mkdir, writeFile } from '../../shared/fsp/index.js'
import { extractRelations } from '../../shared/helper/extract-schemas.js'
import { erContent } from './generator/index.js'
import { parseTableInfo } from './validator/index.js'

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
  const relations = extractRelations(code)
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
