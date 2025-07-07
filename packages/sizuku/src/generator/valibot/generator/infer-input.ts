import { capitalize } from '../../../shared/utils/capitalize.js'

/**
 * @param name
 * @returns
 */
export function inferInput(name: string) {
  return `export type ${capitalize(name)} = v.InferInput<typeof ${capitalize(name)}Schema>`
}
