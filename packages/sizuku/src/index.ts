// #!/usr/bin/env node
import type { Config } from './config/index.js'
import { getConfig } from './config/index.js'
import { sizukuZod } from './generator/zod/index.js'
import { sizukuValibot } from './generator/valibot/index.js'
import { sizukuMermaidER } from './generator/mermaid-er/index.js'
import { readFileSync } from './shared/fs/index.js'
import { ok, err, ResultAsync } from 'neverthrow'
import type { Result } from 'neverthrow'

export async function main(config: Config = getConfig()): Promise<Result<void, Error>> {
  return ResultAsync.fromPromise(Promise.resolve(), () => new Error('init'))
    .andThen(() => {
      if (!config.input) {
        return err(new Error('input is not found'))
      }

      const contentResult = readFileSync(config.input)
      if (contentResult.isErr()) {
        return err(contentResult.error)
      }

      const content = contentResult.value
      const lines = content.split('\n')
      const codeStart = lines.findIndex(
        (line) => !line.trim().startsWith('import') && line.trim() !== '',
      )
      return ok(lines.slice(codeStart))
    })
    .andThen((code) => {
      if (config.zod?.output) {
        return ResultAsync.fromPromise(
          sizukuZod(code, config.zod.output, config.zod.comment, config.zod.type, config.zod.zod),
          (e) => (e instanceof Error ? e : new Error(String(e))),
        ).map(() => {
          console.log(`Generated Zod schema at: ${config.zod?.output}`)
          return code
        })
      }
      return ok(code)
    })
    .andThen((code) => {
      if (config.valibot?.output) {
        return ResultAsync.fromPromise(
          sizukuValibot(code, config.valibot.output, config.valibot.comment, config.valibot.type),
          (e) => (e instanceof Error ? e : new Error(String(e))),
        ).map(() => {
          console.log(`Generated Valibot schema at: ${config.valibot?.output}`)
          return code
        })
      }
      return ok(code)
    })
    .andThen((code) => {
      if (config.mermaid?.output) {
        return ResultAsync.fromPromise(sizukuMermaidER(code, config.mermaid.output), (e) =>
          e instanceof Error ? e : new Error(String(e)),
        ).map(() => {
          console.log(`Generated Mermaid ER at: ${config.mermaid?.output}`)
        })
      }
      return ok(undefined)
    })
}

main().then((result) => {
  if (!result.isOk()) {
    console.error(result.error)
    process.exit(1)
  }
})
