import { infer } from '../../../utils/index.js'
import { zod } from './zod.js'

/**
 * Generates Zod code for a given schema and config.
 *
 * @param schema - The schema to generate code for.
 * @param comment - Whether to include comments in the generated code.
 * @param type - Whether to include type information in the generated code.
 * @returns The generated Zod code.
 */
export function zodCode(
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
  const zodSchema = zod(schema, comment)
  if (type) {
    const zInfer = infer(schema.name)
    return `${zodSchema}\n\n${zInfer}\n`
  }
  return `${zodSchema}\n`
}
