// test/utils/readFileSync.test.ts

import fs from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
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
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBe('hello world')
    }
  })

  it('should return Err when reading a non-existent file', () => {
    const result = readFileSync(nonExistentPath)
    expect(result.ok).toBe(false)
  })
})
