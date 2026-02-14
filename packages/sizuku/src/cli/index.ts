import { config } from '../config/index.js'
import { sizukuArktype } from '../generator/arktype/index.js'
import { sizukuDbml } from '../generator/dbml/index.js'
import { sizukuEffect } from '../generator/effect/index.js'
import { sizukuMermaidER } from '../generator/mermaid-er/index.js'
import { sizukuValibot } from '../generator/valibot/index.js'
import { sizukuZod } from '../generator/zod/index.js'
import { readFileSync } from '../fsp/index.js'

export async function sizuku(): Promise<
  { readonly ok: true; readonly value: string } | { readonly ok: false; readonly error: string }
> {
  const configResult = await config()
  if (!configResult.ok) return { ok: false, error: `❌ ${configResult.error}` }

  const c = configResult.value

  const contentResult = readFileSync(c.input)
  if (!contentResult.ok) return { ok: false, error: `❌ ${contentResult.error}` }

  const content = contentResult.value
  const lines = content.split('\n')
  const codeStart = lines.findIndex(
    (line) => !line.trim().startsWith('import') && line.trim() !== '',
  )
  const code = lines.slice(codeStart)

  const [zodResult, valibotResult, arktypeResult, effectResult, mermaidResult, dbmlResult] =
    await Promise.all([
      c.zod?.output
        ? sizukuZod(
            code,
            c.zod.output,
            c.zod.comment,
            c.zod.type,
            c.zod.zod,
            c.zod.relation,
          )
        : Promise.resolve(undefined),
      c.valibot?.output
        ? sizukuValibot(
            code,
            c.valibot.output,
            c.valibot.comment,
            c.valibot.type,
            c.valibot.relation,
          )
        : Promise.resolve(undefined),
      c.arktype?.output
        ? sizukuArktype(
            code,
            c.arktype.output,
            c.arktype.comment,
            c.arktype.type,
            c.arktype.relation,
          )
        : Promise.resolve(undefined),
      c.effect?.output
        ? sizukuEffect(
            code,
            c.effect.output,
            c.effect.comment,
            c.effect.type,
            c.effect.relation,
          )
        : Promise.resolve(undefined),
      c.mermaid?.output
        ? sizukuMermaidER(code, c.mermaid.output)
        : Promise.resolve(undefined),
      c.dbml?.output
        ? sizukuDbml(code, c.dbml.output)
        : Promise.resolve(undefined),
    ])

  if (zodResult && !zodResult.ok) return { ok: false, error: `❌ ${zodResult.error}` }
  if (valibotResult && !valibotResult.ok) return { ok: false, error: `❌ ${valibotResult.error}` }
  if (arktypeResult && !arktypeResult.ok) return { ok: false, error: `❌ ${arktypeResult.error}` }
  if (effectResult && !effectResult.ok) return { ok: false, error: `❌ ${effectResult.error}` }
  if (mermaidResult && !mermaidResult.ok) return { ok: false, error: `❌ ${mermaidResult.error}` }
  if (dbmlResult && !dbmlResult.ok) return { ok: false, error: dbmlResult.error }

  const results = [
    zodResult?.ok ? `💧 Generated Zod schema at: ${c.zod?.output}` : undefined,
    valibotResult?.ok ? `💧 Generated Valibot schema at: ${c.valibot?.output}` : undefined,
    arktypeResult?.ok ? `💧 Generated ArkType schema at: ${c.arktype?.output}` : undefined,
    effectResult?.ok ? `💧 Generated Effect schema at: ${c.effect?.output}` : undefined,
    mermaidResult?.ok ? `💧 Generated Mermaid ER at: ${c.mermaid?.output}` : undefined,
    dbmlResult?.ok ? `💧 Generated DBML at: ${c.dbml?.output}` : undefined,
  ].filter((v) => v !== undefined)

  return { ok: true, value: results.join('\n') }
}
