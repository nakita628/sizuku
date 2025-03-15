import { describe, expect, it } from 'vitest'
import { extractSchemas } from './extract-schema'

const extractSchemasTestCases = [
  {
    lines: [
      "export const user = mysqlTable('user', {",
      '  /// (PK) Unique identifier for the user.',
      '  /// @z.string().uuid()',
      '  /// @v.pipe(v.string(), v.uuid())',
      "  id: varchar('id', { length: 36 }).primaryKey(),",
      '  /// Username of the user.',
      '  /// @z.string()',
      '  /// @v.string()',
      "  username: varchar('username', { length: 255 }).notNull(),",
      '  /// Email address of the user.',
      '  /// @z.string().email()',
      '  /// @v.pipe(v.string(), v.email())',
      "  email: varchar('email', { length: 255 }).notNull().unique(),",
      '  /// Password for the user.',
      '  /// @z.string().min(8).max(100)',
      '  /// @v.pipe(v.string(), v.minLength(8), v.maxLength(100))',
      "  password: varchar('password', { length: 100 }).notNull(),",
      '  /// Timestamp when the user was created.',
      '  /// @z.date()',
      '  /// @v.date()',
      "  createdAt: timestamp('created_at', { mode: 'string' }).notNull().default(sql`CURRENT_TIMESTAMP`),",
      '  /// Timestamp when the user was last updated.',
      '  /// @z.date()',
      '  /// @v.date()',
      "  updatedAt: timestamp('updated_at', { mode: 'string' })",
      '    .notNull()',
      '    .default(sql`CURRENT_TIMESTAMP`)',
      '    .$onUpdate(() => sql`CURRENT_TIMESTAMP`),',
      '})',
      '',
      '/// @relation user.id post.userId one-to-many',
      "export const post = mysqlTable('post', {",
      '  /// (PK) Unique identifier for the post.',
      '  /// @z.string().uuid()',
      '  /// @v.pipe(v.string(), v.uuid())',
      "  id: varchar('id', { length: 36 }).primaryKey(),",
      '  /// (FK) ID of the user who created the post.',
      '  /// @z.string().uuid()',
      '  /// @v.pipe(v.string(), v.uuid())',
      "  userId: varchar('user_id', { length: 36 })",
      '    .notNull()',
      "    .references(() => user.id, { onDelete: 'cascade' }),",
      '  /// Content of the post.',
      '  /// @z.string()',
      '  /// @v.string()',
      "  content: varchar('content', { length: 500 }).notNull(),",
      '  /// Timestamp when the post was created.',
      '  /// @z.date()',
      '  /// @v.date()',
      "  createdAt: timestamp('created_at', { mode: 'string' }).notNull().default(sql`CURRENT_TIMESTAMP`),",
      '  /// Timestamp when the post was last updated.',
      '  /// @z.date()',
      '  /// @v.date()',
      "  updatedAt: timestamp('updated_at', { mode: 'string' })",
      '    .notNull()',
      '    .default(sql`CURRENT_TIMESTAMP`)',
      '    .$onUpdate(() => sql`CURRENT_TIMESTAMP`),',
      '})',
      '',
      '/// @relation post.id likes.postId one-to-many',
      '/// @relation user.id likes.userId one-to-many',
      'export const likes = mysqlTable(',
      "  'likes',",
      '  {',
      '    /// (PK) Unique identifier for the like.',
      '    /// @z.string().uuid()',
      '    /// @v.pipe(v.string(), v.uuid())',
      "    id: varchar('id', { length: 36 }).primaryKey(),",
      '    /// (FK) ID of the post that is liked.',
      '    /// @z.string().uuid()',
      '    /// @v.pipe(v.string(), v.uuid())',
      "    postId: varchar('post_id', { length: 36 })",
      '      .notNull()',
      "      .references(() => post.id, { onDelete: 'cascade' }),",
      '    /// (FK) ID of the user who liked the post.',
      '    /// @z.string().uuid()',
      '    /// @v.pipe(v.string(), v.uuid())',
      "    userId: varchar('user_id', { length: 36 })",
      '      .notNull()',
      "      .references(() => user.id, { onDelete: 'cascade' }),",
      '    /// Timestamp when the like was created.',
      '    /// @z.date()',
      '    /// @v.date()',
      "    createdAt: timestamp('created_at', { mode: 'string' })",
      '      .notNull()',
      '      .default(sql`CURRENT_TIMESTAMP`),',
      '  },',
      '  (t) => [unique().on(t.userId, t.postId)],',
      ')',
      ''
    ],
    expected: [
      {
        "name": "user",
        "fields": [
          {
            "name": "id",
            "definition": "v.pipe(v.string(), v.uuid())",
            "description": "(PK) Unique identifier for the user."
          },
          {
            "name": "username",
            "definition": "v.string()",
            "description": "Username of the user."
          },
          {
            "name": "email",
            "definition": "v.pipe(v.string(), v.email())",
            "description": "Email address of the user."
          },
          {
            "name": "password",
            "definition": "v.pipe(v.string(), v.minLength(8), v.maxLength(100))",
            "description": "Password for the user."
          },
          {
            "name": "createdAt",
            "definition": "v.date()",
            "description": "Timestamp when the user was created."
          },
          {
            "name": "updatedAt",
            "definition": "v.date()",
            "description": "Timestamp when the user was last updated."
          }
        ]
      },
      {
        "name": "post",
        "fields": [
          {
            "name": "id",
            "definition": "v.pipe(v.string(), v.uuid())",
            "description": "(PK) Unique identifier for the post."
          },
          {
            "name": "userId",
            "definition": "v.pipe(v.string(), v.uuid())",
            "description": "(FK) ID of the user who created the post."
          },
          {
            "name": "content",
            "definition": "v.string()",
            "description": "Content of the post."
          },
          {
            "name": "createdAt",
            "definition": "v.date()",
            "description": "Timestamp when the post was created."
          },
          {
            "name": "updatedAt",
            "definition": "v.date()",
            "description": "Timestamp when the post was last updated."
          }
        ]
      },
      {
        "name": "likes",
        "fields": [
          {
            "name": "id",
            "definition": "v.pipe(v.string(), v.uuid())",
            "description": "(PK) Unique identifier for the like."
          },
          {
            "name": "postId",
            "definition": "v.pipe(v.string(), v.uuid())",
            "description": "(FK) ID of the post that is liked."
          },
          {
            "name": "userId",
            "definition": "v.pipe(v.string(), v.uuid())",
            "description": "(FK) ID of the user who liked the post."
          },
          {
            "name": "createdAt",
            "definition": "v.date()",
            "description": "Timestamp when the like was created."
          }
        ]
      }
    ]
  },
]

describe('extractSchemas', () => {
  it.concurrent.each(extractSchemasTestCases)(
    'extractSchemas($input) -> $expected',
    ({ lines, expected }) => {
      const result = extractSchemas(lines)
      expect(result).toEqual(expected)
    },
  )
})
