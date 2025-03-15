import type { Schema } from '../../../common/type'

type Acc = {
  currentSchema: Schema | null
  pendingDescription?: string
  schemas: Schema[]
}

/**
 * Check if line contains metadata
 */
const isMetadataComment = (line: string): boolean => {
  return line.includes('@z.') || line.includes('@v.') || line.includes('@relation.')
}

/**
 * Check if line is a non-comment line
 */
const isNonCommentLine = (line: string): boolean => {
  const trimmed = line.trim()
  return trimmed !== '' && !trimmed.startsWith('///')
}

/**
 * Extract schemas from lines of code
 * @function extractSchemas
 * @param lines - Lines of code
 * @returns Schemas
 */
export function extractSchemas(lines: string[]): Schema[] {
  const process = (i: number, acc: Acc): Acc => {
    if (i >= lines.length) {
      return acc
    }
    const line = lines[i]
    // extract schema
    const schemaMatch = line.match(/export const (\w+)\s*=/)
    if (schemaMatch) {
      if (acc.currentSchema) {
        acc.schemas.push(acc.currentSchema)
      }
      acc.currentSchema = { name: schemaMatch[1], fields: [] }
      acc.pendingDescription = undefined
      return process(i + 1, acc)
    }
    // process comment
    if (line.trim().startsWith('///')) {
      // zod comment
      const zodComment = line.match(/\/\/\/\s*(@z\.(?:[^()]+|\([^)]*\))+)/)
      if (zodComment && acc.currentSchema) {
        // find next field definition line
        const remainingCandidates = lines.slice(i + 1)
        const foundRelative = remainingCandidates.findIndex(isNonCommentLine)
        if (foundRelative !== -1) {
          const j = i + 1 + foundRelative
          const candidate = lines[j].trim()
          const fieldMatch = candidate.match(/^(\w+)\s*:/)
          if (fieldMatch) {
            const newField = {
              name: fieldMatch[1],
              definition: zodComment[1].replace('@', ''),
              description: acc.pendingDescription,
            }
            acc.currentSchema.fields.push(newField)
            acc.pendingDescription = undefined
            return process(i + 1, acc)
          }
        }
      } else {
        // comments other than metadata are pending
        if (!isMetadataComment(line)) {
          const commentText = line.replace('///', '').trim()
          acc.pendingDescription = acc.pendingDescription
            ? `${acc.pendingDescription} ${commentText}`
            : commentText
          return process(i + 1, acc)
        }
      }
      return process(i + 1, acc)
    }
    // if there is a field definition other than comment, use the pending comment as field information
    if (acc.currentSchema && acc.pendingDescription) {
      const fieldMatch = line.match(/^(\w+)\s*:/)
      if (fieldMatch) {
        const newField = {
          name: fieldMatch[1],
          definition: '',
          description: acc.pendingDescription,
        }
        acc.currentSchema.fields.push(newField)
        acc.pendingDescription = undefined
        return process(i + 1, acc)
      }
    }
    return process(i + 1, acc)
  }

  const finalAcc = process(0, { currentSchema: null, pendingDescription: undefined, schemas: [] })
  if (finalAcc.currentSchema) {
    finalAcc.schemas.push(finalAcc.currentSchema)
  }
  return finalAcc.schemas
}
