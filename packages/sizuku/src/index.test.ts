import { describe, expect, it } from 'vitest'
import { main } from './index.js'

// Test run
// pnpm vitest run ./src/index.test.ts

describe('main', () => {
  it('main success', async () => {
    const result = await main({
      input: 'db/schema.ts',
      zod: {
        output: 'zod/index.ts',
        comment: true,
        type: true,
      },
      valibot: {
        output: 'valibot/index.ts',
        comment: true,
      },
      mermaid: {
        output: 'mermaid-er/ER.md',
      },
    })
    expect(result.ok).toBe(true)
  })
  it('main success', async () => {
    // biome-ignore lint: test
    const result = await main('test' as any)
    expect(result.ok).toBe(false)
  })
})
