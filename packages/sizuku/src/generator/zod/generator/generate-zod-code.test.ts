import type { Config } from '../../../common/config'
import type { Schema } from '../../../common/type'
import { describe, expect, it } from 'vitest'
import { generateZodCode } from './generate-zod-code'
const generateZodCodeTestCases: {
  schema: Schema
  config: Config
  expected: string
}[] = [
  {
    schema: {
      name: 'user',
      fields: [
        {
          name: 'id',
          definition: 'z.string().uuid()',
          description: '(PK) Unique identifier for the user.'
        },
        {
          name: 'username',
          definition: 'z.string()',
          description: 'Username of the user.'
        },
        {
          name: 'email',
          definition: 'z.string().email()',
          description: 'Email address of the user.'
        },
        {
          name: 'password',
          definition: 'z.string().min(8).max(100)',
          description: 'Password for the user.'
        },
        {
          name: 'createdAt',
          definition: 'z.date()',
          description: 'Timestamp when the user was created.'
        },
        {
          name: 'updatedAt',
          definition: 'z.date()',
          description: 'Timestamp when the user was last updated.'
        }
      ]
    },
    config: {
      schema: {
        name: 'PascalCase',
      },
      type: {
        name: 'PascalCase',
        export: true,
      },
    },
    expected: `export const UserSchema = z.object({id:z.string().uuid(),
username:z.string(),
email:z.string().email(),
password:z.string().min(8).max(100),
createdAt:z.date(),
updatedAt:z.date()})

export type User = z.infer<typeof UserSchema>
`,
  },
  {
    schema: {
      name: 'user',
      fields: [
        {
          name: 'id',
          definition: 'z.string().uuid()',
          description: '(PK) Unique identifier for the user.',
        },
        {
          name: 'username',
          definition: 'z.string()',
          description: 'Username of the user.',
        },
        {
          name: 'email',
          definition: 'z.string().email()',
          description: 'Email address of the user.',
        },
        {
          name: 'password',
          definition: 'z.string().min(8).max(100)',
          description: 'Password for the user.',
        },
        {
          name: 'createdAt',
          definition: 'z.date()',
          description: 'Timestamp when the user was created.',
        },
        {
          name: 'updatedAt',
          definition: 'z.date()',
          description: 'Timestamp when the user was last updated.',
        },
      ],
    },
    config: {
      schema: {
        name: 'camelCase',
      },
      type: {
        name: 'camelCase',
        export: false,
      },
    },
    expected: `export const userSchema = z.object({id:z.string().uuid(),
username:z.string(),
email:z.string().email(),
password:z.string().min(8).max(100),
createdAt:z.date(),
updatedAt:z.date()})
`,
  },
]

describe('generateZodCode', () => {
  it.concurrent.each(generateZodCodeTestCases)(
    'generateZodCode($schema) -> $expected',
    async ({ schema, config, expected }) => {
      const result = generateZodCode(schema, config)
      expect(result).toBe(expected)
    },
  )
})
