/**
 * Tag type for validation library prefixes.
 */
export type ValidationTag = '@z.' | '@v.' | '@a.' | '@e.'

/**
 * Capitalize the first character of a string.
 *
 * @param str - The input string.
 * @returns String with first character capitalized.
 */
export function makeCapitalized(str: string): string {
  return `${str.charAt(0).toUpperCase()}${str.slice(1)}`
}

/**
 * Generates a Zod object wrapper.
 *
 * @param inner - The inner field definitions string.
 * @param wrapperType - The object wrapper type.
 * @returns The generated Zod object string.
 */
export function makeZodObject(
  inner: string,
  wrapperType: 'object' | 'strictObject' | 'looseObject' = 'object',
): string {
  switch (wrapperType) {
    case 'strictObject':
      return `z.strictObject({${inner}})`
    case 'looseObject':
      return `z.looseObject({${inner}})`
    default:
      return `z.object({${inner}})`
  }
}

/**
 * Generates a Valibot object wrapper.
 *
 * @param inner - The inner field definitions string.
 * @param wrapperType - The object wrapper type.
 * @returns The generated Valibot object string.
 */
export function makeValibotObject(
  inner: string,
  wrapperType: 'object' | 'strictObject' | 'looseObject' = 'object',
): string {
  switch (wrapperType) {
    case 'strictObject':
      return `v.strictObject({${inner}})`
    case 'looseObject':
      return `v.looseObject({${inner}})`
    default:
      return `v.object({${inner}})`
  }
}

/* ========================================================================== *
 *  text
 * ========================================================================== */

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
export function joinWithSpace(arr: readonly string[]): string {
  return arr.join(' ')
}

/**
 * Split string by newline character.
 *
 * @param str - The input string.
 * @returns Array of strings split by newline.
 */
export function splitByNewline(str: string): readonly string[] {
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
export function splitByWhitespace(str: string): readonly string[] {
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
export function splitByDot(str: string): readonly string[] {
  return str.split('.')
}

/* ========================================================================== *
 *  parse
 * ========================================================================== */

/**
 * Clean comment lines by removing triple slash prefix and trimming.
 *
 * @param commentLines - Raw comment lines
 * @returns Cleaned comment lines
 */
export function cleanCommentLines(commentLines: readonly string[]): readonly string[] {
  return commentLines.map((line) => line.replace(/^\/\/\/\s*/, '').trim()).filter(Boolean)
}

/**
 * Extract object type from comment lines.
 *
 * @param cleaned - Cleaned comment lines
 * @param tag - The tag to look for
 * @returns The object type if found
 */
function extractObjectType(
  cleaned: readonly string[],
  tag: ValidationTag,
): 'strict' | 'loose' | undefined {
  const tagWithoutAt = tag.slice(1)
  const objectTypeLine = cleaned.find(
    (line) =>
      line.includes(`${tagWithoutAt}strictObject`) || line.includes(`${tagWithoutAt}looseObject`),
  )
  if (!objectTypeLine) return undefined
  if (objectTypeLine.includes('strictObject')) return 'strict'
  if (objectTypeLine.includes('looseObject')) return 'loose'
  return undefined
}

/**
 * Extract definition from comment lines.
 *
 * @param cleaned - Cleaned comment lines
 * @param tag - The tag to look for
 * @returns The definition string
 */
function extractDefinition(cleaned: readonly string[], tag: ValidationTag): string {
  const definitionLine = cleaned.find(
    (line) =>
      line.startsWith(tag) && !line.includes('strictObject') && !line.includes('looseObject'),
  )
  if (!definitionLine) return ''
  // Remove the @ sign
  const withoutAt = definitionLine.startsWith('@') ? definitionLine.substring(1) : definitionLine
  // For arktype (@a.) and effect (@e.), remove the library prefix to get the raw definition
  // For zod (@z.) and valibot (@v.), keep the library prefix
  if (tag === '@a.' || tag === '@e.') {
    // Remove the 'a.' or 'e.' prefix
    const prefix = tag.substring(1) // 'a.' or 'e.'
    return withoutAt.startsWith(prefix) ? withoutAt.substring(prefix.length) : withoutAt
  }
  return withoutAt
}

/**
 * Extract description from comment lines.
 *
 * @param cleaned - Cleaned comment lines
 * @returns The description if found
 */
function extractDescription(cleaned: readonly string[]): string | undefined {
  const descriptionLines = cleaned.filter(
    (line) =>
      !(
        line.includes('@z.') ||
        line.includes('@v.') ||
        line.includes('@a.') ||
        line.includes('@e.') ||
        line.includes('@relation.')
      ),
  )
  return descriptionLines.length > 0 ? descriptionLines.join(' ') : undefined
}

/**
 * Parse field comments and extract definition line and description.
 *
 * @param commentLines - Raw comment lines (e.g., from source text)
 * @param tag - The tag to look for (e.g., '@v.', '@z.', '@a.', or '@e.')
 * @returns Parsed definition and description
 */
export function parseFieldComments(
  commentLines: readonly string[],
  tag: ValidationTag,
): {
  readonly definition: string
  readonly description?: string
  readonly objectType?: 'strict' | 'loose'
} {
  const cleaned = cleanCommentLines(commentLines)
  const objectType = extractObjectType(cleaned, tag)
  const definition = extractDefinition(cleaned, tag)
  const description = extractDescription(cleaned)

  return { definition, description, objectType }
}

/* ========================================================================== *
 *  extractFieldComments
 * ========================================================================== */

/**
 * Process a single line during comment extraction.
 *
 * @param acc - The accumulator
 * @param line - The line to process
 * @returns Updated accumulator
 */
function processCommentLine(
  acc: { readonly commentLines: readonly string[]; readonly shouldStop: boolean },
  line: string,
): { readonly commentLines: readonly string[]; readonly shouldStop: boolean } {
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
}

/**
 * Extract field comments from source text.
 *
 * @param sourceText - The source text to extract comments from.
 * @param fieldStartPos - The position of the field in the source text.
 * @returns An array of comment lines.
 */
export function extractFieldComments(sourceText: string, fieldStartPos: number): readonly string[] {
  const beforeField = sourceText.substring(0, fieldStartPos)
  const lines = beforeField.split('\n')
  const reverseIndex = lines
    .map((line, index) => ({ line: line.trim(), index }))
    .reverse()
    .reduce<{ readonly commentLines: readonly string[]; readonly shouldStop: boolean }>(
      (acc, { line }) => processCommentLine(acc, line),
      { commentLines: [], shouldStop: false },
    )
  return reverseIndex.commentLines
}

/* ========================================================================== *
 *  zod
 * ========================================================================== */

/**
 * Creates `z.infer` type for the specified model.
 *
 * @param name - The model name
 * @returns The generated TypeScript type definition line using Zod.
 */
export function infer(name: string): `export type ${string} = z.infer<typeof ${string}Schema>` {
  const modelName = makeCapitalized(name)
  return `export type ${modelName} = z.infer<typeof ${modelName}Schema>`
}

/* ========================================================================== *
 *  valibot
 * ========================================================================== */

/**
 * Creates `v.InferInput` type for the specified model.
 *
 * @param name - The model name
 * @returns The generated TypeScript type definition line using Valibot.
 */
export function inferInput(
  name: string,
): `export type ${string} = v.InferInput<typeof ${string}Schema>` {
  const modelName = makeCapitalized(name)
  return `export type ${modelName} = v.InferInput<typeof ${modelName}Schema>`
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
    readonly name: string
    readonly fields: {
      readonly name: string
      readonly definition: string
      readonly description?: string
    }[]
  },
  comment: boolean,
): string {
  return schema.fields
    .map(({ name, definition, description }) => {
      const commentCode = description && comment ? `/**\n* ${description}\n*/\n` : ''
      return `${commentCode}${name}:${definition}`
    })
    .join(',\n')
}

/* ========================================================================== *
 *  arktype
 * ========================================================================== */

/**
 * Creates ArkType infer type for the specified model.
 *
 * @param name - The model name
 * @returns The generated TypeScript type definition line using ArkType.
 */
export function inferArktype(name: string): `export type ${string} = typeof ${string}Schema.infer` {
  const capitalized = makeCapitalized(name)
  return `export type ${capitalized} = typeof ${capitalized}Schema.infer` as const
}

/* ========================================================================== *
 *  effect
 * ========================================================================== */

/**
 * Creates Effect Schema infer type for the specified model.
 *
 * @param name - The model name
 * @returns The generated TypeScript type definition line using Effect Schema.
 */
export function inferEffect(
  name: string,
): `export type ${string} = Schema.Schema.Type<typeof ${string}Schema>` {
  const capitalized = makeCapitalized(name)
  return `export type ${capitalized} = Schema.Schema.Type<typeof ${capitalized}Schema>` as const
}
