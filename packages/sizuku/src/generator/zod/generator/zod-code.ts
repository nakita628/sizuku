import type { Schema } from '../../../shared/types.js'
import { infer } from './infer.js'
import { zod } from './zod.js'

/**
 * Generates Zod code for a given schema and config.
 *
 * @function generateZodCode
 * @param schema - The schema to generate code for.
 * @param config - The configuration for the code generation.
 * @returns The generated Zod code.
 */
export function zodCode(schema: Schema, comment: boolean, type: boolean): string {
  const zodSchema = zod(schema, comment)
  if (type) {
    const zInfer = infer(schema.name)
    return `${zodSchema}\n\n${zInfer}\n`
  }
  return `${zodSchema}\n`
}
