import { describe, expect, it } from 'vitest'
import { parseRelationLine } from './parse-relation-line'

const parseRelationLineTestCases = [
  {
    line: '/// @relation post.id likes.postId one-to-many',
    expected: {
      fromModel: 'post',
      fromField: 'id',
      toModel: 'likes',
      toField: 'postId',
      type: 'one-to-many',
    },
  },
]

describe('parseRelationLine', () => {
  it.concurrent.each(parseRelationLineTestCases)(
    'parseRelationLine($line) -> $expected',
    ({ line, expected }) => {
      const result = parseRelationLine(line)
      expect(result).toEqual(expected)
    },
  )
})
