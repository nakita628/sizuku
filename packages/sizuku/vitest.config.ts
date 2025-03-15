import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: [
      '**/dist/**',
      '**/src/data/*.ts',
      '**/src/type/*.ts',
      '**/node_modules/**',
      '**/db/schema.ts',
      '**/common/config/index.ts',
    ],
    coverage: {
      exclude: [
        '**/src/**/*.test.ts',
        '**/dist/**',
        '**/type/*.ts',
        '**/node_modules/**',
        '**/vitest.config.ts',
        '**/common/config/index.ts',
        '**/db/schema.ts',
      ],
      all: true,
    },
  },
})
