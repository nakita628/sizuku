import type { Config } from '../config'
import { capitalize } from '../text/capitalize'
import { decapitalize } from '../text/decapitalize'

/**
 * Get the variable name helper
 *
 * @param name - The name of the schema
 * @param config - The config
 * @returns The variable name helper
 */
export function getVariableNameHelper(name: string, config: Config) {
  return config.type.name === 'camelCase' ? decapitalize(name) : capitalize(name)
}
