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
    // extract schema name
    const schemaMatch = line.match(/export const (\w+)\s*=/)
    if (schemaMatch) {
      if (acc.currentSchema) {
        acc.schemas.push(acc.currentSchema)
      }
      acc.currentSchema = { name: schemaMatch[1], fields: [] }
      acc.pendingDescription = undefined
      return process(i + 1, acc)
    }
    // handle comment line
    if (line.trim().startsWith('///')) {
      // detect valibot comment
      const valibotComment = line.match(/\/\/\/\s*@(v\.[^\n]+)/)
      if (valibotComment && acc.currentSchema) {
        // find next field definition line
        const remainingCandidates = lines.slice(i + 1)
        const foundRelative = remainingCandidates.findIndex((candidate) => {
          const trimmed = candidate.trim()
          return trimmed !== '' && !trimmed.startsWith('///')
        })
        if (foundRelative !== -1) {
          const j = i + 1 + foundRelative
          const candidate = lines[j].trim()
          const fieldMatch = candidate.match(/^(\w+)\s*:/)
          if (fieldMatch) {
            const newField = {
              name: fieldMatch[1],
              definition: valibotComment[1],
              description: acc.pendingDescription,
            }
            acc.currentSchema.fields.push(newField)
            acc.pendingDescription = undefined
            return process(i + 1, acc)
          }
        }
      } else {
        // ignore comment line except metadata
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
    // if field definition is found in non-comment line, use pending comment as field information
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
