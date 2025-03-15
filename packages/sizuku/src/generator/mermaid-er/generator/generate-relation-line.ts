import { CARDINALITY_MAP } from '..'
import type { Relation } from '../type'

/**
 * Generate a relation line for a relation
 * @param relation - The relation to generate a line for
 * @returns The generated relation line
 */
export function generateRelationLine(relation: Relation): string {
  const cardinality = CARDINALITY_MAP[relation.type]
  if (!cardinality) {
    throw new Error(`Unknown relation type: ${relation.type}`)
  }

  return `    ${relation.fromModel} ${cardinality} ${relation.toModel} : "(${relation.fromField}) - (${relation.toField})"`
}
