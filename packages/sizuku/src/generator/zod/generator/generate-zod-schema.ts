import type { Schema } from '../../../common/type'
import type { Config } from '../../../common/config'
import { getVariableSchemaNameHelper } from '../../../common/helper/get-variable-schema-name-helper'
import { generateFieldDefinitions } from '../../../common/generator/generate-field-definitions'

/**
 * Generates a Zod schema for a given schema and config.
 *
 * @function generateZodSchema
 * @param schema - The schema to generate code for.
 * @param config - The configuration for the code generation.
 * @returns The generated Zod schema.
 */
export function generateZodSchema(schema: Schema, config: Config) {
  const schemaName = getVariableSchemaNameHelper(schema.name, config)
  return `export const ${schemaName} = z.object({${generateFieldDefinitions(schema, config)}})`
}
