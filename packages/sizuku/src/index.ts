// #!/usr/bin/env node

import { config } from './config/index.js'
import { sizukuMermaidER } from './generator/mermaid-er/index.js'
import { sizukuValibot } from './generator/valibot/index.js'
import { sizukuZod } from './generator/zod/index.js'
import { readFileSync } from './shared/fs/index.js'

export async function main(): Promise<
  | {
      ok: true
      value: string
    }
  | {
      ok: false
      error: string
    }
> {
  const configResult = await config()
  if (!configResult.ok) {
    return {
      ok: false,
      error: configResult.error,
    }
  }

  const c = configResult.value

  const contentResult = readFileSync(c.input)
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
  if (c.zod?.output) {
    const zodResult = await sizukuZod(
      code,
      c.zod.output,
      c.zod.comment,
      c.zod.type,
      c.zod.zod,
      true,
    )
    if (!zodResult.ok) {
      return {
        ok: false,
        error: zodResult.error,
      }
    }
    results.push(`Generated Zod schema at: ${c.zod?.output}`)
  }

  /* valibot */
  if (c.valibot?.output) {
    const valibotResult = await sizukuValibot(
      code,
      c.valibot.output,
      c.valibot.comment,
      c.valibot.type,
      true,
    )
    if (!valibotResult.ok) {
      return {
        ok: false,
        error: valibotResult.error,
      }
    }
    results.push(`Generated Valibot schema at: ${c.valibot?.output}`)
  }

  /* mermaid */
  if (c.mermaid?.output) {
    const mermaidResult = await sizukuMermaidER(code, c.mermaid.output)
    if (!mermaidResult.ok) {
      return {
        ok: false,
        error: mermaidResult.error,
      }
    }
    results.push(`Generated Mermaid ER at: ${c.mermaid?.output}`)
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
