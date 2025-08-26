import fs from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { main } from './index.js'

// Test run
// pnpm vitest run ./src/index.test.ts

describe('main', () => {
  afterEach(() => {
    fs.rmSync('zod', { recursive: true, force: true })
    fs.rmSync('valibot', { recursive: true, force: true })
    fs.rmSync('mermaid-er', { recursive: true, force: true })
  })
  it('main success', async () => {
    const result = await main()
    expect(result.ok).toBe(true)
  })
  it('main error', async () => {
    const result = await main()
    expect(result.ok).toBe(false)
  })
})
