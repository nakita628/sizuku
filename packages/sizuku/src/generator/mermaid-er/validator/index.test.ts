import { describe, expect, it } from 'vitest'
import { isRelationship, parseRelationLine, parseTableInfo, removeDuplicateRelations } from '.'

// Test run
// pnpm vitest run ./src/generator/mermaid-er/validator/index.test.ts

describe('mermaid-er validator barrel file exports', () => {
  it('should export isRelationship', () => {
    expect(typeof isRelationship).toBe('function')
  })
  it('should export parseRelationLine', () => {
    expect(typeof parseRelationLine).toBe('function')
  })
  it('should export parseTableInfo', () => {
    expect(typeof parseTableInfo).toBe('function')
  })
  it('should export removeDuplicateRelations', () => {
    expect(typeof removeDuplicateRelations).toBe('function')
  })
})
