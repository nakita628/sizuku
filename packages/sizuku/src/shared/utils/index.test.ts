import { describe, expect, it } from 'vitest'
import { capitalize } from '.'

// Test run
// pnpm vitest run ./src/shared/utils/index.test.ts

describe('utils', () => {
  // capitalize
  describe('capitalize', () => {
    it.concurrent(`capitalize('test') -> 'Test'`, () => {
      const result = capitalize('test')
      const expected = 'Test'
      expect(result).toBe(expected)
    })
    it.concurrent(`capitalize('Test') -> 'Test'`, () => {
      const result = capitalize('Test')
      const expected = 'Test'
      expect(result).toBe(expected)
    })
  })
})
