import type { Schema } from '../../../common/type'
import type { Config } from '../../../common/config'
import { generateFieldDefinitions } from '../../../common/generator/generate-field-definitions'
import { getVariableSchemaNameHelper } from '../../../common/helper/get-variable-schema-name-helper'

/**
 * @function generateValibotSchema
 * @param schema
 * @param config
 * @returns
 */
export function generateValibotSchema(schema: Schema, config: Config) {
  const schemaName = getVariableSchemaNameHelper(schema.name, config)
  const res = generateFieldDefinitions(schema, config)
  return `export const ${schemaName} = v.object({${res}})`
}
