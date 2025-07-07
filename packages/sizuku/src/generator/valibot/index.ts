import { Result, ok, err } from 'neverthrow'
import { fmt } from '../../shared/format/index.js'
import { extractSchemas } from './core/extract-schema.js'
import { valibotCode } from './generator/valibot-code.js'
import { safeWriteFileAsync, type FileError } from '../../shared/utils/file.js'
import { tryCatchAsync } from '../../shared/utils/functional.js'

export type ValibotGeneratorError = 
  | FileError
  | { type: 'SCHEMA_EXTRACTION_ERROR'; message: string }
  | { type: 'CODE_GENERATION_ERROR'; message: string }
  | { type: 'FORMAT_ERROR'; message: string }

const IMPORT_VALIBOT = 'import * as v from "valibot"' as const

/**
 * Pure function to generate Valibot code from schema
 */
export async function generateValibotCode(
  code: string[],
  comment: boolean = false,
  type: boolean = false
): Promise<Result<string[], ValibotGeneratorError>> {
  return tryCatchAsync(
    async () => {
      const schemas = extractSchemas(code)
      return schemas.map((schema) => valibotCode(schema, comment, type))
    },
    (error) => ({
      type: 'SCHEMA_EXTRACTION_ERROR' as const,
      message: `Failed to extract schemas: ${error}`,
    })
  )
}

/**
 * Format Valibot code
 */
export async function formatValibotCode(
  codeLines: string[]
): Promise<Result<string, ValibotGeneratorError>> {
  const valibotGeneratedCode = [
    IMPORT_VALIBOT,
    '',
    ...codeLines,
  ].join('\n')

  return tryCatchAsync(
    () => fmt(valibotGeneratedCode),
    (error) => ({
      type: 'FORMAT_ERROR' as const,
      message: `Failed to format code: ${error}`,
    })
  )
}

/**
 * Functional implementation to generate Valibot schema
 */
export async function generateValibotSchemaFile(
  code: string[],
  output: `${string}.ts`,
  comment?: boolean,
  type?: boolean
): Promise<Result<void, ValibotGeneratorError>> {
  const codeResult = await generateValibotCode(code, comment, type)
  if (codeResult.isErr()) {
    return err(codeResult.error)
  }
  
  const formattedResult = await formatValibotCode(codeResult.value)
  if (formattedResult.isErr()) {
    return err(formattedResult.error)
  }
  
  return safeWriteFileAsync(output, formattedResult.value)
}

/**
 * Function for backward compatibility (deprecated)
 * @deprecated Use generateValibotSchemaFile instead
 */
export async function sizukuValibot(
  code: string[],
  output: `${string}.ts`,
  comment?: boolean,
  type?: boolean,
): Promise<void> {
  const result = await generateValibotSchemaFile(code, output, comment, type)
  if (result.isErr()) {
    throw new Error(result.error.message)
  }
}
