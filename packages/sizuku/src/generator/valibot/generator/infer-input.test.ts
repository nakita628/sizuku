import { describe, expect, it } from 'vitest'
import { inferInput } from './infer-input'

// Test run
// pnpm vitest run ./src/generator/valibot/generator/infer-input.test.ts

describe('inferInput', () => {
  it.concurrent('inferInput Test', () => {
    const result = inferInput('User')
    expect(result).toBe('export type User = v.InferInput<typeof UserSchema>')
  })
})
