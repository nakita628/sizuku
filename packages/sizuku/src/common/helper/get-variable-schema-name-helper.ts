import type { Config } from '../config'
import { getCamelCaseSchemaNameHelper } from './get-camel-case-schema-name-helper'
import { getPascalCaseSchemaNameHelper } from './get-pascal-case-schema-name-helper'

/**
 * Get the variable schema name helper
 *
 * @param name - The name of the schema
 * @param config - The config
 * @returns The variable schema name helper
 */
export function getVariableSchemaNameHelper(name: string, config: Config) {
  return config.schema.name === 'camelCase'
    ? getCamelCaseSchemaNameHelper(name)
    : getPascalCaseSchemaNameHelper(name)
}
