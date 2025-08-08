import { buildRelationLine } from '../../../utils/index.js'

/**
 * Generate a relation line for a relation
 * @param relation - The relation to generate a line for
 * @returns The generated relation line
 */
export function relationLine(relation: {
  fromModel: string
  toModel: string
  fromField: string
  toField: string
  type: string
}): string {
  const cardinality = buildRelationLine(relation.type)

  if (!cardinality) {
    throw new Error(`Unknown relation type: ${relation.type}`)
  }

  return `    ${relation.fromModel} ${cardinality} ${relation.toModel} : "(${relation.fromField}) - (${relation.toField})"`
}
