import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { register } from 'tsx/esm/api'

export type Config = {
  readonly input: `${string}.ts`
  readonly zod?: {
    readonly output: `${string}.ts`
    readonly comment?: boolean
    readonly type?: boolean
    readonly zod?: 'v4' | 'mini' | '@hono/zod-openapi'
    readonly relation?: boolean
  }
  readonly valibot?: {
    readonly output: `${string}.ts`
    readonly comment?: boolean
    readonly type?: boolean
    readonly relation?: boolean
  }
  readonly mermaid?: {
    readonly output: string
  }
}

type ValidationResult = { readonly ok: true } | { readonly ok: false; readonly error: string }

/**
 * Validate boolean field if defined.
 *
 * @param value - The value to validate
 * @param fieldName - The name of the field
 * @returns Validation result
 */
function validateBoolean(value: unknown, fieldName: string): ValidationResult {
  if (value !== undefined && typeof value !== 'boolean') {
    return { ok: false, error: `${fieldName} must be a boolean` }
  }
  return { ok: true }
}

/**
 * Validate TypeScript file path.
 *
 * @param value - The value to validate
 * @param fieldName - The name of the field
 * @returns Validation result
 */
function validateTsFile(value: string, fieldName: string): ValidationResult {
  const isTs = (o: string): o is `${string}.ts` => o.endsWith('.ts')
  if (!isTs(value)) {
    return { ok: false, error: `${fieldName} must be a .ts file` }
  }
  return { ok: true }
}

/**
 * Validate Zod configuration.
 *
 * @param zodConfig - The Zod configuration to validate
 * @returns Validation result
 */
function validateZodConfig(zodConfig: Config['zod']): ValidationResult {
  if (!zodConfig) return { ok: true }

  const outputValidation = validateTsFile(zodConfig.output, 'Zod output')
  if (!outputValidation.ok) return outputValidation

  const commentValidation = validateBoolean(zodConfig.comment, 'Zod comment')
  if (!commentValidation.ok) return commentValidation

  const typeValidation = validateBoolean(zodConfig.type, 'Zod type')
  if (!typeValidation.ok) return typeValidation

  if (
    zodConfig.zod !== undefined &&
    zodConfig.zod !== 'v4' &&
    zodConfig.zod !== 'mini' &&
    zodConfig.zod !== '@hono/zod-openapi'
  ) {
    return { ok: false, error: 'zod must be v4, mini, or @hono/zod-openapi' }
  }

  const relationValidation = validateBoolean(zodConfig.relation, 'Zod relation')
  if (!relationValidation.ok) return relationValidation

  return { ok: true }
}

/**
 * Validate Valibot configuration.
 *
 * @param valibotConfig - The Valibot configuration to validate
 * @returns Validation result
 */
function validateValibotConfig(valibotConfig: Config['valibot']): ValidationResult {
  if (!valibotConfig) return { ok: true }

  const outputValidation = validateTsFile(valibotConfig.output, 'Valibot output')
  if (!outputValidation.ok) return outputValidation

  const commentValidation = validateBoolean(valibotConfig.comment, 'Valibot comment')
  if (!commentValidation.ok) return commentValidation

  const typeValidation = validateBoolean(valibotConfig.type, 'Valibot type')
  if (!typeValidation.ok) return typeValidation

  const relationValidation = validateBoolean(valibotConfig.relation, 'Valibot relation')
  if (!relationValidation.ok) return relationValidation

  return { ok: true }
}

/**
 * Validate Mermaid configuration.
 *
 * @param mermaidConfig - The Mermaid configuration to validate
 * @returns Validation result
 */
function validateMermaidConfig(mermaidConfig: Config['mermaid']): ValidationResult {
  if (!mermaidConfig) return { ok: true }

  if (typeof mermaidConfig.output !== 'string') {
    return { ok: false, error: 'Mermaid output must be a string' }
  }

  return { ok: true }
}

/**
 * Validate configuration object.
 *
 * @param cfg - The configuration to validate
 * @returns Validation result with validated config
 */
function validateConfig(
  cfg: Config,
): { readonly ok: true; readonly value: Config } | { readonly ok: false; readonly error: string } {
  const inputValidation = validateTsFile(cfg.input, 'Input')
  if (!inputValidation.ok) return inputValidation

  const zodValidation = validateZodConfig(cfg.zod)
  if (!zodValidation.ok) return zodValidation

  const valibotValidation = validateValibotConfig(cfg.valibot)
  if (!valibotValidation.ok) return valibotValidation

  const mermaidValidation = validateMermaidConfig(cfg.mermaid)
  if (!mermaidValidation.ok) return mermaidValidation

  return { ok: true, value: cfg }
}

export async function config(): Promise<
  | { readonly ok: true; readonly value: Config }
  | {
      readonly ok: false
      readonly error: string
    }
> {
  const abs = resolve(process.cwd(), 'sizuku.config.ts')
  if (!existsSync(abs)) {
    return { ok: false, error: `Config not found: ${abs}` }
  }
  try {
    register()
    const mod: {
      readonly default: Config
    } = await import(pathToFileURL(abs).href)
    if (!('default' in mod)) {
      return { ok: false, error: 'Config must export default object' }
    }
    if (mod.default === undefined) {
      return { ok: false, error: 'Config default is undefined' }
    }
    return validateConfig(mod.default)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export function defineConfig(config: Config): Config {
  return config
}
