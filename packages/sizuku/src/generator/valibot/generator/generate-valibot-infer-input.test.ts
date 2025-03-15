import type { Schema } from '../../../common/type'
import type { Config } from '../../../common/config'
import { describe, expect, it } from 'vitest'
import { generateValibotInferInput } from './generate-valibot-infer-input'

const generateValibotInferInputTestCases: {
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
          description: 'Unique identifier for the user.'
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
    expected: `export type User = v.InferInput<typeof UserSchema>`,
  },
]

describe('generateValibotInferInput', () => {
  it.concurrent.each(generateValibotInferInputTestCases)(
    'generateValibotInferInput($schema) -> $expected',
    ({ schema, config, expected }) => {
      const result = generateValibotInferInput(schema, config)
      expect(result).toBe(expected)
    },
  )
})
