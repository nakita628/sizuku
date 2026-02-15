import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { register } from 'tsx/esm/api'
import { z } from 'zod'

const ConfigSchema = z.object({
  input: z.custom<`${string}.ts`>((v) => typeof v === 'string' && v.endsWith('.ts')),
  zod: z
    .object({
      output: z.custom<`${string}.ts`>((v) => typeof v === 'string' && v.endsWith('.ts')),
      comment: z.boolean().optional(),
      type: z.boolean().optional(),
      zod: z.enum(['v4', 'mini', '@hono/zod-openapi']).optional(),
      relation: z.boolean().optional(),
    })
    .exactOptional(),
  valibot: z
    .object({
      output: z.custom<`${string}.ts`>((v) => typeof v === 'string' && v.endsWith('.ts')),
      comment: z.boolean().exactOptional(),
      type: z.boolean().exactOptional(),
      relation: z.boolean().exactOptional(),
    })
    .exactOptional(),
  arktype: z
    .object({
      output: z.custom<`${string}.ts`>((v) => typeof v === 'string' && v.endsWith('.ts')),
      comment: z.boolean().optional(),
      type: z.boolean().exactOptional(),
      relation: z.boolean().exactOptional(),
    })
    .exactOptional(),
  effect: z
    .object({
      output: z.custom<`${string}.ts`>((v) => typeof v === 'string' && v.endsWith('.ts')),
      comment: z.boolean().optional(),
      type: z.boolean().exactOptional(),
      relation: z.boolean().exactOptional(),
    })
    .exactOptional(),
  mermaid: z
    .object({
      output: z.string(),
    })
    .exactOptional(),
  dbml: z
    .object({
      output: z.custom<`${string}.dbml` | `${string}.png`>(
        (v) => typeof v === 'string' && (v.endsWith('.dbml') || v.endsWith('.png')),
      ),
    })
    .exactOptional(),
})

export type Config = z.infer<typeof ConfigSchema>

export async function readConfig(): Promise<
  { readonly ok: true; readonly value: Config } | { readonly ok: false; readonly error: string }
> {
  const abs = resolve(process.cwd(), 'sizuku.config.ts')
  if (!existsSync(abs)) {
    return { ok: false, error: `Config not found: ${abs}` }
  }
  try {
    register()
    const mod: { readonly default: unknown } = await import(pathToFileURL(abs).href)

    if (!('default' in mod)) {
      return { ok: false, error: 'Config must export default object' }
    }
    if (mod.default === undefined) {
      return { ok: false, error: 'Config default is undefined' }
    }

    const result = ConfigSchema.safeParse(mod.default)
    if (!result.success) {
      const errors = result.error.issues
        .map((e) => `${e.path.map(String).join('.')}: ${e.message}`)
        .join(', ')
      return { ok: false, error: errors }
    }

    return { ok: true, value: result.data }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export function defineConfig(config: Config): Config {
  return config
}
