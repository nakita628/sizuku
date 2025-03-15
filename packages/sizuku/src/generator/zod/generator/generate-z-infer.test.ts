import type { Schema } from '../../../common/type'
import type { Config } from '../../../common/config'
import { describe, expect, it } from 'vitest'
import { generateZInfer } from './generate-z-infer'

const generateZInferTestCases: {
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
    expected: 'export type User = z.infer<typeof UserSchema>',
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
        export: true,
      },
    },
    expected: 'export type user = z.infer<typeof userSchema>',
  },
]

describe('generateZInfer', () => {
  it.concurrent.each(generateZInferTestCases)(
    'generateZInfer($schema) -> $expected',
    async ({ schema, config, expected }) => {
      const result = generateZInfer(schema, config)
      expect(result).toBe(expected)
    },
  )
})
