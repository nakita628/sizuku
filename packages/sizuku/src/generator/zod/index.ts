import path from 'node:path'
import { fmt } from '../../format/index.js'
import { mkdir, writeFile } from '../../fsp/index.js'
import { extractRelationSchemas, extractSchemas } from '../../helper/extract-schemas.js'
import { fieldDefinitions, infer, makeCapitalized, makeZodObject } from '../../utils/index.js'

function zod(
  schema: {
    readonly name: string
    readonly fields: {
      readonly name: string
      readonly definition: string
      readonly description?: string
    }[]
    readonly objectType?: 'strict' | 'loose'
  },
  comment: boolean,
): string {
  const wrapperType =
    schema.objectType === 'strict'
      ? 'strictObject'
      : schema.objectType === 'loose'
        ? 'looseObject'
        : 'object'
  const inner = fieldDefinitions(schema, comment)
  const objectCode = makeZodObject(inner, wrapperType)
  return `export const ${makeCapitalized(schema.name)}Schema = ${objectCode}`
}

export function zodCode(
  schema: {
    readonly name: string
    readonly fields: {
      readonly name: string
      readonly definition: string
      readonly description?: string
    }[]
    readonly objectType?: 'strict' | 'loose'
  },
  comment: boolean,
  type: boolean,
): string {
  const zodSchema = zod(schema, comment)
  if (type) {
    const zInfer = infer(schema.name)
    return `${zodSchema}\n\n${zInfer}\n`
  }
  return `${zodSchema}\n`
}

export function relationZodCode(
  schema: {
    readonly name: string
    readonly baseName: string
    readonly fields: {
      readonly name: string
      readonly definition: string
      readonly description?: string
    }[]
    readonly objectType?: 'strict' | 'loose'
  },
  withType: boolean,
): string {
  const base = schema.baseName
  const relName = `${schema.name}Schema`
  const baseSchema = `${makeCapitalized(base)}Schema`
  const fields = schema.fields.map((f) => `${f.name}:${f.definition}`).join(',')
  const objectType =
    schema.objectType === 'strict'
      ? 'strictObject'
      : schema.objectType === 'loose'
        ? 'looseObject'
        : 'object'
  const obj = `\nexport const ${makeCapitalized(relName)} = z.${objectType}({...${baseSchema}.shape,${fields}})`
  if (withType) return `${obj}\n\n${infer(schema.name)}\n`
  return `${obj}`
}

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
    ...(relation ? relationSchemas.map((schema) => relationZodCode(schema, type ?? false)) : []),
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
