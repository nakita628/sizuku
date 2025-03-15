import type { Schema } from '../../../common/type'
import type { Config } from '../../../common/config'
import { generateValibotInferInput } from './generate-valibot-infer-input'
import { generateValibotSchema } from './generate-valibot-schema'

/**
 * Generates Valibot code for a given schema and config.
 *
 * @function generateValibotCode
 * @param schema - The schema to generate code for.
 * @param config - The configuration for the code generation.
 * @returns The generated Valibot code.
 */
export function generateValibotCode(schema: Schema, config: Config): string {
  const valibotSchema = generateValibotSchema(schema, config)

  const valibotInfer = generateValibotInferInput(schema, config)
  if (config.type.export) {
    return `${valibotSchema}\n\n${valibotInfer}\n`
  }
  return `${valibotSchema}\n`
}
