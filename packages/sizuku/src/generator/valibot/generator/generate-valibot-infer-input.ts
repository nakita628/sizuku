import type { Schema } from '../../../common/type'
import type { Config } from '../../../common/config'
import { getVariableNameHelper } from '../../../common/helper/get-variable-name-helper'
import { getVariableSchemaNameHelper } from '../../../common/helper/get-variable-schema-name-helper'

/**
 * @function generateValibotInferInput
 * @param schema
 * @param config
 * @returns
 */
export function generateValibotInferInput(schema: Schema, config: Config) {
  const typeName = getVariableNameHelper(schema.name, config)
  const schemaName = getVariableSchemaNameHelper(schema.name, config)
  return `export type ${typeName} = v.InferInput<typeof ${schemaName}>`
}
