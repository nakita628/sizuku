import { describe, expect, it } from 'vitest'
import { generateERContent } from './generate-er-content'
import { Relation, TableInfo } from '../type'

const generateERContentTestCases: {
  relations: Relation[]
  tables: TableInfo[]
  expected: string
}[] = [
  {
    relations: [
      {
        fromModel: 'user',
        fromField: 'id',
        toModel: 'post',
        toField: 'userId',
        type: 'one-to-many'
      },
      {
        fromModel: 'post',
        fromField: 'id',
        toModel: 'likes',
        toField: 'postId',
        type: 'one-to-many'
      },
      {
        fromModel: 'user',
        fromField: 'id',
        toModel: 'likes',
        toField: 'userId',
        type: 'one-to-many'
      }
    ],
    tables: [
      {
        "name": "user",
        "fields": [
          {
            "name": "id",
            "type": "varchar",
            "description": "(PK) Unique identifier for the user."
          },
          {
            "name": "username",
            "type": "varchar",
            "description": "Username of the user."
          },
          {
            "name": "email",
            "type": "varchar",
            "description": "Email address of the user."
          },
          {
            "name": "password",
            "type": "varchar",
            "description": "Password for the user."
          },
          {
            "name": "createdAt",
            "type": "timestamp",
            "description": "Timestamp when the user was created."
          },
          {
            "name": "updatedAt",
            "type": "timestamp",
            "description": "Timestamp when the user was last updated."
          }
        ]
      },
      {
        "name": "post",
        "fields": [
          {
            "name": "id",
            "type": "varchar",
            "description": "(PK) Unique identifier for the post."
          },
          {
            "name": "userId",
            "type": "varchar",
            "description": "(FK) ID of the user who created the post."
          },
          {
            "name": "content",
            "type": "varchar",
            "description": "Content of the post."
          },
          {
            "name": "createdAt",
            "type": "timestamp",
            "description": "Timestamp when the post was created."
          },
          {
            "name": "updatedAt",
            "type": "timestamp",
            "description": "Timestamp when the post was last updated."
          }
        ]
      },
      {
        "name": "likes",
        "fields": [
          {
            "name": "id",
            "type": "varchar",
            "description": "(PK) Unique identifier for the like."
          },
          {
            "name": "postId",
            "type": "varchar",
            "description": "(FK) ID of the post that is liked."
          },
          {
            "name": "userId",
            "type": "varchar",
            "description": "(FK) ID of the user who liked the post."
          },
          {
            "name": "createdAt",
            "type": "timestamp",
            "description": "Timestamp when the like was created."
          }
        ]
      }
    ],
    expected: `\`\`\`mermaid
erDiagram
    user ||--o{ post : "(id) - (userId)"
    post ||--o{ likes : "(id) - (postId)"
    user ||--o{ likes : "(id) - (userId)"
    user {
        varchar id "(PK) Unique identifier for the user."
        varchar username "Username of the user."
        varchar email "Email address of the user."
        varchar password "Password for the user."
        timestamp createdAt "Timestamp when the user was created."
        timestamp updatedAt "Timestamp when the user was last updated."
    }
    post {
        varchar id "(PK) Unique identifier for the post."
        varchar userId "(FK) ID of the user who created the post."
        varchar content "Content of the post."
        timestamp createdAt "Timestamp when the post was created."
        timestamp updatedAt "Timestamp when the post was last updated."
    }
    likes {
        varchar id "(PK) Unique identifier for the like."
        varchar postId "(FK) ID of the post that is liked."
        varchar userId "(FK) ID of the user who liked the post."
        timestamp createdAt "Timestamp when the like was created."
    }
\`\`\``,
  },
]

describe('generateERContent', () => {
  it.concurrent.each(generateERContentTestCases)(
    'generateERContent($relations, $tables) -> $expected',
    ({ relations, tables, expected }) => {
      const result = generateERContent(relations, tables)
      expect(result).toEqual(expected)
    },
  )
})
