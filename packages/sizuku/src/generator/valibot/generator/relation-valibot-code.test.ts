import { describe, expect, it } from 'vitest'
import { relationValibotCode } from './relation-valibot-code'

// Test run
// pnpm vitest run ./src/generator/valibot/generator/relation-valibot-code.test.ts

describe('relationValibotCode', () => {
  it.concurrent('relationValibotCode strict objectType strict', () => {
    const result = relationValibotCode(
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
export const UserRelationsSchema = v.strictObject({...UserSchema.entries,posts:z.array(PostSchema)})

export type UserRelations = v.InferInput<typeof UserRelationsSchema>
`
    expect(result).toBe(expected)
  })
  it.concurrent('relationValibotCode objectType loose', () => {
    const result = relationValibotCode(
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
export const UserRelationsSchema = v.looseObject({...UserSchema.entries,posts:z.array(PostSchema)})

export type UserRelations = v.InferInput<typeof UserRelationsSchema>
`
    expect(result).toBe(expected)
  })
})
