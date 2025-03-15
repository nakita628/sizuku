import type { Schema } from '../../../common/type'
import type { Config } from '../../../common/config'
import { getVariableNameHelper } from '../../../common/helper/get-variable-name-helper'
import { getVariableSchemaNameHelper } from '../../../common/helper/get-variable-schema-name-helper'

/**
 * Generates a Zod infer type for a given schema and config.
 *
 * @function generateZInfer
 * @param schema - The schema to generate code for.
 * @param config - The configuration for the code generation.
 * @returns The generated Zod infer type.
 */
export function generateZInfer(schema: Schema, config: Config) {
  const typeName = getVariableNameHelper(schema.name, config)
  const schemaName = getVariableSchemaNameHelper(schema.name, config)
  return `export type ${typeName} = z.infer<typeof ${schemaName}>`
}
