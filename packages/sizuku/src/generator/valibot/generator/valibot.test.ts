import { describe, expect, it } from 'vitest'
import { valibot } from './valibot'

// Test run
// pnpm vitest run ./src/generator/valibot/generator/valibot.test.ts

describe('valibot', () => {
  it.concurrent('valibot comment true', () => {
    const result = valibot(
      {
        name: 'user',
        fields: [
          {
            name: 'id',
            definition: 'v.pipe(v.string(), v.uuid())',
            description: 'Primary key',
          },
          {
            name: 'name',
            definition: 'v.pipe(v.string(), v.minLength(1), v.maxLength(50))',
            description: 'Display name',
          },
        ],
      },
      true,
    )

    const expected = `export const UserSchema = v.object({/**
* Primary key
*/
id:v.pipe(v.string(), v.uuid()),
/**
* Display name
*/
name:v.pipe(v.string(), v.minLength(1), v.maxLength(50))})`
    expect(result).toBe(expected)
  })

  it.concurrent('valibot comment false', () => {
    const result = valibot(
      {
        name: 'user',
        fields: [
          {
            name: 'id',
            definition: 'v.pipe(v.string(), v.uuid())',
            description: 'Primary key',
          },
          {
            name: 'name',
            definition: 'v.pipe(v.string(), v.minLength(1), v.maxLength(50))',
            description: 'Display name',
          },
        ],
      },
      false,
    )

    const expected = `export const UserSchema = v.object({id:v.pipe(v.string(), v.uuid()),
name:v.pipe(v.string(), v.minLength(1), v.maxLength(50))})`
    expect(result).toBe(expected)
  })
})
