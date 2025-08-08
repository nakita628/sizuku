import path from 'node:path'
import { mkdir, writeFile } from '../../shared/fsp/index.js'
import { extractRelations } from '../../utils/index.js'
import { erContent } from './generator/index.js'
import { parseTableInfo } from './validator/index.js'

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
