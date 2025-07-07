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
  if (config.zod && config.zod.output) {
    await sizukuZod(code, config.zod.output, config?.zod.comment, config.zod.type, config.zod.zod)
    console.log(`Generated Zod schema at: ${config.zod.output}`)
  } else {
    process.exit(0)
  }

  // valibot
  if (config.valibot && config.valibot.output) {
    await sizukuValibot(code, config.valibot.output, config?.valibot.comment, config.valibot.type)
    console.log(`Generated Valibot schema at: ${config.valibot.output}`)
  } else {
    process.exit(0)
  }

  // mermaid
  if (config.mermaid && config.mermaid.output) {
    await sizukuMermaidER(code, config.mermaid.output)
    console.log(`Generated Mermaid ER at: ${config.mermaid.output}`)
  } else {
    process.exit(0)
  }
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
