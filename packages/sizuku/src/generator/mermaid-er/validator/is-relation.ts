import type { RelationType } from '../type'

const VALID_RELATIONS = new Set<string>([
  // Required Relationships
  'one-to-one',
  'one-to-many',
  'many-to-one',
  'many-to-many',
  'one-to-zero-one',
  'zero-one-to-one',
  'zero-to-one',
  'zero-to-zero-one',
  'zero-to-many',
  'zero-one-to-many',
  'many-to-zero-one',
  // Optional Relationships (using dotted lines)
  'one-to-one-optional',
  'one-to-many-optional',
  'many-to-one-optional',
  'many-to-many-optional',
  'one-to-zero-one-optional',
  'zero-one-to-one-optional',
  'zero-to-one-optional',
  'zero-to-many-optional',
  'zero-one-to-many-optional',
  'many-to-zero-one-optional',
  // Nuanced Patterns (Aliases)
  'many-to-zero-many',
  'zero-many-to-many',
  'zero-many-to-zero-many',
])

/**
 * Validate if a value is a valid relation type
 * @param value - The value to validate
 * @returns True if the value is a valid relation type, false otherwise
 */
export function isRelation(value: unknown): value is RelationType {
  return typeof value === 'string' && VALID_RELATIONS.has(value)
}
