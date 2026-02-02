import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { register } from 'tsx/esm/api'
import { z } from 'zod'

// ============================================================================
// Schema Definitions
// ============================================================================

const tsFileSchema = z.string().endsWith('.ts') as z.ZodType<`${string}.ts`>
const directorySchema = z.string()

const zodConfigSchema = z
  .object({
    output: tsFileSchema,
    comment: z.boolean().optional(),
    type: z.boolean().optional(),
    zod: z.enum(['v4', 'mini', '@hono/zod-openapi']).optional(),
    relation: z.boolean().optional(),
  })
  .optional()

const valibotConfigSchema = z
  .object({
    output: tsFileSchema,
    comment: z.boolean().optional(),
    type: z.boolean().optional(),
    relation: z.boolean().optional(),
  })
  .optional()

const arktypeConfigSchema = z
  .object({
    output: tsFileSchema,
    comment: z.boolean().optional(),
    type: z.boolean().optional(),
  })
  .optional()

const effectConfigSchema = z
  .object({
    output: tsFileSchema,
    comment: z.boolean().optional(),
    type: z.boolean().optional(),
  })
  .optional()

const mermaidConfigSchema = z
  .object({
    output: z.string(),
  })
  .optional()

const dbmlConfigSchema = z
  .object({
    output: directorySchema,
  })
  .optional()

const configSchema = z.object({
  input: tsFileSchema,
  zod: zodConfigSchema,
  valibot: valibotConfigSchema,
  arktype: arktypeConfigSchema,
  effect: effectConfigSchema,
  mermaid: mermaidConfigSchema,
  dbml: dbmlConfigSchema,
})

// ============================================================================
// Type Exports
// ============================================================================

export type Config = z.infer<typeof configSchema>

// ============================================================================
// Config Loading
// ============================================================================

export async function config(): Promise<
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

    const result = configSchema.safeParse(mod.default)
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
