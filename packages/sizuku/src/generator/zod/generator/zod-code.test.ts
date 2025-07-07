import { describe, expect, it } from 'vitest'
import { zodCode } from './zod-code'

// Test run
// pnpm vitest run ./src/generator/zod/generator/zod-code.test.ts

describe('zodCode', () => {
  it.concurrent('zodCode comment true type true', () => {
    const result = zodCode(
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
      true,
    )

    const expected = `export const UserSchema = z.object({/**
* Primary key
*/
id:z.uuid(),
/**
* Display name
*/
name:z.string().min(1).max(50)})

export type User = z.infer<typeof UserSchema>
`
    expect(result).toBe(expected)
  })

  it.concurrent('zodCode comment false type false', () => {
    const result = zodCode(
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
      false,
    )

    console.log(result)
    const expected = `export const UserSchema = z.object({id:z.uuid(),
name:z.string().min(1).max(50)})
`
    expect(result).toBe(expected)
  })
})
