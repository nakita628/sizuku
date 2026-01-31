import { describe, expect, it } from 'vitest'
import { dbmlContent } from './dbml-content.js'

describe('dbmlContent', () => {
  it('generates basic table definition', () => {
    const tables = [
      {
        name: 'users',
        fields: [
          { name: 'id', type: 'serial', keyType: 'PK' as const, description: null },
          { name: 'name', type: 'text', keyType: null, description: null },
        ],
      },
    ]
    const relations: readonly {
      fromModel: string
      toModel: string
      fromField: string
      toField: string
      isRequired: boolean
    }[] = []

    const result = dbmlContent(relations, tables)

    expect(result).toContain('Table users {')
    expect(result).toContain('id serial [pk, increment]')
    expect(result).toContain('name text')
    expect(result).toContain('}')
  })

  it('generates foreign key references', () => {
    const tables = [
      {
        name: 'users',
        fields: [{ name: 'id', type: 'serial', keyType: 'PK' as const, description: null }],
      },
      {
        name: 'posts',
        fields: [
          { name: 'id', type: 'serial', keyType: 'PK' as const, description: null },
          { name: 'userId', type: 'integer', keyType: 'FK' as const, description: null },
        ],
      },
    ]
    const relations = [
      {
        fromModel: 'users',
        toModel: 'posts',
        fromField: 'id',
        toField: 'userId',
        isRequired: true,
      },
    ]

    const result = dbmlContent(relations, tables)

    expect(result).toContain('Ref posts_userId_users_id_fk: posts.userId > users.id')
  })

  it('includes field descriptions as notes', () => {
    const tables = [
      {
        name: 'users',
        fields: [
          { name: 'id', type: 'serial', keyType: 'PK' as const, description: 'Primary key' },
          { name: 'email', type: 'varchar', keyType: null, description: "User's email address" },
        ],
      },
    ]
    const relations: readonly {
      fromModel: string
      toModel: string
      fromField: string
      toField: string
      isRequired: boolean
    }[] = []

    const result = dbmlContent(relations, tables)

    expect(result).toContain("id serial [pk, increment, note: 'Primary key']")
    expect(result).toContain("email varchar [note: 'User\\'s email address']")
  })

  it('generates tables without auto-generated comment header', () => {
    const tables = [
      {
        name: 'users',
        fields: [{ name: 'id', type: 'serial', keyType: 'PK' as const, description: null }],
      },
    ]
    const relations: readonly {
      fromModel: string
      toModel: string
      fromField: string
      toField: string
      isRequired: boolean
    }[] = []

    const result = dbmlContent(relations, tables)

    expect(result).toContain('Table users {')
    expect(result).not.toContain('THIS FILE WAS AUTOMATICALLY GENERATED')
  })
})
