import path from 'node:path'
import { fmt } from '../../shared/format/index.js'
import { mkdir, writeFile } from '../../shared/fsp/index.js'
import { extractRelationSchemas, extractSchemas } from '../../shared/helper/extract-schemas.js'
import { effectCode } from './generator/effect-code.js'
import { makeRelationEffectCode } from './generator/relation-effect-code.js'

/**
 * Generate Effect schema
 * @param code - The code to generate Effect schema from
 * @param output - The output file path
 * @param comment - Whether to include comments in the generated code
 * @param type - Whether to include type information in the generated code
 * @param relation - Whether to include relation schemas in the generated code
 */
export async function sizukuEffect(
  code: string[],
  output: `${string}.ts`,
  comment?: boolean,
  type?: boolean,
  relation?: boolean,
): Promise<
  | {
      readonly ok: true
      readonly value: undefined
    }
  | {
      readonly ok: false
      readonly error: string
    }
> {
  const importLine = `import { Schema } from 'effect'`

  const baseSchemas = extractSchemas(code, 'effect')
  const relationSchemas = extractRelationSchemas(code, 'effect')

  const effectGeneratedCode = [
    importLine,
    '',
    ...baseSchemas.map((schema) => effectCode(schema, comment ?? false, type ?? false)),
    ...(relation
      ? relationSchemas.map((schema) => makeRelationEffectCode(schema, type ?? false))
      : []),
  ].join('\n')

  const mkdirResult = await mkdir(path.dirname(output))
  if (!mkdirResult.ok) {
    return {
      ok: false,
      error: mkdirResult.error,
    }
  }
  const fmtResult = await fmt(effectGeneratedCode)
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
