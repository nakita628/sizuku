import { describe, it, expect } from 'vitest'
import { zod } from './zod'

// Test run
// pnpm vitest run ./src/generator/zod/generator/zod.test.ts

describe('zod', () => {
  it('zod comment true', () => {
    const result = zod(
      {
        name: 'user',
        fields: [
          { name: 'id', definition: 'z.uuid()', description: 'Primary key' },
          {
            name: 'name',
            definition: 'z.string().min(1).max(50)',
            description: 'Display name',
          },
        ],
      },
      true,
    )
    const expected = `export const UserSchema = z.object({/**
* Primary key
*/
id:z.uuid(),
/**
* Display name
*/
name:z.string().min(1).max(50)})`
    expect(result).toBe(expected)
  })
  it('zod comment false', () => {
    const result = zod(
      {
        name: 'user',
        fields: [
          { name: 'id', definition: 'z.uuid()', description: 'Primary key' },
          {
            name: 'name',
            definition: 'z.string().min(1).max(50)',
            description: 'Display name',
          },
        ],
      },
      false,
    )
    const expected = `export const UserSchema = z.object({id:z.uuid(),
name:z.string().min(1).max(50)})`
    expect(result).toBe(expected)
  })
})
