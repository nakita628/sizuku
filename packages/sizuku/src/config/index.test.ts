// Test run
// pnpm vitest run src/config/index.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import {
  loadConfig,
  checkConfigFileExists,
  readConfigFile,
  parseConfigJson,
  validateConfig,
  getConfig,
} from './index'

describe('config', () => {
  const testConfigPath = 'test-sizuku.json'
  const validConfig = {
    input: 'db/schema.ts',
    zod: {
      output: 'zod/index.ts',
      comment: true,
      type: true,
      zod: 'v4',
    },
    valibot: {
      output: 'valibot/index.ts',
      comment: true,
      type: true,
    },
    mermaid: {
      output: 'mermaid/er.md',
    },
  }

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath)
    }
  })

  describe('checkConfigFileExists', () => {
    it('should return Ok when file exists', () => {
      // Arrange
      fs.writeFileSync(testConfigPath, JSON.stringify(validConfig))

      // Act
      const result = checkConfigFileExists(testConfigPath)

      // Assert
      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toBe(testConfigPath)
    })

    it('should return Err when file does not exist', () => {
      // Act
      const result = checkConfigFileExists('nonexistent.json')

      // Assert
      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('FILE_NOT_FOUND')
    })
  })

  describe('readConfigFile', () => {
    it('should return Ok with file content when file exists', () => {
      // Arrange
      const content = JSON.stringify(validConfig)
      fs.writeFileSync(testConfigPath, content)

      // Act
      const result = readConfigFile(testConfigPath)

      // Assert
      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toBe(content)
    })

    it('should return Err when file does not exist', () => {
      // Act
      const result = readConfigFile('nonexistent.json')

      // Assert
      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('FILE_NOT_FOUND')
    })
  })

  describe('parseConfigJson', () => {
    it('should return Ok with parsed object for valid JSON', () => {
      // Arrange
      const jsonString = JSON.stringify(validConfig)

      // Act
      const result = parseConfigJson(jsonString)

      // Assert
      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toEqual(validConfig)
    })

    it('should return Err for invalid JSON', () => {
      // Act
      const result = parseConfigJson('{ invalid json }')

      // Assert
      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('PARSE_ERROR')
    })
  })

  describe('validateConfig', () => {
    it('should return Ok for valid config object', () => {
      // Act
      const result = validateConfig(validConfig)

      // Assert
      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toEqual(validConfig)
    })

    it('should return Err for null config', () => {
      // Act
      const result = validateConfig(null)

      // Assert
      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('VALIDATION_ERROR')
    })

    it('should return Err for non-object config', () => {
      // Act
      const result = validateConfig('not an object')

      // Assert
      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('VALIDATION_ERROR')
    })

    it('should return Err for invalid input type', () => {
      // Arrange
      const invalidConfig = { ...validConfig, input: 123 }

      // Act
      const result = validateConfig(invalidConfig)

      // Assert
      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('VALIDATION_ERROR')
    })
  })

  describe('loadConfig', () => {
    it('should return Ok with valid config when file exists and is valid', () => {
      // Arrange
      fs.writeFileSync(testConfigPath, JSON.stringify(validConfig))

      // Act
      const result = loadConfig(testConfigPath)

      // Assert
      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap()).toEqual(validConfig)
    })

    it('should return Err when file does not exist', () => {
      // Act
      const result = loadConfig('nonexistent.json')

      // Assert
      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('FILE_NOT_FOUND')
    })

    it('should return Err when file contains invalid JSON', () => {
      // Arrange
      fs.writeFileSync(testConfigPath, '{ invalid json }')

      // Act
      const result = loadConfig(testConfigPath)

      // Assert
      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr().type).toBe('PARSE_ERROR')
    })
  })

  describe('getConfig (deprecated)', () => {
    it('should return config when file exists and is valid', () => {
      // Arrange
      fs.writeFileSync('sizuku.json', JSON.stringify(validConfig))

      // Act
      const result = getConfig()

      // Assert
      expect(result).toEqual(validConfig)

      // Cleanup
      fs.unlinkSync('sizuku.json')
    })

    it('should throw error when file does not exist', () => {
      // Act & Assert
      expect(() => getConfig()).toThrow()
    })
  })
}) 