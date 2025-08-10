import { describe, expect, it } from 'vitest'
import { relationZodCode } from './relation-zod-code'

// Test run
// pnpm vitest run ./src/generator/zod/generator/relation-zod-code.test.ts

describe('relationZodCode', () => {
  it.concurrent('relationZodCode strict objectType strict', () => {
    const result = relationZodCode(
      {
        name: 'userRelations',
        baseName: 'user',
        fields: [
          {
            name: 'posts',
            definition: 'z.array(PostSchema)',
            description: undefined,
          },
        ],
        objectType: 'strict',
      },
      true,
    )
    const expected = `
export const UserRelationsSchema = z.strictObject({...UserSchema.shape,posts:z.array(PostSchema)})

export type UserRelations = z.infer<typeof UserRelationsSchema>
`
    expect(result).toBe(expected)
  })
  it.concurrent('relationZodCode objectType loose', () => {
    const result = relationZodCode(
      {
        name: 'userRelations',
        baseName: 'user',
        fields: [
          {
            name: 'posts',
            definition: 'z.array(PostSchema)',
            description: undefined,
          },
        ],
        objectType: 'loose',
      },
      true,
    )
    const expected = `
export const UserRelationsSchema = z.looseObject({...UserSchema.shape,posts:z.array(PostSchema)})

export type UserRelations = z.infer<typeof UserRelationsSchema>
`
    expect(result).toBe(expected)
  })
})
