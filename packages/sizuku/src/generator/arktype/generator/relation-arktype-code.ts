import { inferArktype, makeCapitalized } from '../../../utils/index.js'

/**
 * Make ArkType relation schema code from a relation schema AST extraction.
 *
 * @param schema - The relation schema to generate code for.
 * @param withType - Whether to include type definition.
 * @returns The generated ArkType relation schema code.
 */
export function makeRelationArktypeCode(
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
  const obj = `\nexport const ${makeCapitalized(relName)} = type({...${baseSchema}.t,${fields}})`
  if (withType) return `${obj}\n\n${inferArktype(schema.name)}\n`
  return `${obj}`
}
