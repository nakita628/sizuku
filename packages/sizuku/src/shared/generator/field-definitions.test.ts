import { describe, expect, it } from 'vitest'
import { fieldDefinitions } from './field-definitions.js'

// Test run
// pnpm vitest run ./src/shared/generator/field-definitions.test.ts

describe('fieldDefinitions', () => {
  it('fieldDefinitions comment true', () => {
    const result = fieldDefinitions(
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
    )

    const expected = `/**
* Primary key
*/
id:z.uuid(),
/**
* Display name
*/
name:z.string().min(1).max(50)`

    expect(result).toBe(expected)
  })
  it('fieldDefinitions comment false', () => {
    const result = fieldDefinitions(
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
    )
    const expected = `id:z.uuid(),
name:z.string().min(1).max(50)`
    expect(result).toBe(expected)
  })
})
