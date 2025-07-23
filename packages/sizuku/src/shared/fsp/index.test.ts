import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, writeFile } from '.'

// Test run
// pnpm vitest run ./src/shared/fsp/index.test.ts

const TEST_DIR = path.join(process.cwd(), 'test-tmp-dir')

describe('fsp', () => {
  afterEach(async () => {
    if (fs.existsSync(TEST_DIR)) {
      await fsp.rmdir(TEST_DIR, { recursive: true })
    }
  })

  describe('mkdir', () => {
    it('returns ok when directory is created', async () => {
      const result = await mkdir(TEST_DIR)
      expect(result.isOk()).toBe(true)
      expect(fs.existsSync(TEST_DIR)).toBe(true)
    })

    it('returns ok when directory already exists (recursive:true)', async () => {
      await fsp.mkdir(TEST_DIR, { recursive: true })
      const result = await mkdir(TEST_DIR)
      expect(result.isOk()).toBe(true)
      expect(fs.existsSync(TEST_DIR)).toBe(true)
    })

    it('returns err for invalid path', async () => {
      const filePath = path.join(TEST_DIR, 'foo.txt')
      await fsp.mkdir(TEST_DIR, { recursive: true })
      await fsp.writeFile(filePath, 'dummy')
      const badPath = path.join(filePath, 'bar')
      const result = await mkdir(badPath)
      expect(result.isErr()).toBe(true)
    })
  })

  describe('writeFile', () => {
    beforeEach(async () => {
      await fsp.mkdir(TEST_DIR, { recursive: true })
    })

    it('writes file successfully', async () => {
      const filePath = path.join(TEST_DIR, 'ok.txt')
      const result = await writeFile(filePath, 'hello')
      expect(result.isOk()).toBe(true)
      const text = await fsp.readFile(filePath, 'utf-8')
      expect(text).toBe('hello')
    })

    it('returns err for invalid path', async () => {
      const filePath = path.join(TEST_DIR, 'foo.txt')
      await fsp.writeFile(filePath, 'dummy')
      const badPath = path.join(filePath, 'bar.txt')
      const result = await writeFile(badPath, 'fail')
      expect(result.isErr()).toBe(true)
    })
  })
})
