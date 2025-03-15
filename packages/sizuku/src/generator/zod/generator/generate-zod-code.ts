import type { Schema } from '../../../common/type'
import type { Config } from '../../../common/config'
import { generateZInfer } from './generate-z-infer'
import { generateZodSchema } from './generate-zod-schema'

/**
 * Generates Zod code for a given schema and config.
 *
 * @function generateZodCode
 * @param schema - The schema to generate code for.
 * @param config - The configuration for the code generation.
 * @returns The generated Zod code.
 */
export function generateZodCode(schema: Schema, config: Config): string {
  const zodSchema = generateZodSchema(schema, config)
  const zInfer = generateZInfer(schema, config)
  if (config.type.export) {
    return `${zodSchema}\n\n${zInfer}\n`
  }
  return `${zodSchema}\n`
}
