/**
 * Remove duplicate relations
 * @param relations - The relations to remove duplicates from
 * @returns The relations without duplicates
 */
export function removeDuplicateRelations(relations: readonly string[]): readonly string[] {
  return [...new Set(relations)]
}
