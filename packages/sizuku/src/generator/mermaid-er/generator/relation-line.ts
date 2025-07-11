import { buildRelationLine } from '../relationship/build-relation-line.js'
import type { Relation } from '../types.js'

/**
 * Generate a relation line for a relation
 * @param relation - The relation to generate a line for
 * @returns The generated relation line
 */
export function relationLine(relation: Relation): string {
  const cardinality = buildRelationLine(relation.type)

  if (!cardinality) {
    throw new Error(`Unknown relation type: ${relation.type}`)
  }

  return `    ${relation.fromModel} ${cardinality} ${relation.toModel} : "(${relation.fromField}) - (${relation.toField})"`
}
