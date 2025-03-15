import type { Relation } from '../type'
import { parseRelationLine } from '../validator/parse-relation-line'

/**
 * Extracts relations from the given code.
 *
 * @param code - The code to extract relations from.
 * @returns The extracted relations.
 */
export function extractRelations(code: string[]): Relation[] {
  const relations: Relation[] = []

  for (const line of code) {
    const relation = parseRelationLine(line)
    if (relation) {
      relations.push(relation)
    }
  }

  return relations
}
