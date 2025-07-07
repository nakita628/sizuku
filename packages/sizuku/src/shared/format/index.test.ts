import { describe, expect, it } from 'vitest'
import { fmt } from '.'

// Test run
// pnpm vitest run ./src/shared/format/index.test.ts

describe('fmt', () => {
  it('fmt success', async () => {
    const result = await fmt('const sizuku = "sizuku";')
    expect(result.isOk()).toBe(true)
  })
  it('fmt error', async () => {
    const result = await fmt('const sizuku = "sizu')
    expect(result.isErr()).toBe(true)
  })
})
