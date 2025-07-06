import path from 'node:path'
import fsp from 'node:fs/promises'
import { fmt } from '../../shared/format/index.js'
import { extractSchemas } from './core/extract-schema.js'
import { valibotCode } from './generator/valibot-code.js'


export async function sizukuValibot(
  code: string[],
  output: `${string}.ts`,
  comment?: boolean,
  type?: boolean,
) {
  const schemas = extractSchemas(code)
  const IMPORT_VALIBOT = 'import * as v from "valibot"' as const

  const valibotGeneratedCode = [
    IMPORT_VALIBOT,
    '',
    ...schemas.map((schema) => valibotCode(schema, comment ?? false, type ?? false)),
  ].join('\n')

  await fsp.mkdir(path.dirname(output), { recursive: true })
  await fsp.writeFile(output, await fmt(valibotGeneratedCode))
  console.log(`Generated Valibot schema at: ${output}`)
}
