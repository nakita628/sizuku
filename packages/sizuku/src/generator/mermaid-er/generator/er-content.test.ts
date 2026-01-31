import { describe, expect, it } from 'vitest'
import type { MergedSchema } from '../../../shared/runtime/types.js'
import { erContent, erContentFromMergedSchema } from '.'

// Test run
// pnpm vitest run ./src/generator/mermaid-er/generator/er-content.test.ts

describe('erContent', () => {
  it.concurrent('erContent Test', () => {
    const result = erContent(
      [
        {
          fromModel: 'user',
          fromField: 'id',
          toModel: 'post',
          toField: 'userId',
          isRequired: true,
        },
      ],
      [
        {
          name: 'user',
          fields: [
            {
              name: 'id',
              type: 'varchar',
              keyType: 'PK',
              description: 'Primary key',
            },
            {
              name: 'name',
              type: 'varchar',
              keyType: null,
              description: 'Display name',
            },
          ],
        },
        {
          name: 'post',
          fields: [
            {
              name: 'id',
              type: 'varchar',
              keyType: 'PK',
              description: 'Primary key',
            },
            {
              name: 'title',
              type: 'varchar',
              keyType: null,
              description: 'Article title',
            },
            {
              name: 'content',
              type: 'varchar',
              keyType: null,
              description: 'Body content (no length limit)',
            },
            {
              name: 'userId',
              type: 'varchar',
              keyType: 'FK',
              description: 'Foreign key referencing User.id',
            },
          ],
        },
      ],
    )

    const expected = `\`\`\`mermaid
erDiagram
    user ||--}| post : "(id) - (userId)"
    user {
        varchar id PK "Primary key"
        varchar name "Display name"
    }
    post {
        varchar id PK "Primary key"
        varchar title "Article title"
        varchar content "Body content (no length limit)"
        varchar userId FK "Foreign key referencing User.id"
    }
\`\`\``
    expect(result).toBe(expected)
  })
})

describe('erContentFromMergedSchema', () => {
  it.concurrent('generates ER content from MergedSchema', () => {
    const schema: MergedSchema = {
      dialect: 'pg',
      tables: [
        {
          name: 'user',
          tableName: 'user',
          dialect: 'pg',
          columns: [
            {
              name: 'id',
              sqlType: 'uuid',
              isPrimaryKey: true,
              isNotNull: true,
              isUnique: false,
              hasDefault: true,
              annotations: [],
            },
            {
              name: 'name',
              sqlType: 'varchar(255)',
              isPrimaryKey: false,
              isNotNull: true,
              isUnique: false,
              hasDefault: false,
              annotations: [{ type: 'description', key: 'description', value: 'Display name' }],
            },
          ],
          foreignKeys: [],
          annotations: [],
        },
        {
          name: 'post',
          tableName: 'post',
          dialect: 'pg',
          columns: [
            {
              name: 'id',
              sqlType: 'uuid',
              isPrimaryKey: true,
              isNotNull: true,
              isUnique: false,
              hasDefault: true,
              annotations: [],
            },
            {
              name: 'title',
              sqlType: 'varchar(255)',
              isPrimaryKey: false,
              isNotNull: true,
              isUnique: false,
              hasDefault: false,
              annotations: [],
            },
            {
              name: 'userId',
              sqlType: 'uuid',
              isPrimaryKey: false,
              isNotNull: true,
              isUnique: false,
              hasDefault: false,
              annotations: [],
            },
          ],
          foreignKeys: [
            {
              sourceTable: 'post',
              sourceColumns: ['userId'],
              foreignTable: 'user',
              foreignColumns: ['id'],
            },
          ],
          annotations: [],
        },
      ],
      relations: [],
      enums: [],
    }

    const result = erContentFromMergedSchema(schema)

    expect(result).toContain('```mermaid')
    expect(result).toContain('erDiagram')
    expect(result).toContain('user ||--}| post : "(id) - (userId)"')
    expect(result).toContain('user {')
    expect(result).toContain('uuid id PK')
    expect(result).toContain('string name "Display name"')
    expect(result).toContain('post {')
    expect(result).toContain('uuid userId FK')
    expect(result).toContain('```')
  })
})
