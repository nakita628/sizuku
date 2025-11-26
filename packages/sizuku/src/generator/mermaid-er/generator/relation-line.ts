import { buildRelationLine } from '../../../shared/helper/extract-schemas.js'

/**
 * Generate a relation line for a relation
 * @param relation - The relation to generate a line for
 * @returns The generated relation line
 */
export function relationLine(relation: {
  readonly fromModel: string
  readonly toModel: string
  readonly fromField: string
  readonly toField: string
  readonly type: string
}): string {
  const cardinality = buildRelationLine(relation.type)

  if (!cardinality) {
    throw new Error(`Unknown relation type: ${relation.type}`)
  }

  return `    ${relation.fromModel} ${cardinality} ${relation.toModel} : "(${relation.fromField}) - (${relation.toField})"`
}
