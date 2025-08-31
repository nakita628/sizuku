import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { config } from '.'

// Test run
// pnpm vitest run ./src/config/index.test.ts

describe('config', () => {
  const origCwd = process.cwd()

  beforeEach(() => {
    vi.resetModules()
    const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'sizuku-config-'))
    process.chdir(tmpdir)
  })

  afterEach(() => {
    const cwd = process.cwd()
    process.chdir(origCwd)
    fs.rmSync(cwd, { recursive: true, force: true })
  })

  it('should return the default config', async () => {
    const testFilePath = path.join(process.cwd(), 'sizuku.config.ts')
    const testConfig = `import { defineConfig } from './src/config/index.js'

export default defineConfig({
  input: 'db/schema.ts',
  zod: {
    output: 'zod/index.ts',
    comment: true,
    type: true,
    zod: 'v4',
    relation: true,
  },
  valibot: {
    output: 'valibot/index.ts',
    comment: true,
    type: true,
    relation: true,
  },
  mermaid: {
    output: 'mermaid-er/ER.md',
  },
})`
    fs.writeFileSync(testFilePath, testConfig, 'utf-8')

    await expect(config()).resolves.toStrictEqual({
      ok: true,
      value: {
        input: 'db/schema.ts',
        zod: { output: 'zod/index.ts', comment: true, type: true, zod: 'v4', relation: true },
        valibot: { output: 'valibot/index.ts', comment: true, type: true, relation: true },
        mermaid: { output: 'mermaid-er/ER.md' },
      },
    })
  })

  it('should return an error if the config file does not exist', async () => {
    const result = await config()
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('Config not found:')
    }
  })
})
