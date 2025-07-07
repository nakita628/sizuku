// Test run
// pnpm vitest run src/shared/utils/functional.test.ts

import { Result, ok, err } from 'neverthrow'

/**
 * Functional programming utility functions
 */

/**
 * Compose functions (right to left)
 * compose(f, g)(x) = f(g(x))
 */
export function compose<A, B, C>(
  f: (b: B) => C,
  g: (a: A) => B,
): (a: A) => C {
  return (a: A) => f(g(a))
}

/**
 * Pipeline functions (left to right)
 * pipe(x, f, g) = g(f(x))
 */
export function pipe<A>(value: A): A
export function pipe<A, B>(value: A, f1: (a: A) => B): B
export function pipe<A, B, C>(value: A, f1: (a: A) => B, f2: (b: B) => C): C
export function pipe<A, B, C, D>(
  value: A,
  f1: (a: A) => B,
  f2: (b: B) => C,
  f3: (c: C) => D,
): D
export function pipe<A, B, C, D, E>(
  value: A,
  f1: (a: A) => B,
  f2: (b: B) => C,
  f3: (c: C) => D,
  f4: (d: D) => E,
): E
export function pipe<T>(value: T, ...fns: Array<(x: T) => T>): T
export function pipe<T, U>(value: T, f1: (x: T) => U, ...fns: Array<(x: U) => U>): U
export function pipe<T>(value: T, ...fns: Array<(x: T) => T>): T {
  return fns.reduce((acc, fn) => fn(acc), value)
}

/**
 * Function composition using Result type
 */
export function composeResult<A, B, C, E>(
  f: (b: B) => Result<C, E>,
  g: (a: A) => Result<B, E>,
): (a: A) => Result<C, E> {
  return (a: A) => g(a).andThen(f)
}

/**
 * Pipeline processing using Result type
 */
export function pipeResult<A, E>(value: Result<A, E>): Result<A, E>
export function pipeResult<A, B, E>(
  value: Result<A, E>,
  f1: (a: A) => Result<B, E>,
): Result<B, E>
export function pipeResult<A, B, C, E>(
  value: Result<A, E>,
  f1: (a: A) => Result<B, E>,
  f2: (b: B) => Result<C, E>,
): Result<C, E>
export function pipeResult<A, B, C, D, E>(
  value: Result<A, E>,
  f1: (a: A) => Result<B, E>,
  f2: (b: B) => Result<C, E>,
  f3: (c: C) => Result<D, E>,
): Result<D, E>
export function pipeResult<A, B, C, D, F, E>(
  value: Result<A, E>,
  f1: (a: A) => Result<B, E>,
  f2: (b: B) => Result<C, E>,
  f3: (c: C) => Result<D, E>,
  f4: (d: D) => Result<F, E>,
): Result<F, E>
export function pipeResult<T, E>(value: Result<T, E>, ...fns: Array<(x: T) => Result<T, E>>): Result<T, E> {
  return fns.reduce((acc, fn) => acc.andThen(fn), value)
}

/**
 * Wrap operations with side effects in Result type
 */
export function tryCatch<T, E = Error>(
  fn: () => T,
  errorHandler?: (error: unknown) => E,
): Result<T, E> {
  try {
    return ok(fn())
  } catch (error) {
    if (errorHandler) {
      return err(errorHandler(error))
    }
    if (error instanceof Error) {
      return err(error as E)
    }
    return err(new Error(String(error)) as E)
  }
}

/**
 * Wrap asynchronous operations with side effects in Result type
 */
export async function tryCatchAsync<T, E = Error>(
  fn: () => Promise<T>,
  errorHandler?: (error: unknown) => E,
): Promise<Result<T, E>> {
  try {
    const result = await fn()
    return ok(result)
  } catch (error) {
    if (errorHandler) {
      return err(errorHandler(error))
    }
    if (error instanceof Error) {
      return err(error as E)
    }
    return err(new Error(String(error)) as E)
  }
}

/**
 * Apply Result type function to each element of array, return result only if all succeed
 */
export function mapResult<A, B, E>(
  items: A[],
  fn: (item: A) => Result<B, E>,
): Result<B[], E> {
  const results: B[] = []
  for (const item of items) {
    const result = fn(item)
    if (result.isErr()) {
      return err(result.error)
    }
    results.push(result.value)
  }
  return ok(results)
}

/**
 * Return Result type based on condition
 */
export function fromPredicate<T, E>(
  predicate: (value: T) => boolean,
  value: T,
  errorFactory: (value: T) => E,
): Result<T, E> {
  return predicate(value) ? ok(value) : err(errorFactory(value))
}

/**
 * Maybe-like null/undefined check
 */
export function fromNullable<T, E>(
  value: T | null | undefined,
  errorFactory: () => E,
): Result<T, E> {
  return value != null ? ok(value) : err(errorFactory())
}

/**
 * Combine multiple Result types
 */
export function combine<T1, T2, E>(
  r1: Result<T1, E>,
  r2: Result<T2, E>,
): Result<[T1, T2], E>
export function combine<T1, T2, T3, E>(
  r1: Result<T1, E>,
  r2: Result<T2, E>,
  r3: Result<T3, E>,
): Result<[T1, T2, T3], E>
export function combine<T1, T2, T3, T4, E>(
  r1: Result<T1, E>,
  r2: Result<T2, E>,
  r3: Result<T3, E>,
  r4: Result<T4, E>,
): Result<[T1, T2, T3, T4], E>
export function combine<T, E>(...results: Result<T, E>[]): Result<T[], E> {
  const values: T[] = []
  for (const result of results) {
    if (result.isErr()) {
      return err(result.error)
    }
    values.push(result.value)
  }
  return ok(values)
} 