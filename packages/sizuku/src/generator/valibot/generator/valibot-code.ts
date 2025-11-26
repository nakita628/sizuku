import { inferInput } from '../../../utils/index.js'
import { valibot } from './valibot.js'

/**
 * Generates Valibot code for a given schema and config.
 *
 * @param schema - The schema to generate code for.
 * @param comment - Whether to include comments in the generated code.
 * @param type - Whether to include type information in the generated code.
 * @returns The generated Valibot code.
 */
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
