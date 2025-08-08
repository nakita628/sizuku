/* ========================================================================== *
 *  text
 * ========================================================================== */

/**
 * Capitalize the first letter of a string.
 *
 * @param str - The input string.
 * @returns A new string with the first letter capitalized.
 */
export function capitalize(str: string): string {
  return `${str.charAt(0).toUpperCase()}${str.slice(1)}`
}

/* ========================================================================== *
 *  zod
 * ========================================================================== */

/**
 * @param name
 * @returns
 */
export function infer(name: string) {
  const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1)
  return `export type ${capitalizedName} = z.infer<typeof ${capitalizedName}Schema>`
}

/* ========================================================================== *
 *  valibot
 * ========================================================================== */

export function inferInput(name: string) {
  const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1)
  return `export type ${capitalizedName} = v.InferInput<typeof ${capitalizedName}Schema>`
}
