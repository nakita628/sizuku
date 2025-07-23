import path from 'node:path'
import type { Result } from 'neverthrow'
import { fmt } from '../../shared/format/index.js'
import { mkdir, writeFile } from '../../shared/fsp/index.js'
import { extractSchemas } from './core/extract-schema.js'
import { zodCode } from './generator/zod-code.js'

const ZODV4_IMPORT = `import { z } from 'zod/v4'` as const
const ZODV4_MINI_IMPORT = `import { z } from 'zod/v4-mini'` as const
const ZOD_OPENAPI_HONO_IMPORT = `import { z } from '@hono/zod-openapi'` as const

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
  zod?: 'v4' | 'v4-mini' | '@hono/zod-openapi',
): Promise<Result<void, Error>> {
  const zodGeneratedCode = [
    zod === 'v4-mini'
      ? ZODV4_MINI_IMPORT
      : zod === '@hono/zod-openapi'
        ? ZOD_OPENAPI_HONO_IMPORT
        : ZODV4_IMPORT,
    '',
    ...extractSchemas(code).map((schema) => zodCode(schema, comment ?? false, type ?? false)),
  ].join('\n')

  return await mkdir(path.dirname(output))
    .andThen(() => fmt(zodGeneratedCode))
    .andThen((formatted) => writeFile(output, formatted))
}
