#!/usr/bin/env node

import type { Config } from './config'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { generateERContent } from './generator/generate-er-content'
import { parseTableInfo } from './validator/parse-table-info'
import { extractRelations } from './core/extract-relations'
import { getConfig } from './config'
import { argv } from 'node:process'

// ER diagram header
export const ER_HEADER = ['```mermaid', 'erDiagram'] as const

// ER diagram footer
export const ER_FOOTER = ['```'] as const

export async function main(dev = false, config: Config = getConfig()) {
  // 1. argv ['**/bin/node', '**/dist/src/generator/mermaid-er/index.js', 'db/schema.ts', '-o', 'mermaid-er/ER.md']
  if (config.output === undefined && !argv.includes('-o')) {
    console.error('Error: -o is not found')
    return false
  }
  // 2. slice [ 'db/schema.ts', '-o', 'mermaid-er/ER.md']
  const args = process.argv.slice(2)
  // 3. input = args[0] = 'db/schema.ts'
  const input = config.input ?? args[0]
  config.input = input
  // 4. output = 'mermaid-er/ER.md'
  const output = config.output ?? args[args.indexOf('-o') + 1]
  config.output = output

  try {
    // 5. read db/schema.ts
    const content = readFileSync(input, 'utf-8')
    // 6. split lines
    const lines = content.split('\n')
    // 7. create output directory
    const outputDir = path.dirname(output)
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true })
    }

    // 8. skip import section
    const codeStart = lines.findIndex(
      (line) => !line.trim().startsWith('import') && line.trim() !== '',
    )
    // 9. parse table info
    const tables = parseTableInfo(lines.slice(codeStart))

    // 10. extract relations
    const relations = extractRelations(lines.slice(codeStart))
    // 11. generate ER content
    const ERContent = generateERContent(relations, tables)
    // 12. write ER content to output file
    writeFileSync(output, ERContent)
    console.log(`Generated ER at: ${output}`)
    return true
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message)
      if (dev) {
        throw e
      }
      process.exit(1)
    }
    if (dev) {
      throw new Error('Unknown error occurred')
    }
    return false
  }
}

if (require.main === module) {
  main().then((success) => {
    if (!success) {
      process.exit(1)
    }
  })
}
