import { inferArktype } from '../../../utils/index.js'
import { arktype } from './arktype.js'

/**
 * Generates ArkType code for a given schema and config.
 *
 * @param schema - The schema to generate code for.
 * @param comment - Whether to include comments in the generated code.
 * @param type - Whether to include type information in the generated code.
 * @returns The generated ArkType code.
 */
export function arktypeCode(
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
  const arktypeSchema = arktype(schema, comment)
  if (type) {
    const arktypeInfer = inferArktype(schema.name)
    return `${arktypeSchema}\n\n${arktypeInfer}\n`
  }
  return `${arktypeSchema}\n`
}
