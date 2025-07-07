// Test run
// pnpm vitest run src/shared/utils/file.test.ts

import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { Result, ok, err } from 'neverthrow'
import { tryCatch, tryCatchAsync } from './functional.js'

export type FileError = 
  | { type: 'FILE_NOT_FOUND'; message: string }
  | { type: 'PERMISSION_DENIED'; message: string }
  | { type: 'WRITE_ERROR'; message: string }
  | { type: 'READ_ERROR'; message: string }
  | { type: 'DIRECTORY_ERROR'; message: string }

/**
 * Read file synchronously
 */
export function readFileSync(filePath: string): Result<string, FileError> {
  return tryCatch(
    () => fs.readFileSync(filePath, 'utf-8'),
    (error) => {
      const err = error as NodeJS.ErrnoException
      if (err.code === 'ENOENT') {
        return {
          type: 'FILE_NOT_FOUND' as const,
          message: `File not found: ${filePath}`,
        }
      }
      if (err.code === 'EACCES') {
        return {
          type: 'PERMISSION_DENIED' as const,
          message: `Permission denied: ${filePath}`,
        }
      }
      return {
        type: 'READ_ERROR' as const,
        message: `Failed to read file: ${filePath} - ${err.message}`,
      }
    }
  )
}

/**
 * Read file asynchronously
 */
export async function readFileAsync(filePath: string): Promise<Result<string, FileError>> {
  return tryCatchAsync(
    () => fsp.readFile(filePath, 'utf-8'),
    (error) => {
      const err = error as NodeJS.ErrnoException
      if (err.code === 'ENOENT') {
        return {
          type: 'FILE_NOT_FOUND' as const,
          message: `File not found: ${filePath}`,
        }
      }
      if (err.code === 'EACCES') {
        return {
          type: 'PERMISSION_DENIED' as const,
          message: `Permission denied: ${filePath}`,
        }
      }
      return {
        type: 'READ_ERROR' as const,
        message: `Failed to read file: ${filePath} - ${err.message}`,
      }
    }
  )
}

/**
 * Write file synchronously
 */
export function writeFileSync(filePath: string, content: string): Result<void, FileError> {
  return tryCatch(
    () => fs.writeFileSync(filePath, content, 'utf-8'),
    (error) => {
      const err = error as NodeJS.ErrnoException
      if (err.code === 'EACCES') {
        return {
          type: 'PERMISSION_DENIED' as const,
          message: `Permission denied: ${filePath}`,
        }
      }
      return {
        type: 'WRITE_ERROR' as const,
        message: `Failed to write file: ${filePath} - ${err.message}`,
      }
    }
  )
}

/**
 * Write file asynchronously
 */
export async function writeFileAsync(filePath: string, content: string): Promise<Result<void, FileError>> {
  return tryCatchAsync(
    () => fsp.writeFile(filePath, content, 'utf-8'),
    (error) => {
      const err = error as NodeJS.ErrnoException
      if (err.code === 'EACCES') {
        return {
          type: 'PERMISSION_DENIED' as const,
          message: `Permission denied: ${filePath}`,
        }
      }
      return {
        type: 'WRITE_ERROR' as const,
        message: `Failed to write file: ${filePath} - ${err.message}`,
      }
    }
  )
}

/**
 * Create directory
 */
export function ensureDirectorySync(dirPath: string): Result<void, FileError> {
  return tryCatch(
    () => {
      fs.mkdirSync(dirPath, { recursive: true })
      return undefined
    },
    (error) => {
      const err = error as NodeJS.ErrnoException
      return {
        type: 'DIRECTORY_ERROR' as const,
        message: `Failed to create directory: ${dirPath} - ${err.message}`,
      }
    }
  )
}

/**
 * Create directory asynchronously
 */
export async function ensureDirectoryAsync(dirPath: string): Promise<Result<void, FileError>> {
  return tryCatchAsync(
    async () => {
      await fsp.mkdir(dirPath, { recursive: true })
      return undefined
    },
    (error) => {
      const err = error as NodeJS.ErrnoException
      return {
        type: 'DIRECTORY_ERROR' as const,
        message: `Failed to create directory: ${dirPath} - ${err.message}`,
      }
    }
  )
}

/**
 * Check if file exists
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath)
}

/**
 * Get directory path from file path
 */
export function getDirectoryPath(filePath: string): string {
  return path.dirname(filePath)
}

/**
 * Write file safely (including directory creation)
 */
export function safeWriteFileSync(filePath: string, content: string): Result<void, FileError> {
  const dirPath = getDirectoryPath(filePath)
  
  const createDirResult = ensureDirectorySync(dirPath)
  if (createDirResult.isErr()) {
    return createDirResult
  }
  
  return writeFileSync(filePath, content)
}

/**
 * Write file safely asynchronously (including directory creation)
 */
export async function safeWriteFileAsync(filePath: string, content: string): Promise<Result<void, FileError>> {
  const dirPath = getDirectoryPath(filePath)
  
  const createDirResult = await ensureDirectoryAsync(dirPath)
  if (createDirResult.isErr()) {
    return createDirResult
  }
  
  return writeFileAsync(filePath, content)
}

/**
 * Function to transform file content
 */
export function transformFileContent<T>(
  content: string,
  transformer: (content: string) => Result<T, FileError>
): Result<T, FileError> {
  return transformer(content)
}

/**
 * Read file, transform it, and return result
 */
export function readAndTransformFileSync<T>(
  filePath: string,
  transformer: (content: string) => Result<T, FileError>
): Result<T, FileError> {
  return readFileSync(filePath).andThen(transformer)
}

/**
 * Read file asynchronously, transform it, and return result
 */
export async function readAndTransformFileAsync<T>(
  filePath: string,
  transformer: (content: string) => Promise<Result<T, FileError>>
): Promise<Result<T, FileError>> {
  const readResult = await readFileAsync(filePath)
  if (readResult.isErr()) {
    return err(readResult.error)
  }
  return transformer(readResult.value)
} 