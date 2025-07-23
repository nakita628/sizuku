/**
 * Capitalize the first letter of a string.
 *
 * @param str - The input string.
 * @returns A new string with the first letter capitalized.
 */
export function capitalize(str: string): string {
  return `${str.charAt(0).toUpperCase()}${str.slice(1)}`
}

export function isMetadataComment(text: string): boolean {
  return text.includes('@z.') || text.includes('@v.') || text.includes('@relation.')
}


export function extractFieldComments (sourceText: string, fieldStartPos: number): string[] {
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

  