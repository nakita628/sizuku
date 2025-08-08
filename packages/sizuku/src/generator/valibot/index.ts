import path from 'node:path'
import type { Result } from 'neverthrow'
import { fmt } from '../../shared/format/index.js'
import { mkdir, writeFile } from '../../shared/fsp/index.js'
import { extractRelationSchemas, extractSchemas } from '../../shared/helper/extract-schemas.js'
import { valibotCode } from './generator/valibot-code.js'
import { relationValibotCode } from './generator/relation-valibot-code.js'

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
  relations?: boolean,
): Promise<Result<void, Error>> {
  const baseSchemas = extractSchemas(code, 'valibot')
  const relationSchemas = extractRelationSchemas(code, 'valibot')

  const valibotGeneratedCode = [
    "import * as v from 'valibot'",
    '',
    ...baseSchemas.map((schema) => valibotCode(schema, comment ?? false, type ?? false)),
    ...(relations
      ? relationSchemas.map((schema) => relationValibotCode(schema, type ?? false))
      : []),
  ].join('\n')

  return await mkdir(path.dirname(output))
    .andThen(() => fmt(valibotGeneratedCode))
    .andThen((formatted) => writeFile(output, formatted))
}
