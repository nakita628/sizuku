import { describe, expect, it } from 'vitest'
import { infer } from './infer'

// Test run
// pnpm vitest run ./src/generator/zod/generator/infer.test.ts

describe('infer', () => {
  it.concurrent('infer Test', () => {
    const result = infer('User')
    expect(result).toBe('export type User = z.infer<typeof UserSchema>')
  })
})
