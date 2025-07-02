#!/usr/bin/env node
import fs from 'node:fs'
import type { Config } from './config/index.js'
import { getConfig } from './config/index.js'
import { sizukuZod } from './generator/zod/index.js'
import { sizukuValibot } from './generator/valibot/index.js'
import { sizukuMermaidER } from './generator/mermaid-er/index.js'

export async function main(config: Config = getConfig()) {
  if (!config.input) {
    throw new Error('input is not found')
  }
  // 1. read db/schema.ts
  const content = fs.readFileSync(config.input, 'utf-8')
  const lines = content.split('\n')
  const codeStart = lines.findIndex(
    (line) => !line.trim().startsWith('import') && line.trim() !== '',
  )
  const code = lines.slice(codeStart)

  // zod
  if (config.zod.output === undefined) {
    throw new Error('zod.output is not found')
  }

  await sizukuZod(code, config.zod.output, config?.zod.comment, config.zod.type, config.zod.zod)

  if (config.valibot.output === undefined) {
    throw new Error('valibot.output is not found')
  }

  // valibot
  await sizukuValibot(code, config.valibot.output, config?.valibot.comment, config.valibot.type)

  // mermaid
  if (config.mermaid.output === undefined) {
    throw new Error('mermaid.output is not found')
  }

  await sizukuMermaidER(code, config.mermaid.output)
}
