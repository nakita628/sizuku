import { capitalize, infer } from '../../../utils/index.js'

/**
 * Generates Zod relation schema code from a relation schema AST extraction.
 */
export function relationZodCode(
  schema: {
    name: string
    baseName: string
    fields: { name: string; definition: string; description?: string }[]
  },
  withType: boolean,
): string {
  const base = schema.baseName
  const relName = `${schema.name}Schema`
  const baseSchema = `${capitalize(base)}Schema`
  const fields = schema.fields.map((f) => `${f.name}:${f.definition}`).join(',')
  const obj = `\nexport const ${capitalize(relName)} = z.object({...${baseSchema}.shape,${fields}})`
  if (withType) return `${obj}\n\n${infer(schema.name)}\n`
  return `${obj}`
}
