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

/**
 * Remove triple slash prefix from a string.
 *
 * @param str - The input string.
 * @returns String with triple slash prefix removed.
 */
export function removeTripleSlash(str: string): string {
  return str.startsWith('///') ? str.substring(3) : str
}

/**
 * Check if a string is non-empty.
 *
 * @param str - The input string.
 * @returns True if string is non-empty.
 */
export function isNonEmpty(str: string): boolean {
  return str.length > 0
}

/**
 * Check if a string contains a substring.
 *
 * @param str - The input string.
 * @param substr - The substring to search for.
 * @returns True if string contains substring.
 */
export function containsSubstring(str: string, substr: string): boolean {
  return str.indexOf(substr) !== -1
}

/**
 * Check if a string starts with a prefix.
 *
 * @param str - The input string.
 * @param prefix - The prefix to check.
 * @returns True if string starts with prefix.
 */
export function startsWith(str: string, prefix: string): boolean {
  return str.indexOf(prefix) === 0
}

/**
 * Remove @ sign from the beginning of a string.
 *
 * @param str - The input string.
 * @returns String with @ sign removed.
 */
export function removeAtSign(str: string): string {
  return str.startsWith('@') ? str.substring(1) : str
}

/**
 * Join array of strings with space separator.
 *
 * @param arr - Array of strings to join.
 * @returns Joined string with spaces.
 */
export function joinWithSpace(arr: string[]): string {
  return arr.join(' ')
}

/**
 * Split string by newline character.
 *
 * @param str - The input string.
 * @returns Array of strings split by newline.
 */
export function splitByNewline(str: string): string[] {
  return str.split('\n')
}

/**
 * Trim whitespace from string.
 *
 * @param str - The input string.
 * @returns Trimmed string.
 */
export function trimString(str: string): string {
  return str.trim()
}

/**
 * Parse relation line and extract components.
 *
 * @param line - The line to parse.
 * @returns Parsed relation or null if not a relation line.
 */
export function parseRelationLine(line: string): {
  fromModel: string
  toModel: string
  fromField: string
  toField: string
  type: string
} | null {
  if (!line.startsWith('@relation')) return null

  const parts = line.trim().split(/\s+/)
  if (parts.length < 5) return null

  const fromParts = parts[1].split('.')
  const toParts = parts[2].split('.')

  if (fromParts.length !== 2 || toParts.length !== 2) return null

  return {
    fromModel: fromParts[0],
    fromField: fromParts[1],
    toModel: toParts[0],
    toField: toParts[1],
    type: parts[3],
  }
}

/**
 * Split string by '-to-' delimiter.
 *
 * @param str - The input string.
 * @returns Array with two parts or null if not found.
 */
export function splitByTo(str: string): [string, string] | null {
  const index = str.indexOf('-to-')
  if (index === -1) return null
  return [str.substring(0, index), str.substring(index + 4)]
}

/**
 * Remove optional suffix from string.
 *
 * @param str - The input string.
 * @returns String with optional suffix removed.
 */
export function removeOptionalSuffix(str: string): string {
  const index = str.indexOf('-optional')
  return index !== -1 ? str.substring(0, index) : str
}

/**
 * Split string by whitespace.
 *
 * @param str - The input string.
 * @returns Array of strings split by whitespace.
 */
export function splitByWhitespace(str: string): string[] {
  return str
    .trim()
    .split(/\s+/)
    .filter((s) => s.length > 0)
}

/**
 * Split string by dot character.
 *
 * @param str - The input string.
 * @returns Array of strings split by dot.
 */
export function splitByDot(str: string): string[] {
  return str.split('.')
}

/* ========================================================================== *
 *  parse
 * ========================================================================== */

/**
 * Parse field comments and extract definition line and description.
 *
 * @param commentLines - Raw comment lines (e.g., from source text)
 * @param tag - The tag to look for (e.g., '@v.' or '@z.')
 * @returns Parsed definition and description
 */
export function parseFieldComments(
  commentLines: string[],
  tag: '@v.' | '@z.',
): { definition: string; description?: string; objectType?: 'strict' | 'loose' } {
  const cleaned = commentLines
    .map((line) => (line.startsWith('///') ? line.substring(3) : line).trim())
    .filter((line) => line.length > 0)

  const objectTypeLine = cleaned.find(
    (line) =>
      line.includes(`${tag.slice(1)}strictObject`) || line.includes(`${tag.slice(1)}looseObject`),
  )
  const objectType = objectTypeLine
    ? objectTypeLine.includes('strictObject')
      ? 'strict'
      : objectTypeLine.includes('looseObject')
        ? 'loose'
        : undefined
    : undefined

  const definitionLine = cleaned.find(
    (line) =>
      line.startsWith(tag) && !line.includes('strictObject') && !line.includes('looseObject'),
  )
  const definition = definitionLine
    ? definitionLine.startsWith('@')
      ? definitionLine.substring(1)
      : definitionLine
    : ''

  const descriptionLines = cleaned.filter(
    (line) => !(line.includes('@z.') || line.includes('@v.') || line.includes('@relation.')),
  )
  const description = descriptionLines.length > 0 ? descriptionLines.join(' ') : undefined

  return { definition, description, objectType }
}

/* ========================================================================== *
 *  extractFieldComments
 * ========================================================================== */

/**
 * Extract field comments from source text.
 *
 * @param sourceText - The source text to extract comments from.
 * @param fieldStartPos - The position of the field in the source text.
 * @returns An array of comment lines.
 */
export function extractFieldComments(sourceText: string, fieldStartPos: number): string[] {
  const beforeField = sourceText.substring(0, fieldStartPos)
  const lines = beforeField.split('\n')
  const reverseIndex = lines
    .map((line, index) => ({ line: line.trim(), index }))
    .reverse()
    .reduce<{ commentLines: string[]; shouldStop: boolean }>(
      (acc, { line }) => {
        if (acc.shouldStop) return acc

        if (line.startsWith('///')) {
          return {
            commentLines: [line, ...acc.commentLines],
            shouldStop: false,
          }
        }

        if (line === '') {
          return acc
        }

        return { commentLines: acc.commentLines, shouldStop: true }
      },
      { commentLines: [], shouldStop: false },
    )
  return reverseIndex.commentLines
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

/* ========================================================================== *
 *  schema
 * ========================================================================== */

/**
 * @param schema
 * @returns
 */
export function fieldDefinitions(
  schema: {
    name: string
    fields: {
      name: string
      definition: string
      description?: string
    }[]
  },
  comment: boolean,
) {
  return schema.fields
    .map(({ name, definition, description }) => {
      const commentCode = description && comment ? `/**\n* ${description}\n*/\n` : ''
      return `${commentCode}${name}:${definition}`
    })
    .join(',\n')
}
