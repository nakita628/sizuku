import path from 'node:path'
import { fmt } from '../../shared/format/index.js'
import { mkdir, writeFile } from '../../shared/fsp/index.js'
import { extractRelationSchemas, extractSchemas } from '../../shared/helper/extract-schemas.js'
import { relationValibotCode } from './generator/relation-valibot-code.js'
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
  relation?: boolean,
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
  const baseSchemas = extractSchemas(code, 'valibot')
  const relationSchemas = extractRelationSchemas(code, 'valibot')

  const valibotGeneratedCode = [
    "import * as v from 'valibot'",
    '',
    ...baseSchemas.map((schema) => valibotCode(schema, comment ?? false, type ?? false)),
    ...(relation
      ? relationSchemas.map((schema) => relationValibotCode(schema, type ?? false))
      : []),
  ].join('\n')

  const mkdirResult = await mkdir(path.dirname(output))
  if (!mkdirResult.ok) {
    return {
      ok: false,
      error: mkdirResult.error,
    }
  }
  const fmtResult = await fmt(valibotGeneratedCode)
  if (!fmtResult.ok) {
    return {
      ok: false,
      error: fmtResult.error,
    }
  }
  const writeFileResult = await writeFile(output, fmtResult.value)
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
