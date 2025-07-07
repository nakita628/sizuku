import { describe, expect, it } from 'vitest'
import { relationLine } from '.'

// Test run
// pnpm vitest run ./src/generator/mermaid-er/generator/relation-line.test.ts

describe('relationLine', () => {
  it.concurrent('relationLine 1', () => {
    const result = relationLine({
      fromModel: 'user',
      fromField: 'id',
      toModel: 'post',
      toField: 'userId',
      type: 'one-to-many',
    })
    const expected = '    user ||--}| post : "(id) - (userId)"'
    expect(result).toBe(expected)
  })

  it.concurrent('relationLine 2', () => {
    const result = relationLine({
      fromModel: 'post',
      fromField: 'id',
      toModel: 'likes',
      toField: 'postId',
      type: 'one-to-many',
    })
    const expected = '    post ||--}| likes : "(id) - (postId)"'
    expect(result).toBe(expected)
  })

  it.concurrent('relationLine 3', () => {
    const result = relationLine({
      fromModel: 'post',
      fromField: 'id',
      toModel: 'likes',
      toField: 'postId',
      type: 'one-to-many',
    })
    const expected = '    post ||--}| likes : "(id) - (postId)"'
    expect(result).toBe(expected)
  })

  it.concurrent('relationLine 4', () => {
    const result = relationLine({
      fromModel: 'user',
      fromField: 'id',
      toModel: 'likes',
      toField: 'userId',
      type: 'one-to-many',
    })
    const expected = '    user ||--}| likes : "(id) - (userId)"'
    expect(result).toBe(expected)
  })
})
