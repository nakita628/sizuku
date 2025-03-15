import { describe, expect, it } from 'vitest'
import { isRelation } from './is-relation'

const isRelationTestCases = [
  // Required Relationships
  {
    value: 'one-to-one',
    expected: true,
  },
  {
    value: 'one-to-many',
    expected: true,
  },
  {
    value: 'many-to-one',
    expected: true,
  },
  {
    value: 'many-to-many',
    expected: true,
  },
  {
    value: 'one-to-zero-one',
    expected: true,
  },
  {
    value: 'zero-one-to-one',
    expected: true,
  },
  {
    value: 'zero-to-one',
    expected: true,
  },
  {
    value: 'zero-to-many',
    expected: true,
  },
  {
    value: 'zero-one-to-many',
    expected: true,
  },
  {
    value: 'many-to-zero-one',
    expected: true,
  },

  // Optional Relationships
  {
    value: 'one-to-one-optional',
    expected: true,
  },
  {
    value: 'one-to-many-optional',
    expected: true,
  },
  {
    value: 'many-to-one-optional',
    expected: true,
  },
  {
    value: 'many-to-many-optional',
    expected: true,
  },
  {
    value: 'zero-to-many-optional',
    expected: true,
  },

  // Nuanced Patterns
  {
    value: 'many-to-zero-many',
    expected: true,
  },
  {
    value: 'zero-many-to-many',
    expected: true,
  },
  {
    value: 'zero-many-to-zero-many',
    expected: true,
  },

  // Invalid cases
  {
    value: 'invalid-relation',
    expected: false,
  },
  {
    value: 'one_to_many',
    expected: false,
  },
  {
    value: 'ONE-TO-MANY',
    expected: false,
  },
  {
    value: '',
    expected: false,
  },
  {
    value: ' ',
    expected: false,
  },
  {
    value: null,
    expected: false,
  },
  {
    value: undefined,
    expected: false,
  },
  {
    value: 123,
    expected: false,
  },
  {
    value: {},
    expected: false,
  },
  {
    value: [],
    expected: false,
  },
]

describe('isRelation', () => {
  it.concurrent.each(isRelationTestCases)(
    'validates "$value" -> $expected',
    async ({ value, expected }) => {
      const result = isRelation(value)
      expect(result).toBe(expected)
    },
  )
})
