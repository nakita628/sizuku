import type { Schema } from '../type'
import type { Config } from '../config'
import { describe, expect, it } from 'vitest'
import { generateFieldDefinitions } from './generate-field-definitions'

const generateFieldDefinitionsTestCases: {
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
      schema: { name: 'PascalCase' },
      type: { name: 'PascalCase', export: true },
    },
    expected: `id:z.string().uuid(),
username:z.string(),
email:z.string().email(),
password:z.string().min(8).max(100),
createdAt:z.date(),
updatedAt:z.date()`,
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
      schema: {
        name: 'camelCase',
      },
      type: {
        name: 'camelCase',
        export: true,
      },
    },
    expected: `id:v.pipe(v.string(), v.uuid()),
username:v.string(),
email:v.pipe(v.string(), v.email()),
password:v.pipe(v.string(), v.minLength(8), v.maxLength(100)),
createdAt:v.date(),
updatedAt:v.date()`,
  },
]

describe('generateFieldDefinitions', () => {
  it.concurrent.each(generateFieldDefinitionsTestCases)(
    'generateFieldDefinitions($schema) -> $expected',
    ({ schema, config, expected }) => {
      const result = generateFieldDefinitions(schema, config)
      expect(result).toBe(expected)
    },
  )
})
