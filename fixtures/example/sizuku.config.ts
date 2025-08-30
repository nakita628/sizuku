import defineConfig from '../../packages/sizuku/src/config/index.js'

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
  mermaid: {
    output: 'mermaid-er/ER.md',
  },
})
