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
): { definition: string; description?: string } {
  const cleaned = commentLines.map((line) => line.replace(/^\/\/\/\s*/, '').trim()).filter(Boolean)
  const definition = cleaned.find((line) => line.startsWith(tag))?.replace(/^@/, '') ?? ''
  const descriptionLines = cleaned.filter(
    (line) => !(line.includes('@z.') || line.includes('@v.') || line.includes('@relation.')),
  )
  const description = descriptionLines.length ? descriptionLines.join(' ') : undefined
  return { definition, description }
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
 *  relation
 * ========================================================================== */

/**
 * Extracts relations from the given code.
 *
 * @param code - The code to extract relations from.
 * @returns The extracted relations.
 */
export function extractRelations(code: string[]): {
  fromModel: string
  toModel: string
  fromField: string
  toField: string
  type: string
}[] {
  const relations: {
    fromModel: string
    toModel: string
    fromField: string
    toField: string
    type: string
  }[] = []
  for (const line of code) {
    const relationMatch = line.match(/@relation\s+(\w+)\.(\w+)\s+(\w+)\.(\w+)\s+(\w+-to-\w+)/)
    if (relationMatch) {
      const [_, fromModel, fromField, toModel, toField, type] = relationMatch
      relations.push({ fromModel, fromField, toModel, toField, type })
    }
  }
  return relations
}

/**
 * Build a relation line from a string.
 *
 * @param input - The input string.
 * @returns The built relation line.
 */
export function buildRelationLine(input: string): string {
  const toSymbol = (r: string): string =>
    r === 'zero-one'
      ? '|o'
      : r === 'one'
        ? '||'
        : r === 'zero-many'
          ? '}o'
          : r === 'many'
            ? '}|'
            : (() => {
                throw new Error(`Invalid relationship: ${r}`)
              })()

  const isRelationship = (r: string): boolean =>
    ['zero-one', 'one', 'zero-many', 'many'].includes(r)

  const [fromRaw, toRawWithOptional] = input.split('-to-')
  if (!(fromRaw && toRawWithOptional)) throw new Error(`Invalid input format: ${input}`)

  const [toRaw, isOptional] = toRawWithOptional.includes('-optional')
    ? [toRawWithOptional.replace('-optional', ''), true]
    : [toRawWithOptional, false]

  if (!(isRelationship(fromRaw) && isRelationship(toRaw))) {
    throw new Error(`Invalid relationship string: ${input}`)
  }

  const fromSymbol = toSymbol(fromRaw)
  const toSymbolStr = toSymbol(toRaw)
  const connector = isOptional ? '..' : '--'

  return `${fromSymbol}${connector}${toSymbolStr}`
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
