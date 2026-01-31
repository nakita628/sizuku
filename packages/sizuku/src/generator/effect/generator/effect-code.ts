import { inferEffect } from '../../../utils/index.js'
import { effect } from './effect.js'

/**
 * Generates Effect code for a given schema and config.
 *
 * @param schema - The schema to generate code for.
 * @param comment - Whether to include comments in the generated code.
 * @param type - Whether to include type information in the generated code.
 * @returns The generated Effect code.
 */
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
