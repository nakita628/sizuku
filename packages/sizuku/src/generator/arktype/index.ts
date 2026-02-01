import path from 'node:path'
import { fmt } from '../../shared/format/index.js'
import { mkdir, writeFile } from '../../shared/fsp/index.js'
import { extractRelationSchemas, extractSchemas } from '../../shared/helper/extract-schemas.js'
import { arktypeCode } from './generator/arktype-code.js'
import { makeRelationArktypeCode } from './generator/relation-arktype-code.js'

/**
 * Generate ArkType schema
 * @param code - The code to generate ArkType schema from
 * @param output - The output file path
 * @param comment - Whether to include comments in the generated code
 * @param type - Whether to include type information in the generated code
 * @param relation - Whether to include relation schemas in the generated code
 */
export async function sizukuArktype(
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
  const importLine = `import { type } from 'arktype'`

  const baseSchemas = extractSchemas(code, 'arktype')
  const relationSchemas = extractRelationSchemas(code, 'arktype')

  const arktypeGeneratedCode = [
    importLine,
    '',
    ...baseSchemas.map((schema) => arktypeCode(schema, comment ?? false, type ?? false)),
    ...(relation
      ? relationSchemas.map((schema) => makeRelationArktypeCode(schema, type ?? false))
      : []),
  ].join('\n')

  const mkdirResult = await mkdir(path.dirname(output))
  if (!mkdirResult.ok) {
    return {
      ok: false,
      error: mkdirResult.error,
    }
  }
  const fmtResult = await fmt(arktypeGeneratedCode)
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
