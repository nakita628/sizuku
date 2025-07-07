import path from 'node:path'
import { extractSchemas } from './core/extract-schema.js'
import { valibotCode } from './generator/valibot-code.js'
import { fmt } from '../../shared/format/index.js'
import { mkdir, writeFile } from '../../shared/fsp/index.js'
import type { Result } from 'neverthrow'

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
): Promise<Result<void, Error>> {
  const valibotGeneratedCode = [
    'import * as v from "valibot"' as const,
    '',
    ...extractSchemas(code).map((schema) => valibotCode(schema, comment ?? false, type ?? false)),
  ].join('\n')

  return await mkdir(path.dirname(output))
    .andThen(() => fmt(valibotGeneratedCode))
    .andThen((formatted) => writeFile(output, formatted))
}
