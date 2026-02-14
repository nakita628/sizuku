import { readConfig } from '../config/index.js'
import { readFileSync } from '../fsp/index.js'
import { sizukuArktype } from '../generator/arktype/index.js'
import { sizukuDbml } from '../generator/dbml/index.js'
import { sizukuEffect } from '../generator/effect/index.js'
import { sizukuMermaidER } from '../generator/mermaid-er/index.js'
import { sizukuValibot } from '../generator/valibot/index.js'
import { sizukuZod } from '../generator/zod/index.js'

export async function sizuku(): Promise<
  { readonly ok: true; readonly value: string } | { readonly ok: false; readonly error: string }
> {
  const configResult = await readConfig()
  if (!configResult.ok) return { ok: false, error: `❌ ${configResult.error}` }

  const config = configResult.value

  const contentResult = readFileSync(config.input)
  if (!contentResult.ok) return { ok: false, error: `❌ ${contentResult.error}` }

  const content = contentResult.value
  const lines = content.split('\n')
  const codeStart = lines.findIndex(
    (line) => !line.trim().startsWith('import') && line.trim() !== '',
  )
  const code = lines.slice(codeStart)

  const [zodResult, valibotResult, arktypeResult, effectResult, mermaidResult, dbmlResult] =
    await Promise.all([
      config.zod?.output
        ? sizukuZod(
            code,
            config.zod.output,
            config.zod.comment,
            config.zod.type,
            config.zod.zod,
            config.zod.relation,
          )
        : Promise.resolve(undefined),
      config.valibot?.output
        ? sizukuValibot(
            code,
            config.valibot.output,
            config.valibot.comment,
            config.valibot.type,
            config.valibot.relation,
          )
        : Promise.resolve(undefined),
      config.arktype?.output
        ? sizukuArktype(
            code,
            config.arktype.output,
            config.arktype.comment,
            config.arktype.type,
            config.arktype.relation,
          )
        : Promise.resolve(undefined),
      config.effect?.output
        ? sizukuEffect(
            code,
            config.effect.output,
            config.effect.comment,
            config.effect.type,
            config.effect.relation,
          )
        : Promise.resolve(undefined),
      config.mermaid?.output
        ? sizukuMermaidER(code, config.mermaid.output)
        : Promise.resolve(undefined),
      config.dbml?.output ? sizukuDbml(code, config.dbml.output) : Promise.resolve(undefined),
    ])

  if (zodResult && !zodResult.ok) return { ok: false, error: `❌ ${zodResult.error}` }
  if (valibotResult && !valibotResult.ok) return { ok: false, error: `❌ ${valibotResult.error}` }
  if (arktypeResult && !arktypeResult.ok) return { ok: false, error: `❌ ${arktypeResult.error}` }
  if (effectResult && !effectResult.ok) return { ok: false, error: `❌ ${effectResult.error}` }
  if (mermaidResult && !mermaidResult.ok) return { ok: false, error: `❌ ${mermaidResult.error}` }
  if (dbmlResult && !dbmlResult.ok) return { ok: false, error: dbmlResult.error }

  const results = [
    zodResult?.ok ? `💧 Generated Zod schema at: ${config.zod?.output}` : undefined,
    valibotResult?.ok ? `💧 Generated Valibot schema at: ${config.valibot?.output}` : undefined,
    arktypeResult?.ok ? `💧 Generated ArkType schema at: ${config.arktype?.output}` : undefined,
    effectResult?.ok ? `💧 Generated Effect schema at: ${config.effect?.output}` : undefined,
    mermaidResult?.ok ? `💧 Generated Mermaid ER at: ${config.mermaid?.output}` : undefined,
    dbmlResult?.ok ? `💧 Generated DBML at: ${config.dbml?.output}` : undefined,
  ].filter((v) => v !== undefined)

  return { ok: true, value: results.join('\n') }
}
