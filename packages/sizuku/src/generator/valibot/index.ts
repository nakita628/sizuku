#!/usr/bin/env node

import type { Config } from '../../common/config'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { extractSchemas } from './core/extract-schema'
import { formatCode } from '../../common/format'
import { getConfig } from './config'
import { argv } from 'node:process'
import { generateValibotCode } from './generator/generate-valibot-code'
const IMPORT_VALIBOT = 'import * as v from "valibot"' as const

export async function main(dev = false, config: Config = getConfig()) {
  // 1. argv ['**/bin/node', ''/workspaces/sizuku-test/packages/sizuku/dist/generator/zod/index.js',', 'db/schema.ts', '-o', 'zod/index.ts']
  if (config.output === undefined && !argv.includes('-o')) {
    console.error('Error: -o is not found')
    return false
  }
  // 2. slice ['db/schema.ts', '-o', 'zod/index.ts']
  const args = process.argv.slice(2)
  // 3. input = args[0] = 'db/schema.ts'
  const input = config.input ?? args[0]
  config.input = input
  // 4. output = 'zod/index.ts'
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

    // 9. extract schemas
    const schemas = extractSchemas(lines.slice(codeStart))
    // 10. generate zod code
    const generatedCode = [
      IMPORT_VALIBOT,
      '',
      ...schemas.map((schema) => generateValibotCode(schema, config)),
    ].join('\n')

    // 11. format code

    const code = await formatCode(generatedCode)

    // 12. write to output file
    writeFileSync(output, code)
    console.log(`Generated Valibot schema at: ${output}`)
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
