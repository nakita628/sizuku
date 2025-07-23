/**
 * Capitalize the first letter of a string.
 *
 * @param str - The input string.
 * @returns A new string with the first letter capitalized.
 */
export function capitalize(str: string): string {
    return `${str.charAt(0).toUpperCase()}${str.slice(1)}`
  }
