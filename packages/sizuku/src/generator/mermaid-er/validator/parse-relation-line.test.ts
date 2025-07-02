import { describe, expect, it } from 'vitest'
import { parseRelationLine } from './parse-relation-line'

// Test run
// pnpm vitest run ./src/generator/mermaid-er/validator/parse-relation-line.test.ts

describe('parseRelationLine', () => {
  it.concurrent('parseRelationLine', () => {
    const result = parseRelationLine('/// @relation post.id likes.postId one-to-many')
    const expected = {
      fromModel: 'post',
      fromField: 'id',
      toModel: 'likes',
      toField: 'postId',
      type: 'one-to-many',
    }
    expect(result).toStrictEqual(expected)
  })
})
