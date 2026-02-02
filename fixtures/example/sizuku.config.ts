import { defineConfig } from 'sizuku/config'

// ============================================================================
// Sizuku Configuration
// ============================================================================
// Sizuku generates validation schemas from Drizzle schemas.
//
// Available Generators:
//   zod     - Zod schema generator
//   valibot - Valibot schema generator
//   arktype - ArkType schema generator
//   effect  - Effect Schema generator
//   mermaid - Mermaid ER diagram generator
//   dbml    - DBML + ER diagram PNG generator
// ============================================================================

export default defineConfig({
  // Input: Path to Drizzle schema file (must end with .ts)
  input: 'db/schema.ts',

  // Zod Schema Generator
  // Options:
  //   output   - Output file path (must end with .ts)
  //   comment  - Include schema documentation (default: false)
  //   type     - Generate TypeScript types (default: false)
  //   zod      - Zod import: 'v4' | 'mini' | '@hono/zod-openapi' (default: 'v4')
  //   relation - Generate relation schemas (default: false)
  zod: {
    output: 'zod/index.ts',
    comment: true,
    type: true,
    zod: 'v4',
    relation: true,
  },

  // Valibot Schema Generator
  // Options:
  //   output   - Output file path (must end with .ts)
  //   comment  - Include schema documentation (default: false)
  //   type     - Generate TypeScript types (default: false)
  //   relation - Generate relation schemas (default: false)
  valibot: {
    output: 'valibot/index.ts',
    comment: true,
    type: true,
    relation: true,
  },

  // ArkType Schema Generator
  // Options:
  //   output  - Output file path (must end with .ts)
  //   comment - Include schema documentation (default: false)
  //   type    - Generate TypeScript types (default: false)
  arktype: {
    output: 'arktype/index.ts',
    comment: true,
    type: true,
  },

  // Effect Schema Generator
  // Options:
  //   output  - Output file path (must end with .ts)
  //   comment - Include schema documentation (default: false)
  //   type    - Generate TypeScript types (default: false)
  effect: {
    output: 'effect/index.ts',
    comment: true,
    type: true,
  },

  // Mermaid ER Diagram Generator
  // Options:
  //   output - Output file path (markdown file)
  mermaid: {
    output: 'mermaid-er/ER.md',
  },

  // DBML + ER Diagram PNG Generator
  // Outputs both schema.dbml and er-diagram.png to the specified directory
  // Options:
  //   output - Output directory path
  dbml: {
    output: 'docs',
  },
})
