import { fmt } from '../../shared/format/index.js'
import { extractSchemas } from './core/extract-schema.js'
import { zodCode } from './generator/zod-code.js'
import fsp from 'node:fs/promises'

const ZODV4_IMPORT = `import { z } from 'zod/v4'` as const
const ZODV4_MINI_IMPORT = `import { z } from 'zod/v4-mini'` as const
const ZOD_OPENAPI_HONO_IMPORT = `import { z } from '@hono/zod-openapi'` as const

export async function sizukuZod(
  code: string[],
  output: `${string}.ts`,
  comment?: boolean,
  type?: boolean,
  zod?: 'v4' | 'v4-mini' | '@hono/zod-openapi',
) {
  const zodSchemas = extractSchemas(code)
  const importStatement =
    zod === 'v4-mini'
      ? ZODV4_MINI_IMPORT
      : zod === '@hono/zod-openapi'
        ? ZOD_OPENAPI_HONO_IMPORT
        : ZODV4_IMPORT

  const zodGeneratedCode = [
    importStatement,
    '',
    ...zodSchemas.map((schema) => zodCode(schema, comment ?? false, type ?? false)),
  ].join('\n')

  await fsp.writeFile(output, await fmt(zodGeneratedCode))
  console.log(`Generated Zod schema at: ${output}`)
}
