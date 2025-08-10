import { capitalize, inferInput } from '../../../utils/index.js'

/**
 * Generates Valibot relation schema code from a relation schema AST extraction.
 */
export function relationValibotCode(
  schema: {
    name: string
    baseName: string
    fields: { name: string; definition: string; description?: string }[]
    objectType?: 'strict' | 'loose'
  },
  withType: boolean,
): string {
  const base = schema.baseName
  const relName = `${schema.name}Schema`
  const baseSchema = `${capitalize(base)}Schema`
  const fields = schema.fields.map((f) => `${f.name}:${f.definition}`).join(',')
  
  const objectType = schema.objectType === 'strict' ? 'strictObject' : 
                    schema.objectType === 'loose' ? 'looseObject' : 'object'
  
  const obj = `\nexport const ${capitalize(relName)} = v.${objectType}({...${baseSchema}.entries,${fields}})`
  if (withType) return `${obj}\n\n${inferInput(schema.name)}\n`
  return `${obj}`
}
