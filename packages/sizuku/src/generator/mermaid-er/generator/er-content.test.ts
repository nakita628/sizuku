import { describe, expect, it } from 'vitest'
import { erContent } from '.'

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
          type: 'one-to-many',
        },
      ],
      [
        {
          name: 'user',
          fields: [
            {
              name: 'id',
              type: 'varchar',
              description: '(PK) Primary key',
            },
            {
              name: 'name',
              type: 'varchar',
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
              description: '(PK) Primary key',
            },
            {
              name: 'title',
              type: 'varchar',
              description: 'Article title',
            },
            {
              name: 'content',
              type: 'varchar',
              description: 'Body content (no length limit)',
            },
            {
              name: 'userId',
              type: 'varchar',
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
        varchar id "(PK) Primary key"
        varchar name "Display name"
    }
    post {
        varchar id "(PK) Primary key"
        varchar title "Article title"
        varchar content "Body content (no length limit)"
        varchar userId "Foreign key referencing User.id"
    }
\`\`\``
    expect(result).toBe(expected)
  })
})
