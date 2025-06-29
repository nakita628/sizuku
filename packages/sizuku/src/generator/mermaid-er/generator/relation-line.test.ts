import { describe, expect, it } from 'vitest'
import { relationLine } from '.'
import type { Relation } from '../type'

const generateRelationLineTestCases: {
  relation: Relation
  expected: string
}[] = [
  {
    relation: {
      fromModel: 'user',
      fromField: 'id',
      toModel: 'post',
      toField: 'userId',
      type: 'one-to-many',
    },
    expected: '    user ||--}| post : "(id) - (userId)"',
  },
  {
    relation: {
      fromModel: 'post',
      fromField: 'id',
      toModel: 'likes',
      toField: 'postId',
      type: 'one-to-many',
    },
    expected: '    post ||--}| likes : "(id) - (postId)"',
  },
  {
    relation: {
      fromModel: 'user',
      fromField: 'id',
      toModel: 'likes',
      toField: 'userId',
      type: 'one-to-many',
    },
    expected: '    user ||--}| likes : "(id) - (userId)"',
  },
]

describe('generateRelationLine', () => {
  it.concurrent.each(generateRelationLineTestCases)(
    'generateRelationLine($relation) -> $expected',
    ({ relation, expected }) => {
      const result = relationLine(relation)
      expect(result).toEqual(expected)
    },
  )
})
