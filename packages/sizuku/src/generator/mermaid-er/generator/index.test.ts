import { describe, expect, it } from 'vitest'
import { erContent, relationLine } from '.'

// Test run
// pnpm vitest run ./src/generator/mermaid-er/generator/index.test.ts

describe('mermaid-er barrel file exports', () => {
  it('should export erContent', () => {
    expect(typeof erContent).toBe('function')
  })

  it('should export relationLine', () => {
    expect(typeof relationLine).toBe('function')
  })
})