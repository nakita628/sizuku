import { describe, expect, it } from 'vitest'
import { capitalize, infer, inferInput } from './index'

// Test run
// pnpm vitest run ./src/utils/index.test.ts

describe('utils', () => {
  it.concurrent('capitalize', () => {
    const result = capitalize('user')
    expect(result).toBe('User')
  })
  it.concurrent('infer', () => {
    const result = infer('User')
    expect(result).toBe('export type User = z.infer<typeof UserSchema>')
  })
  it.concurrent('inferInput', () => {
    const result = inferInput('User')
    expect(result).toBe('export type User = v.InferInput<typeof UserSchema>')
  })
})
