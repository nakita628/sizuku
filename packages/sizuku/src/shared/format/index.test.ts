import { describe, expect, it } from 'vitest'
import { fmt } from '.'

// Test run
// pnpm vitest run ./src/shared/format/index.test.ts

describe('fmt', () => {
  it('fmt Test', async () => {
    const result = await fmt('const sizuku = "sizuku";')
    const expected = `const sizuku = 'sizuku'
`
    expect(result).toBe(expected)
  })
})
