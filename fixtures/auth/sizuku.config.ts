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
  mermaid: {
    output: 'mermaid-er/ER.md',
  },
  dbml: {
    output: 'docs',
  },
})
