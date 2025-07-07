import fs from 'node:fs'
import { Result, ok, err } from 'neverthrow'
import { tryCatch, fromPredicate, pipeResult } from '../shared/utils/functional.js'

export type Config = {
  input?: `${string}.ts`
  zod?: {
    output?: `${string}.ts`
    comment?: boolean
    type?: boolean
    zod?: 'v4' | 'v4-mini' | '@hono/zod-openapi'
  }
  valibot?: {
    output?: `${string}.ts`
    comment?: boolean
    type?: boolean
  }
  mermaid?: {
    output?: string
  }
}

export type ConfigError = 
  | { type: 'FILE_NOT_FOUND'; message: string }
  | { type: 'PARSE_ERROR'; message: string }
  | { type: 'VALIDATION_ERROR'; message: string }

/**
 * Type guard for Zod configuration
 */
function isValidZodConfig(value: unknown): value is Config['zod'] {
  if (value === null || value === undefined) return true
  if (typeof value !== 'object') return false
  
  const obj = value as Record<string, unknown>
  return (
    (obj.output === undefined || typeof obj.output === 'string') &&
    (obj.comment === undefined || typeof obj.comment === 'boolean') &&
    (obj.type === undefined || typeof obj.type === 'boolean') &&
    (obj.zod === undefined || ['v4', 'v4-mini', '@hono/zod-openapi'].includes(obj.zod as string))
  )
}

/**
 * Type guard for Valibot configuration
 */
function isValidValibotConfig(value: unknown): value is Config['valibot'] {
  if (value === null || value === undefined) return true
  if (typeof value !== 'object') return false
  
  const obj = value as Record<string, unknown>
  return (
    (obj.output === undefined || typeof obj.output === 'string') &&
    (obj.comment === undefined || typeof obj.comment === 'boolean') &&
    (obj.type === undefined || typeof obj.type === 'boolean')
  )
}

/**
 * Type guard for Mermaid configuration
 */
function isValidMermaidConfig(value: unknown): value is Config['mermaid'] {
  if (value === null || value === undefined) return true
  if (typeof value !== 'object') return false
  
  const obj = value as Record<string, unknown>
  return obj.output === undefined || typeof obj.output === 'string'
}

/**
 * Pure function to check if configuration file exists
 */
export function checkConfigFileExists(filePath: string): Result<string, ConfigError> {
  return fromPredicate(
    (path: string) => fs.existsSync(path),
    filePath,
    (path: string) => ({
      type: 'FILE_NOT_FOUND' as const,
      message: `Configuration file not found: ${path}`,
    })
  )
}

/**
 * Function to read configuration file
 */
export function readConfigFile(filePath: string): Result<string, ConfigError> {
  return tryCatch(
    () => fs.readFileSync(filePath, 'utf-8'),
    (error) => ({
      type: 'FILE_NOT_FOUND' as const,
      message: `Failed to read configuration file: ${error}`,
    })
  )
}

/**
 * Pure function to parse JSON string
 */
export function parseConfigJson(jsonString: string): Result<unknown, ConfigError> {
  return tryCatch(
    () => JSON.parse(jsonString),
    (error) => ({
      type: 'PARSE_ERROR' as const,
      message: `Failed to parse JSON: ${error}`,
    })
  )
}

/**
 * Pure function to validate configuration object
 */
export function validateConfig(config: unknown): Result<Config, ConfigError> {
  if (typeof config !== 'object' || config === null) {
    return err({
      type: 'VALIDATION_ERROR' as const,
      message: 'Configuration must be an object',
    })
  }

  const configObj = config as Record<string, unknown>
  
  // Basic type checking
  if (configObj.input && typeof configObj.input !== 'string') {
    return err({
      type: 'VALIDATION_ERROR' as const,
      message: 'input must be a string',
    })
  }

  // Type-safe configuration object construction
  const validatedConfig: Config = {
    input: typeof configObj.input === 'string' ? configObj.input as `${string}.ts` : undefined,
    zod: isValidZodConfig(configObj.zod) ? configObj.zod : undefined,
    valibot: isValidValibotConfig(configObj.valibot) ? configObj.valibot : undefined,
    mermaid: isValidMermaidConfig(configObj.mermaid) ? configObj.mermaid : undefined,
  }

  return ok(validatedConfig)
}

/**
 * Functional implementation for loading configuration
 */
export function loadConfig(filePath: string = 'sizuku.json'): Result<Config, ConfigError> {
  return pipeResult(
    checkConfigFileExists(filePath),
    readConfigFile,
    parseConfigJson,
    validateConfig
  )
}

/**
 * Function for backward compatibility (deprecated)
 * @deprecated Use loadConfig instead
 */
export function getConfig(): Config {
  const result = loadConfig()
  if (result.isErr()) {
    throw new Error(result.error.message)
  }
  return result.value
}
