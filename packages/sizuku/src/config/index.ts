import fs from 'node:fs'

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

export function getConfig(): Config {
  if (!fs.existsSync('sizuku.json')) {
    throw new Error('sizuku.json not found')
  }
  const parsed: Config = JSON.parse(fs.readFileSync('sizuku.json', 'utf-8'))

  return {
    input: parsed.input,
    zod: parsed.zod,
    valibot: parsed.valibot,
    mermaid: parsed.mermaid,
  }
}
