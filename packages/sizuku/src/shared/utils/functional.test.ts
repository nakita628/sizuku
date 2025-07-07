// Test run
// pnpm vitest run src/shared/utils/functional.test.ts

import { describe, it, expect } from 'vitest'
import { ok, err } from 'neverthrow'
import {
  compose,
  pipe,
  composeResult,
  pipeResult,
  tryCatch,
  tryCatchAsync,
  mapResult,
  fromPredicate,
  fromNullable,
  combine,
} from './functional'

describe('functional utilities', () => {
  describe('compose', () => {
    it('should compose functions correctly', () => {
      // Arrange
      const add1 = (x: number) => x + 1
      const multiply2 = (x: number) => x * 2
      const composed = compose(multiply2, add1)

      // Act
      const result = composed(5)

      // Assert
      expect(result).toBe(12) // (5 + 1) * 2
    })
  })

  describe('pipe', () => {
    it('should pipe functions correctly', () => {
      // Arrange
      const add1 = (x: number) => x + 1
      const multiply2 = (x: number) => x * 2

      // Act
      const result = pipe(5, add1, multiply2)

      // Assert
      expect(result).toBe(12) // (5 + 1) * 2
    })
  })

  describe('composeResult', () => {
    it('should compose Result functions correctly', () => {
      // Arrange
      const add1 = (x: number) => ok(x + 1)
      const multiply2 = (x: number) => ok(x * 2)
      const composed = composeResult(multiply2, add1)

      // Act
      const result = composed(5)

      // Assert
      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toBe(12)
    })

    it('should short-circuit on error', () => {
      // Arrange
      const add1 = (x: number) => ok(x + 1)
      const throwError = () => err('error')
      const composed = composeResult(throwError, add1)

      // Act
      const result = composed(5)

      // Assert
      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr()).toBe('error')
    })
  })

  describe('pipeResult', () => {
    it('should pipe Result functions correctly', () => {
      // Arrange
      const add1 = (x: number) => ok(x + 1)
      const multiply2 = (x: number) => ok(x * 2)

      // Act
      const result = pipeResult(ok(5), add1, multiply2)

      // Assert
      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toBe(12)
    })

    it('should short-circuit on error', () => {
      // Arrange
      const add1 = (x: number) => ok(x + 1)
      const throwError = () => err('error')

      // Act
      const result = pipeResult(ok(5), add1, throwError)

      // Assert
      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr()).toBe('error')
    })
  })

  describe('tryCatch', () => {
    it('should return Ok for successful operations', () => {
      // Arrange
      const safeFn = () => 42

      // Act
      const result = tryCatch(safeFn)

      // Assert
      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toBe(42)
    })

    it('should return Err for throwing operations', () => {
      // Arrange
      const throwingFn = () => {
        throw new Error('test error')
      }

      // Act
      const result = tryCatch(throwingFn)

      // Assert
      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(Error)
    })
  })

  describe('tryCatchAsync', () => {
    it('should return Ok for successful async operations', async () => {
      // Arrange
      const safeFn = async () => 42

      // Act
      const result = await tryCatchAsync(safeFn)

      // Assert
      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toBe(42)
    })

    it('should return Err for rejecting async operations', async () => {
      // Arrange
      const throwingFn = async () => {
        throw new Error('test error')
      }

      // Act
      const result = await tryCatchAsync(throwingFn)

      // Assert
      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr()).toBeInstanceOf(Error)
    })
  })

  describe('mapResult', () => {
    it('should map all successful results', () => {
      // Arrange
      const items = [1, 2, 3]
      const fn = (x: number) => ok(x * 2)

      // Act
      const result = mapResult(items, fn)

      // Assert
      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toEqual([2, 4, 6])
    })

    it('should return first error', () => {
      // Arrange
      const items = [1, 2, 3]
      const fn = (x: number) => (x === 2 ? err('error') : ok(x * 2))

      // Act
      const result = mapResult(items, fn)

      // Assert
      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr()).toBe('error')
    })
  })

  describe('fromPredicate', () => {
    it('should return Ok when predicate is true', () => {
      // Arrange
      const isPositive = (x: number) => x > 0
      const errorFactory = (x: number) => `${x} is not positive`

      // Act
      const result = fromPredicate(isPositive, 5, errorFactory)

      // Assert
      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toBe(5)
    })

    it('should return Err when predicate is false', () => {
      // Arrange
      const isPositive = (x: number) => x > 0
      const errorFactory = (x: number) => `${x} is not positive`

      // Act
      const result = fromPredicate(isPositive, -5, errorFactory)

      // Assert
      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr()).toBe('-5 is not positive')
    })
  })

  describe('fromNullable', () => {
    it('should return Ok for non-null values', () => {
      // Arrange
      const errorFactory = () => 'value is null'

      // Act
      const result = fromNullable(42, errorFactory)

      // Assert
      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toBe(42)
    })

    it('should return Err for null values', () => {
      // Arrange
      const errorFactory = () => 'value is null'

      // Act
      const result = fromNullable(null, errorFactory)

      // Assert
      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr()).toBe('value is null')
    })
  })

  describe('combine', () => {
    it('should combine successful results', () => {
      // Arrange
      const r1 = ok(1)
      const r2 = ok('hello')
      const r3 = ok(true)

      // Act
      const result = combine(r1, r2, r3)

      // Assert
      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toEqual([1, 'hello', true])
    })

    it('should return first error', () => {
      // Arrange
      const r1 = ok(1)
      const r2 = err('error')
      const r3 = ok(true)

      // Act
      const result = combine(r1, r2, r3)

      // Assert
      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr()).toBe('error')
    })
  })
}) 