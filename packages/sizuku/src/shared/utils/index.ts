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
