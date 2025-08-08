// #!/usr/bin/env node

import type { Config } from './config/index.js'
import { getConfig } from './config/index.js'
import { sizukuMermaidER } from './generator/mermaid-er/index.js'
import { sizukuValibot } from './generator/valibot/index.js'
import { sizukuZod } from './generator/zod/index.js'
import { readFileSync } from './shared/fs/index.js'

export async function main(config: Config = getConfig()): Promise<
  | {
      ok: true
      value: string
    }
  | {
      ok: false
      error: string
    }
> {
  if (!config.input) {
    return {
      ok: false,
      error: 'input is not found',
    }
  }

  const contentResult = readFileSync(config.input)
  if (!contentResult.ok) {
    return {
      ok: false,
      error: contentResult.error,
    }
  }

  const content = contentResult.value
  const lines = content.split('\n')
  const codeStart = lines.findIndex(
    (line) => !line.trim().startsWith('import') && line.trim() !== '',
  )

  const code = lines.slice(codeStart)

  const results: string[] = []

  /* zod */
  if (config.zod?.output) {
    const zodResult = await sizukuZod(
      code,
      config.zod.output,
      config.zod.comment,
      config.zod.type,
      config.zod.zod,
      true,
    )
    if (!zodResult.ok) {
      return {
        ok: false,
        error: zodResult.error,
      }
    }
    results.push(`Generated Zod schema at: ${config.zod?.output}`)
  }

  /* valibot */
  if (config.valibot?.output) {
    const valibotResult = await sizukuValibot(
      code,
      config.valibot.output,
      config.valibot.comment,
      config.valibot.type,
      true,
    )
    if (!valibotResult.ok) {
      return {
        ok: false,
        error: valibotResult.error,
      }
    }
    results.push(`Generated Valibot schema at: ${config.valibot?.output}`)
  }

  /* mermaid */
  if (config.mermaid?.output) {
    const mermaidResult = await sizukuMermaidER(code, config.mermaid.output)
    if (!mermaidResult.ok) {
      return {
        ok: false,
        error: mermaidResult.error,
      }
    }
    results.push(`Generated Mermaid ER at: ${config.mermaid?.output}`)
  }

  return {
    ok: true,
    value: results.join('\n'),
  }
}

main().then((result) => {
  if (result?.ok) {
    console.log(result.value)
  } else {
    console.error(result?.error)
  }
})
