import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { register } from 'tsx/esm/api'

export type Config = Readonly<{
  input: `${string}.ts`
  zod?: {
    output: `${string}.ts`
    comment?: boolean
    type?: boolean
    zod?: 'v4' | 'mini' | '@hono/zod-openapi'
    relation?: boolean
  }
  valibot?: {
    output: `${string}.ts`
    comment?: boolean
    type?: boolean
    relations?: boolean
  }
  mermaid?: {
    output: string
  }
}>

export async function config(): Promise<
  | { ok: true; value: Config }
  | {
      ok: false
      error: string
    }
> {
  const isTs = (o: string): o is `${string}.ts` => o.endsWith('.ts')
  const abs = resolve(process.cwd(), 'sizuku.config.ts')
  if (!existsSync(abs)) {
    return { ok: false, error: `Config not found: ${abs}` }
  }
  try {
    register()
    const mod: Readonly<{
      default: Config
    }> = await import(pathToFileURL(abs).href)
    if (!('default' in mod)) {
      return { ok: false, error: 'Config must export default object' }
    }
    if (mod.default !== undefined) {
      if (!isTs(mod.default.input)) {
        return { ok: false, error: 'Input must be a .ts file' }
      }
      // zod
      if (mod.default.zod !== undefined) {
        if (!isTs(mod.default.zod.output)) {
          return { ok: false, error: 'Zod output must be a .ts file' }
        }
        if (mod.default.zod.comment !== undefined) {
          if (typeof mod.default.zod.comment !== 'boolean') {
            return { ok: false, error: 'Zod comment must be a boolean' }
          }
        }
        if (mod.default.zod.type !== undefined) {
          if (typeof mod.default.zod.type !== 'boolean') {
            return { ok: false, error: 'Zod type must be a boolean' }
          }
        }
        if (mod.default.zod.zod !== undefined) {
          if (
            mod.default.zod.zod !== 'v4' &&
            mod.default.zod.zod !== 'mini' &&
            mod.default.zod.zod !== '@hono/zod-openapi'
          ) {
            return { ok: false, error: 'zod must be v4, mini, or @hono/zod-openapi' }
          }
        }
      }
    }
    // valibot
    if (mod.default.valibot !== undefined) {
      if (!isTs(mod.default.valibot.output)) {
        return { ok: false, error: 'Valibot output must be a .ts file' }
      }
      if (mod.default.valibot.comment !== undefined) {
        if (typeof mod.default.valibot.comment !== 'boolean') {
          return { ok: false, error: 'Valibot comment must be a boolean' }
        }
      }
      if (mod.default.valibot.type !== undefined) {
        if (typeof mod.default.valibot.type !== 'boolean') {
          return { ok: false, error: 'Valibot type must be a boolean' }
        }
      }
    }
    // mermaid
    if (mod.default.mermaid !== undefined) {
      if (typeof mod.default.mermaid.output !== 'string') {
        return { ok: false, error: 'Mermaid output must be a string' }
      }
    }
    return { ok: true, value: mod.default }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export default function defineConfig(config: Config): Config {
  return config
}
