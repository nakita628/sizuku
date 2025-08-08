import path from 'node:path'
import { fmt } from '../../shared/format/index.js'
import { mkdir, writeFile } from '../../shared/fsp/index.js'
import { extractRelationSchemas, extractSchemas } from '../../shared/helper/extract-schemas.js'
import { relationZodCode } from './generator/relation-zod-code.js'
import { zodCode } from './generator/zod-code.js'

/**
 * Generate Zod schema
 * @param code - The code to generate Zod schema from
 * @param output - The output file path
 * @param comment - Whether to include comments in the generated code
 * @param type - Whether to include type information in the generated code
 * @param zod - The Zod version to use
 */
export async function sizukuZod(
  code: string[],
  output: `${string}.ts`,
  comment?: boolean,
  type?: boolean,
  zod?: 'v4' | 'mini' | '@hono/zod-openapi',
  relations?: boolean,
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
  const importLine =
    zod === 'mini'
      ? `import * as z from 'zod/mini'`
      : zod === '@hono/zod-openapi'
        ? `import { z } from '@hono/zod-openapi'`
        : `import * as z from 'zod'`

  const baseSchemas = extractSchemas(code, 'zod')
  const relationSchemas = extractRelationSchemas(code, 'zod')

  const zodGeneratedCode = [
    importLine,
    '',
    ...baseSchemas.map((schema) => zodCode(schema, comment ?? false, type ?? false)),
    ...(relations ? relationSchemas.map((schema) => relationZodCode(schema, type ?? false)) : []),
  ].join('\n')

  const mkdirResult = await mkdir(path.dirname(output))
  if (!mkdirResult.ok) {
    return {
      ok: false,
      error: mkdirResult.error,
    }
  }
  const fmtResult = await fmt(zodGeneratedCode)
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
