import { mkdir, writeFile } from '../../shared/fsp/index.js'
import { extractRelations } from './core/extract-relations.js'
import { erContent } from './generator/index.js'
import { parseTableInfo } from './validator/parse-table-info.js'
import path from 'node:path'

/**
 * Generate Mermaid ER diagram
 * @param code - The code to generate Mermaid ER diagram from
 * @param output - The output file path
 */
export async function sizukuMermaidER(code: string[], output: string) {
  const tables = parseTableInfo(code)
  const relations = extractRelations(code)
  const ERContent = erContent(relations, tables)

  return await mkdir(path.dirname(output)).andThen(() => writeFile(output, ERContent))
}
