import path from 'node:path'
import fsp from 'node:fs/promises'
import { fmt } from '../../shared/format/index.js'
import { extractSchemas } from './core/extract-schema.js'
import { valibotCode } from './generator/valibot-code.js'

/**
 * Generate Valibot schema
 * @param code - The code to generate Valibot schema from
 * @param output - The output file path
 * @param comment - Whether to include comments in the generated code
 * @param type - Whether to include type information in the generated code
 */
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
}
