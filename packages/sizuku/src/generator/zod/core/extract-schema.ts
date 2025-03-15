import type { Schema } from '../../../common/type'

type Acc = {
  currentSchema: Schema | null
  pendingDescription?: string
  schemas: Schema[]
}

/**
 * Extract schemas from lines of code
 * @function extractSchemas
 * @param lines - Lines of code
 * @returns Schemas
 */
export function extractSchemas(lines: string[]): Schema[] {
  console.log('--------------------------------')
  console.log(lines)
  console.log('--------------------------------')
  const process = (i: number, acc: Acc): Acc => {
    if (i >= lines.length) {
      return acc
    }
    const line = lines[i]
    // extract schema
    const schemaMatch = line.match(/export const (\w+)\s*=/)
    if (schemaMatch) {
      const newSchemas = acc.currentSchema ? [...acc.schemas, acc.currentSchema] : acc.schemas
      const newAcc: Acc = {
        currentSchema: { name: schemaMatch[1], fields: [] },
        pendingDescription: undefined,
        schemas: newSchemas,
      }
      return process(i + 1, newAcc)
    }
    // process comment
    if (line.trim().startsWith('///')) {
      // zod comment
      const zodComment = line.match(/\/\/\/\s*(@z\.(?:[^()]+|\([^)]*\))+)/)
      if (zodComment && acc.currentSchema) {
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
              definition: zodComment[1].replace('@', ''),
              description: acc.pendingDescription,
            }
            const newCurrentSchema: Schema = {
              ...acc.currentSchema,
              fields: [...acc.currentSchema.fields, newField],
            }
            const newAcc: Acc = {
              currentSchema: newCurrentSchema,
              pendingDescription: undefined,
              schemas: acc.schemas,
            }
            return process(i + 1, newAcc)
          }
        }
      } else {
        // comments other than metadata are pending
        if (!line.includes('@z.') && !line.includes('@v.') && !line.includes('@relation.')) {
          const commentText = line.replace('///', '').trim()
          const newPending = acc.pendingDescription
            ? `${acc.pendingDescription} ${commentText}`
            : commentText
          const newAcc: Acc = { ...acc, pendingDescription: newPending }
          return process(i + 1, newAcc)
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
        const newCurrentSchema: Schema = {
          ...acc.currentSchema,
          fields: [...acc.currentSchema.fields, newField],
        }
        const newAcc: Acc = {
          currentSchema: newCurrentSchema,
          pendingDescription: undefined,
          schemas: acc.schemas,
        }
        return process(i + 1, newAcc)
      }
    }
    return process(i + 1, acc)
  }

  const finalAcc = process(0, { currentSchema: null, pendingDescription: undefined, schemas: [] })
  return finalAcc.currentSchema ? [...finalAcc.schemas, finalAcc.currentSchema] : finalAcc.schemas
}
