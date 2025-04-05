/**
 * Parse a relation line
 * @param line - The line to parse
 * @returns The parsed relation
 */
export function parseRelationLine(line: string) {
  // @relation <fromModel>.<fromField> <toModel>.<toField> <relationType>
  const relationMatch = line.match(/@relation\s+(\w+)\.(\w+)\s+(\w+)\.(\w+)\s+(\w+-to-\w+)/)
  if (relationMatch) {
    const [_, fromModel, fromField, toModel, toField, type] = relationMatch

    return {
      fromModel,
      fromField,
      toModel,
      toField,
      type,
    }
  }

  return null
}
