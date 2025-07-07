// Test run
// pnpm vitest run src/index.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import {
  validateConfig,
  extractCodeLines,
  generateZodSchema,
  generateValibotSchema,
  generateMermaidER,
  generateAllSchemas,
  runMain,
  printResults,
  printError,
} from './index'
import type { Config } from './config/index'

describe('main functions', () => {
  const testDir = 'test-output'
  const testConfig: Config = {
    input: 'test-schema.ts',
    zod: {
      output: `${testDir}/zod-test.ts`,
      comment: true,
      type: true,
      zod: 'v4',
    },
    valibot: {
      output: `${testDir}/valibot-test.ts`,
      comment: true,
      type: true,
    },
    mermaid: {
      output: `${testDir}/mermaid-test.md`,
    },
  }

  const testSchema = `
import { mysqlTable, varchar, relations } from 'drizzle-orm/mysql-core'

export const user = mysqlTable('user', {
  /// Primary key
  /// @z.uuid()
  /// @v.pipe(v.string(), v.uuid())
  id: varchar('id', { length: 36 }).primaryKey(),
  /// Display name
  /// @z.string().min(1).max(50)
  /// @v.pipe(v.string(), v.minLength(1), v.maxLength(50))
  name: varchar('name', { length: 50 }).notNull(),
})

/// @relation user.id post.userId one-to-many
export const post = mysqlTable('post', {
  /// Primary key
  /// @z.uuid()
  /// @v.pipe(v.string(), v.uuid())
  id: varchar('id', { length: 36 }).primaryKey(),
  /// Article title
  /// @z.string().min(1).max(100)
  /// @v.pipe(v.string(), v.minLength(1), v.maxLength(100))
  title: varchar('title', { length: 100 }).notNull(),
  /// Body content (no length limit)
  /// @z.string()
  /// @v.string()
  content: varchar('content', { length: 65535 }).notNull(),
  /// Foreign key referencing User.id
  /// @z.uuid()
  /// @v.pipe(v.string(), v.uuid())
  userId: varchar('user_id', { length: 36 }).notNull(),
})

export const userRelations = relations(user, ({ many }) => ({
  posts: many(post),
}))

export const postRelations = relations(post, ({ one }) => ({
  user: one(user, {
    fields: [post.userId],
    references: [user.id],
  }),
}))
`

  beforeEach(() => {
    // Create test files
    fs.writeFileSync(testConfig.input!, testSchema)
    fs.writeFileSync('sizuku.json', JSON.stringify(testConfig))
  })

  afterEach(async () => {
    // Clean up test files
    if (fs.existsSync(testConfig.input!)) {
      fs.unlinkSync(testConfig.input!)
    }
    if (fs.existsSync('sizuku.json')) {
      fs.unlinkSync('sizuku.json')
    }
    if (fs.existsSync(testDir)) {
      await fsp.rm(testDir, { recursive: true, force: true })
    }
  })

  describe('validateConfig', () => {
    it('should return Ok for valid config', () => {
      // Act
      const result = validateConfig(testConfig)

      // Assert
      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toEqual(testConfig)
    })

    it('should return Err when input is missing', () => {
      // Arrange
      const invalidConfig = { ...testConfig, input: undefined }

      // Act
      const result = validateConfig(invalidConfig)

      // Assert
      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('VALIDATION_ERROR')
    })
  })

  describe('extractCodeLines', () => {
    it('should extract code lines after imports', () => {
      // Act
      const result = extractCodeLines(testSchema)

      // Assert
      expect(result).toHaveLength(42) // Number of lines after imports
      expect(result[0]).toContain('export const user')
    })
  })

  describe('generateAllSchemas', () => {
    it('should generate all schemas when all configs are provided', async () => {
      // Arrange
      const code = extractCodeLines(testSchema)

      // Act
      const result = await generateAllSchemas(code, testConfig)

      // Assert
      expect(result.isOk()).toBe(true)
      const generationResult = result._unsafeUnwrap()
      expect(generationResult.zod).toBe(testConfig.zod!.output)
      expect(generationResult.valibot).toBe(testConfig.valibot!.output)
      expect(generationResult.mermaid).toBe(testConfig.mermaid!.output)
    })

    it('should generate only zod schema when only zod config is provided', async () => {
      // Arrange
      const code = extractCodeLines(testSchema)
      const zodOnlyConfig = { ...testConfig, valibot: undefined, mermaid: undefined }

      // Act
      const result = await generateAllSchemas(code, zodOnlyConfig)

      // Assert
      expect(result.isOk()).toBe(true)
      const generationResult = result._unsafeUnwrap()
      expect(generationResult.zod).toBe(testConfig.zod!.output)
      expect(generationResult.valibot).toBeUndefined()
      expect(generationResult.mermaid).toBeUndefined()
    })
  })

  describe('runMain', () => {
    it('should run successfully with valid config file', async () => {
      // Act
      const result = await runMain()

      // Assert
      expect(result.isOk()).toBe(true)
      const generationResult = result._unsafeUnwrap()
      expect(generationResult.zod).toBe(testConfig.zod!.output)
      expect(generationResult.valibot).toBe(testConfig.valibot!.output)
      expect(generationResult.mermaid).toBe(testConfig.mermaid!.output)

      // Verify files were created
      expect(fs.existsSync(testConfig.zod!.output!)).toBe(true)
      expect(fs.existsSync(testConfig.valibot!.output!)).toBe(true)
      expect(fs.existsSync(testConfig.mermaid!.output!)).toBe(true)
    })

    it('should return error when config file does not exist', async () => {
      // Arrange
      fs.unlinkSync('sizuku.json')

      // Act
      const result = await runMain()

      // Assert
      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('FILE_NOT_FOUND')
    })

    it('should return error when input file does not exist', async () => {
      // Arrange
      const invalidConfig = { ...testConfig, input: 'nonexistent.ts' as `${string}.ts` }
      fs.writeFileSync('sizuku.json', JSON.stringify(invalidConfig))

      // Act
      const result = await runMain()

      // Assert
      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('FILE_NOT_FOUND')
    })
  })

  describe('printResults', () => {
    it('should print all results', () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const results = {
        zod: 'zod/test.ts',
        valibot: 'valibot/test.ts',
        mermaid: 'mermaid/test.md',
      }

      // Act
      printResults(results)

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('Generated Zod schema at: zod/test.ts')
      expect(consoleSpy).toHaveBeenCalledWith('Generated Valibot schema at: valibot/test.ts')
      expect(consoleSpy).toHaveBeenCalledWith('Generated Mermaid ER at: mermaid/test.md')

      consoleSpy.mockRestore()
    })
  })

  describe('printError', () => {
    it('should print error message', () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = {
        type: 'VALIDATION_ERROR' as const,
        message: 'Test error message',
      }

      // Act
      printError(error)

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('Error: Test error message')

      consoleSpy.mockRestore()
    })
  })
})
