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
  const process = (i: number, acc: Acc): Acc => {
    if (i >= lines.length) {
      return acc
    }
    const line = lines[i]
    // extract schema name
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
    // handle comment line
    if (line.trim().startsWith('///')) {
      // detect valibot comment
      const valibotComment = line.match(/\/\/\/\s*@(v\.[^]+?)(?=\n|$)/)
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
              definition: valibotComment[1].replace('@', ''),
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
        // ignore comment line except metadata
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
    // if field definition is found in non-comment line, use pending comment as field information
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
