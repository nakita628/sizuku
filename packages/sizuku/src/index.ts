// #!/usr/bin/env node

import { config } from './config/index.js'
import { sizukuArktype } from './generator/arktype/index.js'
import { sizukuDBML } from './generator/dbml/index.js'
import { sizukuEffect } from './generator/effect/index.js'
import { sizukuMermaidER } from './generator/mermaid-er/index.js'
import { sizukuValibot } from './generator/valibot/index.js'
import { sizukuZod } from './generator/zod/index.js'
import { readFileSync } from './fsp/index.js'

export async function main(): Promise<
  | {
      readonly ok: true
      readonly value: string
    }
  | {
      readonly ok: false
      readonly error: string
    }
> {
  const configResult = await config()
  if (!configResult.ok) {
    return {
      ok: false,
      error: `❌ ${configResult.error}`,
    }
  }

  const c = configResult.value

  const contentResult = readFileSync(c.input)
  if (!contentResult.ok) {
    return {
      ok: false,
      error: `❌ ${contentResult.error}`,
    }
  }

  const content = contentResult.value
  const lines = content.split('\n')
  const codeStart = lines.findIndex(
    (line) => !line.trim().startsWith('import') && line.trim() !== '',
  )

  const code = lines.slice(codeStart)

  type MessageResult =
    | { readonly ok: true; readonly value: string }
    | { readonly ok: false; readonly error: string }

  /* zod */
  const zodMessage: MessageResult | null = c.zod?.output
    ? await (async (): Promise<MessageResult> => {
        const zodConfig = c.zod
        if (!zodConfig?.output) {
          return { ok: false, error: '❌ Zod config is missing' }
        }
        const zodResult = await sizukuZod(
          code,
          zodConfig.output,
          zodConfig.comment,
          zodConfig.type,
          zodConfig.zod,
          zodConfig.relation,
        )
        if (!zodResult.ok) {
          return { ok: false, error: `❌ ${zodResult.error}` }
        }
        return { ok: true, value: `💧 Generated Zod schema at: ${zodConfig.output}` }
      })()
    : null

  if (zodMessage && !zodMessage.ok) {
    return { ok: false, error: zodMessage.error }
  }

  /* valibot */
  const valibotMessage: MessageResult | null = c.valibot?.output
    ? await (async (): Promise<MessageResult> => {
        const valibotConfig = c.valibot
        if (!valibotConfig?.output) {
          return { ok: false, error: '❌ Valibot config is missing' }
        }
        const valibotResult = await sizukuValibot(
          code,
          valibotConfig.output,
          valibotConfig.comment,
          valibotConfig.type,
          valibotConfig.relation,
        )
        if (!valibotResult.ok) {
          return { ok: false, error: `❌ ${valibotResult.error}` }
        }
        return { ok: true, value: `💧 Generated Valibot schema at: ${valibotConfig.output}` }
      })()
    : null

  if (valibotMessage && !valibotMessage.ok) {
    return { ok: false, error: valibotMessage.error }
  }

  /* arktype */
  const arktypeMessage: MessageResult | null = c.arktype?.output
    ? await (async (): Promise<MessageResult> => {
        const arktypeConfig = c.arktype
        if (!arktypeConfig?.output) {
          return { ok: false, error: '❌ ArkType config is missing' }
        }
        const arktypeResult = await sizukuArktype(
          code,
          arktypeConfig.output,
          arktypeConfig.comment,
          arktypeConfig.type,
        )
        if (!arktypeResult.ok) {
          return { ok: false, error: `❌ ${arktypeResult.error}` }
        }
        return { ok: true, value: `💧 Generated ArkType schema at: ${arktypeConfig.output}` }
      })()
    : null

  if (arktypeMessage && !arktypeMessage.ok) {
    return { ok: false, error: arktypeMessage.error }
  }

  /* effect */
  const effectMessage: MessageResult | null = c.effect?.output
    ? await (async (): Promise<MessageResult> => {
        const effectConfig = c.effect
        if (!effectConfig?.output) {
          return { ok: false, error: '❌ Effect config is missing' }
        }
        const effectResult = await sizukuEffect(
          code,
          effectConfig.output,
          effectConfig.comment,
          effectConfig.type,
        )
        if (!effectResult.ok) {
          return { ok: false, error: `❌ ${effectResult.error}` }
        }
        return { ok: true, value: `💧 Generated Effect schema at: ${effectConfig.output}` }
      })()
    : null

  if (effectMessage && !effectMessage.ok) {
    return { ok: false, error: effectMessage.error }
  }

  /* mermaid */
  const mermaidMessage: MessageResult | null = c.mermaid?.output
    ? await (async (): Promise<MessageResult> => {
        const mermaidConfig = c.mermaid
        if (!mermaidConfig?.output) {
          return { ok: false, error: '❌ Mermaid config is missing' }
        }
        const mermaidResult = await sizukuMermaidER(code, mermaidConfig.output)
        if (!mermaidResult.ok) {
          return { ok: false, error: `❌ ${mermaidResult.error}` }
        }
        return { ok: true, value: `💧 Generated Mermaid ER at: ${mermaidConfig.output}` }
      })()
    : null

  if (mermaidMessage && !mermaidMessage.ok) {
    return { ok: false, error: mermaidMessage.error }
  }

  /* dbml */
  const dbmlMessage: MessageResult | null = c.dbml?.output
    ? await (async (): Promise<MessageResult> => {
        const dbmlConfig = c.dbml
        if (!dbmlConfig?.output) {
          return { ok: false, error: '❌ DBML config is missing' }
        }
        const dbmlResult = await sizukuDBML(code, dbmlConfig.output)
        if (!dbmlResult.ok) {
          return { ok: false, error: dbmlResult.error }
        }
        return { ok: true, value: `💧 Generated DBML and ER diagram at: ${dbmlConfig.output}/` }
      })()
    : null

  if (dbmlMessage && !dbmlMessage.ok) {
    return { ok: false, error: dbmlMessage.error }
  }

  const results = [
    zodMessage?.ok ? zodMessage.value : null,
    valibotMessage?.ok ? valibotMessage.value : null,
    arktypeMessage?.ok ? arktypeMessage.value : null,
    effectMessage?.ok ? effectMessage.value : null,
    mermaidMessage?.ok ? mermaidMessage.value : null,
    dbmlMessage?.ok ? dbmlMessage.value : null,
  ].filter((msg): msg is string => msg !== null)

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
