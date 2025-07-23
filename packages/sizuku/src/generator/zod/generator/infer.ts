import { capitalize } from "../../../shared/utils/index.js";

/**
 * @param name
 * @returns
 */
export function infer(name: string) {
  return `export type ${capitalize(name)} = z.infer<typeof ${capitalize(name)}Schema>`
}
