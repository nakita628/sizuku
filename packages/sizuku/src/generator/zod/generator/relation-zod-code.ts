import { schemaName } from '../../../shared/utils/index.js'
import { infer } from './infer.js'

/**
 * Generates Zod relation schema code from a relation schema AST extraction.
 */
export function relationZodCode(
  schema: {
    name: string
    fields: { name: string; definition: string; description?: string }[]
  },
  withType: boolean,
): string {
    console.log(schema)
  const base = schema.name.replace(/Relations$/, '')
  const relName = schemaName(schema.name)
  const baseSchema = schemaName(base)
  const fields = schema.fields.map((f) => `${f.name}:${f.definition}`).join(',')
  const obj = `export const ${relName} = z.object({...${baseSchema}.shape,${fields}})`
  if (withType) return `${obj}${infer(schema.name)}`
  return `${obj}`
}
