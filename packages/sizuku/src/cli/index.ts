import { readFileSync } from '../fsp/index.js'
import { sizukuArktype } from '../generator/arktype/index.js'
import { sizukuDbml } from '../generator/dbml/index.js'
import { sizukuEffect } from '../generator/effect/index.js'
import { sizukuMermaidER } from '../generator/mermaid-er/index.js'
import { sizukuValibot } from '../generator/valibot/index.js'
import { sizukuZod } from '../generator/zod/index.js'

const HELP_TEXT = `💧 sizuku - Drizzle ORM schema tools

Usage:
  sizuku <input> -o <output> [options]

Options:
  -o <path>                         Output file path
  --zod                             Generate Zod validation schema
  --valibot                         Generate Valibot validation schema
  --arktype                         Generate ArkType validation schema
  --effect                          Generate Effect Schema validation schema
  --zod-version <version>           Zod variant: 'v4' | 'mini' | '@hono/zod-openapi'
  --no-export-types                 Do not export inferred types
  --no-with-comment                 Do not add JSDoc comments
  --no-with-relation                Do not generate relation schemas
  -h, --help                        Display this help message`

/**
 * Detect output type from file extension
 */
export function detectOutputType(output: string): 'dbml' | 'png' | 'mermaid' | 'typescript' | null {
  if (output.endsWith('.dbml')) return 'dbml'
  if (output.endsWith('.png')) return 'png'
  if (output.endsWith('.md')) return 'mermaid'
  if (output.endsWith('.ts')) return 'typescript'
  return null
}

/**
 * Parse CLI flags from argv (pure function)
 */
export function parseFlags(argv: readonly string[]): {
  readonly zod: boolean
  readonly valibot: boolean
  readonly arktype: boolean
  readonly effect: boolean
  readonly zodVersion: 'v4' | 'mini' | '@hono/zod-openapi' | undefined
  readonly exportTypes: boolean
  readonly withComment: boolean
  readonly withRelation: boolean
} {
  const has = (flag: string) => argv.includes(flag)

  const zodVersionIndex = argv.findIndex(
    (a) => a === '--zod-version' || a.startsWith('--zod-version='),
  )
  const zodVersion = (() => {
    if (zodVersionIndex === -1) return undefined
    const arg = argv[zodVersionIndex]
    const value = arg.includes('=') ? arg.split('=')[1] : argv[zodVersionIndex + 1]
    if (value === 'v4' || value === 'mini' || value === '@hono/zod-openapi') return value
    return undefined
  })()

  return {
    zod: has('--zod'),
    valibot: has('--valibot'),
    arktype: has('--arktype'),
    effect: has('--effect'),
    zodVersion,
    exportTypes: !has('--no-export-types'),
    withComment: !has('--no-with-comment'),
    withRelation: !has('--no-with-relation'),
  }
}

/**
 * Strip import lines from source code and return only schema definition lines
 */
export function stripImports(content: string): string[] {
  const lines = content.split('\n')
  const codeStart = lines.findIndex(
    (line) => !line.trim().startsWith('import') && line.trim() !== '',
  )
  return lines.slice(codeStart)
}

/**
 * Run sizuku in direct CLI mode for diagram output
 */
async function sizukuDirectDiagram(
  input: string,
  output: string,
  outputType: 'dbml' | 'png' | 'mermaid',
): Promise<
  { readonly ok: true; readonly value: string } | { readonly ok: false; readonly error: string }
> {
  const contentResult = readFileSync(input)
  if (!contentResult.ok) {
    return { ok: false, error: `Failed to read input: ${contentResult.error}` }
  }

  const code = stripImports(contentResult.value)

  if (outputType === 'dbml' || outputType === 'png') {
    const result = await sizukuDbml(code, output)
    if (!result.ok) return result
    const label = outputType === 'png' ? 'PNG' : 'DBML'
    return { ok: true, value: `💧 Generated ${label} at: ${output}` }
  }

  const result = await sizukuMermaidER(code, output)
  if (!result.ok) return result
  return { ok: true, value: `💧 Generated Mermaid ER at: ${output}` }
}

/**
 * Resolve which schema library to use from flags
 */
export function resolveSchemaLibrary(flags: ReturnType<typeof parseFlags>): {
  readonly name: 'zod' | 'valibot' | 'arktype' | 'effect'
  readonly label: string
} | null {
  if (flags.zod) return { name: 'zod', label: 'Zod' }
  if (flags.valibot) return { name: 'valibot', label: 'Valibot' }
  if (flags.arktype) return { name: 'arktype', label: 'ArkType' }
  if (flags.effect) return { name: 'effect', label: 'Effect' }
  return null
}

/**
 * Run sizuku in direct CLI mode for validation schema output
 */
async function sizukuDirectSchema(
  input: string,
  output: `${string}.ts`,
  flags: ReturnType<typeof parseFlags>,
): Promise<
  { readonly ok: true; readonly value: string } | { readonly ok: false; readonly error: string }
> {
  const lib = resolveSchemaLibrary(flags)
  if (!lib) {
    return {
      ok: false,
      error: 'Specify --zod, --valibot, --arktype, or --effect for .ts output',
    }
  }

  const contentResult = readFileSync(input)
  if (!contentResult.ok) {
    return { ok: false, error: `Failed to read input: ${contentResult.error}` }
  }

  const code = stripImports(contentResult.value)

  const generators = {
    zod: () =>
      sizukuZod(code, output, flags.withComment, flags.exportTypes, flags.zodVersion, flags.withRelation),
    valibot: () =>
      sizukuValibot(code, output, flags.withComment, flags.exportTypes, flags.withRelation),
    arktype: () =>
      sizukuArktype(code, output, flags.withComment, flags.exportTypes, flags.withRelation),
    effect: () =>
      sizukuEffect(code, output, flags.withComment, flags.exportTypes, flags.withRelation),
  }

  const result = await generators[lib.name]()
  if (!result.ok) return result
  return { ok: true, value: `💧 Generated ${lib.label} schema at: ${output}` }
}

/**
 * Main entry point
 */
export async function sizuku(): Promise<
  { readonly ok: true; readonly value: string } | { readonly ok: false; readonly error: string }
> {
  const argv = process.argv.slice(2)

  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    return { ok: true, value: HELP_TEXT }
  }

  const input = argv[0]
  if (!input || input.startsWith('-')) {
    return { ok: false, error: HELP_TEXT }
  }

  const oIndex = argv.indexOf('-o')
  if (oIndex === -1) {
    return { ok: false, error: 'Missing -o flag. Usage: sizuku <input> -o <output>' }
  }

  const output = argv[oIndex + 1]
  if (!output) {
    return { ok: false, error: 'Missing output file path after -o' }
  }

  const outputType = detectOutputType(output)
  if (!outputType) {
    return {
      ok: false,
      error: `Unsupported output format: ${output}. Supported: .dbml, .png, .md, .ts`,
    }
  }

  if (outputType === 'typescript') {
    return sizukuDirectSchema(input, output as `${string}.ts`, parseFlags(argv))
  }

  return sizukuDirectDiagram(input, output, outputType)
}
