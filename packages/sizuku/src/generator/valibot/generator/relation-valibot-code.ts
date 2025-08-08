import { schemaName } from '../../../shared/utils/index.js'
import { inferInput } from './infer-input.js'

/**
 * Generates Valibot relation schema code from a relation schema AST extraction.
 */
export function relationValibotCode(
  schema: {
    name: string
    fields: { name: string; definition: string; description?: string }[]
  },
  withType: boolean,
): string {
  const base = schema.name.replace(/Relations$/, '')
  const relName = schemaName(schema.name)
  const baseSchema = schemaName(base)
  const fields = schema.fields.map((f) => `${f.name}:${f.definition}`).join(',')
  const obj = `export const ${relName} = v.object({...${baseSchema}.entries,${fields}})`
  if (withType) return `${obj}${inferInput(schema.name)}`
  return `${obj}`
}
