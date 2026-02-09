import path from 'node:path'
import { fmt } from '../../format/index.js'
import { mkdir, writeFile } from '../../fsp/index.js'
import { extractRelationSchemas, extractSchemas } from '../../helper/extract-schemas.js'
import { fieldDefinitions, inferEffect, makeCapitalized } from '../../utils/index.js'

function effect(
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
  const inner = fieldDefinitions(schema, comment)
  return `export const ${makeCapitalized(schema.name)}Schema = Schema.Struct({${inner}})`
}

export function effectCode(
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
  const effectSchema = effect(schema, comment)
  if (type) {
    const effectInfer = inferEffect(schema.name)
    return `${effectSchema}\n\n${effectInfer}\n`
  }
  return `${effectSchema}\n`
}

export function makeRelationEffectCode(
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
  const obj = `\nexport const ${makeCapitalized(relName)} = Schema.Struct({...${baseSchema}.fields,${fields}})`
  if (withType) return `${obj}\n\n${inferEffect(schema.name)}\n`
  return `${obj}`
}

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
