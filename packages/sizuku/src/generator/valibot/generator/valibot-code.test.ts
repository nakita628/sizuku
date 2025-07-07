import { describe, expect, it } from 'vitest'
import { valibotCode } from './valibot-code'

// Test run
// pnpm vitest run ./src/generator/valibot/generator/valibot-code.test.ts

describe('valibotCode', () => {
  it.concurrent('valibotCode comment true type true', () => {
    const result = valibotCode(
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
      true,
    )

    const expected = `export const UserSchema = v.object({/**
* Primary key
*/
id:v.pipe(v.string(), v.uuid()),
/**
* Display name
*/
name:v.pipe(v.string(), v.minLength(1), v.maxLength(50))})

export type User = v.InferInput<typeof UserSchema>
`

    expect(result).toBe(expected)
  })
  it.concurrent('valibotCode comment false type false', () => {
    const result = valibotCode(
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
      false,
    )

    const expected = `export const UserSchema = v.object({id:v.pipe(v.string(), v.uuid()),
name:v.pipe(v.string(), v.minLength(1), v.maxLength(50))})
`
    expect(result).toBe(expected)
  })
})
