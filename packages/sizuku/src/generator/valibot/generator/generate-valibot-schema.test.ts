import type { Config } from '../../../common/config'
import type { Schema } from '../../../common/type'
import { describe, expect, it } from 'vitest'
import { generateValibotSchema } from './generate-valibot-schema'

const generateValibotSchemaTestCases: {
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
          definition: 'v.pipe(v.string(), v.uuid())',
          description: '(PK) Unique identifier for the user.'
        },
        {
          name: 'username',
          definition: 'v.string()',
          description: 'Username of the user.'
        },
        {
          name: 'email',
          definition: 'v.pipe(v.string(), v.email())',
          description: 'Email address of the user.'
        },
        {
          name: 'password',
          definition: 'v.pipe(v.string(), v.minLength(8), v.maxLength(100))',
          description: 'Password for the user.'
        },
        {
          name: 'createdAt',
          definition: 'v.date()',
          description: 'Timestamp when the user was created.'
        },
        {
          name: 'updatedAt',
          definition: 'v.date()',
          description: 'Timestamp when the user was last updated.'
        }
      ]
    },
    config: {
      schema: { name: 'PascalCase' },
      type: { name: 'PascalCase', export: true },
    },
    expected: `export const UserSchema = v.object({id:v.pipe(v.string(), v.uuid()),
username:v.string(),
email:v.pipe(v.string(), v.email()),
password:v.pipe(v.string(), v.minLength(8), v.maxLength(100)),
createdAt:v.date(),
updatedAt:v.date()})`,
  },
  {
    schema: {
      name: 'user',
      fields: [
        {
          name: 'id',
          definition: 'v.pipe(v.string(), v.uuid())',
          description: '(PK) Unique identifier for the user.',
        },
        {
          name: 'username',
          definition: 'v.string()',
          description: 'Username of the user.',
        },
        {
          name: 'email',
          definition: 'v.pipe(v.string(), v.email())',
          description: 'Email address of the user.',
        },
        {
          name: 'password',
          definition: 'v.pipe(v.string(), v.minLength(8), v.maxLength(100))',
          description: 'Password for the user.',
        },
        {
          name: 'createdAt',
          definition: 'v.date()',
          description: 'Timestamp when the user was created.',
        },
        {
          name: 'updatedAt',
          definition: 'v.date()',
          description: 'Timestamp when the user was last updated.',
        },
      ],
    },
    config: {
      schema: { name: 'camelCase' },
      type: { name: 'camelCase', export: false },
    },
    expected: `export const userSchema = v.object({id:v.pipe(v.string(), v.uuid()),
username:v.string(),
email:v.pipe(v.string(), v.email()),
password:v.pipe(v.string(), v.minLength(8), v.maxLength(100)),
createdAt:v.date(),
updatedAt:v.date()})`,
  },
]

describe('generateValibotSchema', () => {
  it.concurrent.each(generateValibotSchemaTestCases)(
    'generateValibotSchema($schema) -> $expected',
    ({ schema, config, expected }) => {
      const result = generateValibotSchema(schema, config)
      expect(result).toBe(expected)
    },
  )
})
