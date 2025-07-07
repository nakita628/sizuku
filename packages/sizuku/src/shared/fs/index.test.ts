// test/utils/readFileSync.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { readFileSync } from './index.js'

// Test run
// pnpm vitest run ./src/shared/fs/index.test.ts

const testFilePath = path.join(__dirname, 'test-file.txt')
const nonExistentPath = path.join(__dirname, 'no-such-file.txt')

describe('readFileSync (integration)', () => {
  beforeAll(() => {
    fs.writeFileSync(testFilePath, 'hello world', 'utf-8')
  })

  afterAll(() => {
    fs.unlinkSync(testFilePath)
  })

  it('should return Ok when reading an existing file', () => {
    const result = readFileSync(testFilePath)
    expect(result.isOk()).toBe(true)
    expect(result._unsafeUnwrap()).toBe('hello world')
  })

  it('should return Err when reading a non-existent file', () => {
    const result = readFileSync(nonExistentPath)
    expect(result.isErr()).toBe(true)
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(Error)
  })
})
