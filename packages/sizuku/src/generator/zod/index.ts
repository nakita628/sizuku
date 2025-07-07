import { Result, ok, err } from 'neverthrow'
import { fmt } from '../../shared/format/index.js'
import { extractSchemas } from './core/extract-schema.js'
import { zodCode } from './generator/zod-code.js'
import { safeWriteFileAsync, type FileError } from '../../shared/utils/file.js'
import { tryCatchAsync } from '../../shared/utils/functional.js'

const ZODV4_IMPORT = `import { z } from 'zod/v4'` as const
const ZODV4_MINI_IMPORT = `import { z } from 'zod/v4-mini'` as const
const ZOD_OPENAPI_HONO_IMPORT = `import { z } from '@hono/zod-openapi'` as const

export type ZodGeneratorError = 
  | FileError
  | { type: 'SCHEMA_EXTRACTION_ERROR'; message: string }
  | { type: 'CODE_GENERATION_ERROR'; message: string }
  | { type: 'FORMAT_ERROR'; message: string }

/**
 * Pure function to get import statement
 */
export function getImportStatement(zodType?: 'v4' | 'v4-mini' | '@hono/zod-openapi'): string {
  switch (zodType) {
    case 'v4-mini':
      return ZODV4_MINI_IMPORT
    case '@hono/zod-openapi':
      return ZOD_OPENAPI_HONO_IMPORT
    default:
      return ZODV4_IMPORT
  }
}

/**
 * Pure function to generate Zod code from schema
 */
export async function generateZodCode(
  code: string[],
  comment: boolean = false,
  type: boolean = false
): Promise<Result<string[], ZodGeneratorError>> {
  return tryCatchAsync(
    async () => {
      const zodSchemas = extractSchemas(code)
      return zodSchemas.map((schema) => zodCode(schema, comment, type))
    },
    (error) => ({
      type: 'SCHEMA_EXTRACTION_ERROR' as const,
      message: `Failed to extract schemas: ${error}`,
    })
  )
}

/**
 * Format Zod code
 */
export async function formatZodCode(
  codeLines: string[],
  importStatement: string
): Promise<Result<string, ZodGeneratorError>> {
  const zodGeneratedCode = [
    importStatement,
    '',
    ...codeLines,
  ].join('\n')

  return tryCatchAsync(
    () => fmt(zodGeneratedCode),
    (error) => ({
      type: 'FORMAT_ERROR' as const,
      message: `Failed to format code: ${error}`,
    })
  )
}

/**
 * Functional implementation to generate Zod schema
 */
export async function generateZodSchemaFile(
  code: string[],
  output: `${string}.ts`,
  comment?: boolean,
  type?: boolean,
  zodType?: 'v4' | 'v4-mini' | '@hono/zod-openapi'
): Promise<Result<void, ZodGeneratorError>> {
  const importStatement = getImportStatement(zodType)
  
  const codeResult = await generateZodCode(code, comment, type)
  if (codeResult.isErr()) {
    return err(codeResult.error)
  }
  
  const formattedResult = await formatZodCode(codeResult.value, importStatement)
  if (formattedResult.isErr()) {
    return err(formattedResult.error)
  }
  
  return safeWriteFileAsync(output, formattedResult.value)
}

/**
 * Function for backward compatibility (deprecated)
 * @deprecated Use generateZodSchemaFile instead
 */
export async function sizukuZod(
  code: string[],
  output: `${string}.ts`,
  comment?: boolean,
  type?: boolean,
  zod?: 'v4' | 'v4-mini' | '@hono/zod-openapi',
): Promise<void> {
  const result = await generateZodSchemaFile(code, output, comment, type, zod)
  if (result.isErr()) {
    throw new Error(result.error.message)
  }
}
