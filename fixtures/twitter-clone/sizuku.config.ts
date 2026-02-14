import { defineConfig } from 'sizuku/config'

export default defineConfig({
  input: 'db/schema.ts',
  zod: {
    output: 'zod/index.ts',
    comment: true,
    type: true,
    zod: 'v4',
    relation: true,
  },
  valibot: {
    output: 'valibot/index.ts',
    comment: true,
    type: true,
    relation: true,
  },
  arktype: {
    output: 'arktype/index.ts',
    comment: true,
    type: true,
    relation: true,
  },
  effect: {
    output: 'effect/index.ts',
    comment: true,
    type: true,
    relation: true,
  },
  mermaid: {
    output: 'mermaid-er/ER.md',
  },
  dbml: {
    output: 'docs/er-diagram.png',
  },
})
