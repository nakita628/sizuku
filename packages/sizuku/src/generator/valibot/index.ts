import path from 'node:path'
import { fmt } from '../../format/index.js'
import { mkdir, writeFile } from '../../fsp/index.js'
import { extractRelationSchemas, extractSchemas } from '../../helper/extract-schemas.js'
import {
  fieldDefinitions,
  inferInput,
  makeCapitalized,
  makeValibotObject,
} from '../../utils/index.js'

function valibot(
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
  const objectCode = makeValibotObject(inner, wrapperType)
  return `export const ${makeCapitalized(schema.name)}Schema = ${objectCode}`
}

export function valibotCode(
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
  const valibotSchema = valibot(schema, comment)

  if (type) {
    const valibotInfer = inferInput(schema.name)
    return `${valibotSchema}\n\n${valibotInfer}\n`
  }
  return `${valibotSchema}\n`
}

export function relationValibotCode(
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
  const obj = `\nexport const ${makeCapitalized(relName)} = v.${objectType}({...${baseSchema}.entries,${fields}})`
  if (withType) return `${obj}\n\n${inferInput(schema.name)}\n`
  return `${obj}`
}

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
