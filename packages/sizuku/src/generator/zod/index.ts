import path from 'node:path'
import type { Result } from 'neverthrow'
import { fmt } from '../../shared/format/index.js'
import { mkdir, writeFile } from '../../shared/fsp/index.js'
import { extractZodSchemas } from '../../shared/helper/extract-schemas.js'
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
): Promise<Result<void, Error>> {
  const importLine =
    zod === 'mini'
      ? `import * as z from 'zod/mini'`
      : zod === '@hono/zod-openapi'
        ? `import { z } from '@hono/zod-openapi'`
        : `import * as z from 'zod'`

  const zodGeneratedCode = [
    importLine,
    '',
    ...extractZodSchemas(code).map((schema) => zodCode(schema, comment ?? false, type ?? false)),
  ].join('\n')

  return await mkdir(path.dirname(output))
    .andThen(() => fmt(zodGeneratedCode))
    .andThen((formatted) => writeFile(output, formatted))
}
