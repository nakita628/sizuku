#!/usr/bin/env node
import { Result, ok, err } from 'neverthrow'
import type { Config } from './config/index.js'
import { loadConfig, type ConfigError } from './config/index.js'
import { readFileSync, type FileError } from './shared/utils/file.js'
import { pipeResult, tryCatchAsync, combine } from './shared/utils/functional.js'
import { sizukuZod } from './generator/zod/index.js'
import { sizukuValibot } from './generator/valibot/index.js'
import { sizukuMermaidER } from './generator/mermaid-er/index.js'

export type AppError = 
  | ConfigError
  | FileError
  | { type: 'VALIDATION_ERROR'; message: string }
  | { type: 'GENERATION_ERROR'; message: string }

export type GenerationResult = {
  zod?: string
  valibot?: string
  mermaid?: string
}

/**
 * Pure function to validate configuration
 */
export function validateConfig(config: Config): Result<Config, AppError> {
  if (!config.input) {
    return err({
      type: 'VALIDATION_ERROR' as const,
      message: 'input is not found',
    })
  }
  return ok(config)
}

/**
 * Pure function to extract code lines from file content
 */
export function extractCodeLines(content: string): string[] {
  const lines = content.split('\n')
  const codeStart = lines.findIndex(
    (line) => !line.trim().startsWith('import') && line.trim() !== '',
  )
  return lines.slice(codeStart)
}

/**
 * Generate Zod schema
 */
export async function generateZodSchema(
  code: string[],
  config: Config['zod'] & { output: string }
): Promise<Result<string, AppError>> {
      return tryCatchAsync(
      async () => {
        const outputPath = config.output.endsWith('.ts') ? config.output : `${config.output}.ts`
        await sizukuZod(code, outputPath as `${string}.ts`, config.comment, config.type, config.zod)
        return config.output
      },
      (error) => ({
        type: 'GENERATION_ERROR' as const,
        message: `Failed to generate Zod schema: ${error}`,
      })
    )
}

/**
 * Generate Valibot schema
 */
export async function generateValibotSchema(
  code: string[],
  config: Config['valibot'] & { output: string }
): Promise<Result<string, AppError>> {
      return tryCatchAsync(
      async () => {
        const outputPath = config.output.endsWith('.ts') ? config.output : `${config.output}.ts`
        await sizukuValibot(code, outputPath as `${string}.ts`, config.comment, config.type)
        return config.output
      },
      (error) => ({
        type: 'GENERATION_ERROR' as const,
        message: `Failed to generate Valibot schema: ${error}`,
      })
    )
}

/**
 * Generate Mermaid ER diagram
 */
export async function generateMermaidER(
  code: string[],
  config: Config['mermaid'] & { output: string }
): Promise<Result<string, AppError>> {
  return tryCatchAsync(
    async () => {
      await sizukuMermaidER(code, config.output)
      return config.output
    },
    (error) => ({
      type: 'GENERATION_ERROR' as const,
      message: `Failed to generate Mermaid ER: ${error}`,
    })
  )
}

/**
 * Generate all schemas
 */
export async function generateAllSchemas(
  code: string[],
  config: Config
): Promise<Result<GenerationResult, AppError>> {
  const results: GenerationResult = {}
  
  // Generate Zod
  if (config.zod?.output) {
    const zodConfig = { ...config.zod, output: config.zod.output }
    const zodResult = await generateZodSchema(code, zodConfig)
    if (zodResult.isErr()) {
      return err(zodResult.error)
    }
    results.zod = zodResult.value
  }
  
  // Generate Valibot
  if (config.valibot?.output) {
    const valibotConfig = { ...config.valibot, output: config.valibot.output }
    const valibotResult = await generateValibotSchema(code, valibotConfig)
    if (valibotResult.isErr()) {
      return err(valibotResult.error)
    }
    results.valibot = valibotResult.value
  }
  
  // Generate Mermaid
  if (config.mermaid?.output) {
    const mermaidConfig = { ...config.mermaid, output: config.mermaid.output }
    const mermaidResult = await generateMermaidER(code, mermaidConfig)
    if (mermaidResult.isErr()) {
      return err(mermaidResult.error)
    }
    results.mermaid = mermaidResult.value
  }
  
  return ok(results)
}

/**
 * Functional implementation of main processing (function composition version)
 */
export async function runMain(configPath?: string): Promise<Result<GenerationResult, AppError>> {
  const configResult = loadConfig(configPath)
  if (configResult.isErr()) {
    return err(configResult.error)
  }
  
  const validatedResult = validateConfig(configResult.value)
  if (validatedResult.isErr()) {
    return err(validatedResult.error)
  }
  
  const config = validatedResult.value
  const fileResult = readFileSync(config.input!)
  if (fileResult.isErr()) {
    return err(fileResult.error)
  }
  
  const code = extractCodeLines(fileResult.value)
  return generateAllSchemas(code, config)
}

/**
 * Side effect function to output results
 */
export function printResults(results: GenerationResult): void {
  if (results.zod) {
    console.log(`Generated Zod schema at: ${results.zod}`)
  }
  if (results.valibot) {
    console.log(`Generated Valibot schema at: ${results.valibot}`)
  }
  if (results.mermaid) {
    console.log(`Generated Mermaid ER at: ${results.mermaid}`)
  }
}

/**
 * Side effect function to output errors
 */
export function printError(error: AppError): void {
  console.error(`Error: ${error.message}`)
}

/**
 * Function for backward compatibility (deprecated)
 * @deprecated Use runMain instead
 */
export async function main(config?: Config): Promise<void> {
  let result: Result<GenerationResult, AppError>
  
  if (config) {
    const validationResult = validateConfig(config)
    if (validationResult.isErr()) {
      throw new Error(validationResult.error.message)
    }
    
    const fileResult = readFileSync(config.input!)
    if (fileResult.isErr()) {
      throw new Error(fileResult.error.message)
    }
    
    const code = extractCodeLines(fileResult.value)
    result = await generateAllSchemas(code, config)
  } else {
    result = await runMain()
  }
  
  if (result.isErr()) {
    throw new Error(result.error.message)
  }
  
  printResults(result.value)
}

// CLI実行時の処理
if (import.meta.url === `file://${process.argv[1]}`) {
  runMain()
    .then((result) => {
      if (result.isOk()) {
        printResults(result.value)
        process.exit(0)
      } else {
        printError(result.error)
        process.exit(1)
      }
    })
    .catch((err) => {
      console.error('Unexpected error:', err)
      process.exit(1)
    })
}
