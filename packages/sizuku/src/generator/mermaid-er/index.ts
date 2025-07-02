import { extractRelations } from './core/extract-relations.js'
import { erContent } from './generator/index.js'
import { parseTableInfo } from './validator/parse-table-info.js'
import fsp from 'node:fs/promises'

export async function sizukuMermaidER(code: string[], output: string) {
  const tables = parseTableInfo(code)
  const relations = extractRelations(code)
  const ERContent = erContent(relations, tables)

  await fsp.writeFile(output, ERContent)
  console.log(`Generated ER at: ${output}`)
}
