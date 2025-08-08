import { schemaName } from '../../../shared/utils/index.js'
import { inferInput } from './infer-input.js'

/**
 * Generates Valibot relation schema code from a relation schema AST extraction.
 */
export function relationValibotCode(
  schema: {
    name: string
    baseName: string
    fields: { name: string; definition: string; description?: string }[]
  },
  withType: boolean,
): string {
  const base = schema.baseName
  const relName = schemaName(schema.name)
  const baseSchema = schemaName(base)
  const fields = schema.fields.map((f) => `${f.name}:${f.definition}`).join(',')
  const obj = `export const ${relName} = v.object({...${baseSchema}.entries,${fields}})`
  if (withType) return `${obj}\n\n${inferInput(schema.name)}`
  return `${obj}`
}
