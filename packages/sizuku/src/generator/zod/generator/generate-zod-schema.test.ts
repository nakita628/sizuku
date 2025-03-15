import type { Config } from '../../../common/config'
import type { Schema } from '../../../common/type'
import { describe, expect, it } from 'vitest'
import { generateZodSchema } from './generate-zod-schema'

const generateZodSchemaTestCases: {
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
      schema: { name: 'PascalCase' },
      type: { name: 'PascalCase', export: true },
    },
    expected: `export const UserSchema = z.object({id:z.string().uuid(),
username:z.string(),
email:z.string().email(),
password:z.string().min(8).max(100),
createdAt:z.date(),
updatedAt:z.date()})`,
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
      schema: { name: 'camelCase' },
      type: { name: 'camelCase', export: true },
    },
    expected: `export const userSchema = z.object({id:z.string().uuid(),
username:z.string(),
email:z.string().email(),
password:z.string().min(8).max(100),
createdAt:z.date(),
updatedAt:z.date()})`,
  },
]

describe('generateZodSchema', () => {
  it.concurrent.each(generateZodSchemaTestCases)(
    'generateZodSchema($schema) -> $expected',
    ({ schema, config, expected }) => {
      const result = generateZodSchema(schema, config)
      expect(result).toBe(expected)
    },
  )
})
