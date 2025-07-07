import { describe, expect, it } from 'vitest'
import { extractSchemas } from './extract-schema'

// Test run
// pnpm vitest run ./src/generator/valibot/core/extract-schema.test.ts

describe('extractSchemas', () => {
  it.concurrent('extractSchemas Test', () => {
    const result = extractSchemas([
      "export const user = mysqlTable('user', {",
      '  /// Primary key',
      '  /// @z.uuid()',
      '  /// @v.pipe(v.string(), v.uuid())',
      "  id: varchar('id', { length: 36 }).primaryKey(),",
      '  /// Display name',
      '  /// @z.string().min(1).max(50)',
      '  /// @v.pipe(v.string(), v.minLength(1), v.maxLength(50))',
      "  name: varchar('name', { length: 50 }).notNull(),",
      '})',
      '',
      '/// @relation user.id post.userId one-to-many',
      "export const post = mysqlTable('post', {",
      '  /// Primary key',
      '  /// @z.uuid()',
      '  /// @v.pipe(v.string(), v.uuid())',
      "  id: varchar('id', { length: 36 }).primaryKey(),",
      '  /// Article title',
      '  /// @z.string().min(1).max(100)',
      '  /// @v.pipe(v.string(), v.minLength(1), v.maxLength(100))',
      "  title: varchar('title', { length: 100 }).notNull(),",
      '  /// Body content (no length limit)',
      '  /// @z.string()',
      '  /// @v.string()',
      "  content: varchar('content', { length: 65535 }).notNull(),",
      '  /// Foreign key referencing User.id',
      '  /// @z.uuid()',
      '  /// @v.pipe(v.string(), v.uuid())',
      "  userId: varchar('user_id', { length: 36 }).notNull(),",
      '})',
      '',
      'export const userRelations = relations(user, ({ many }) => ({',
      '  posts: many(post),',
      '}))',
      '',
      'export const postRelations = relations(post, ({ one }) => ({',
      '  user: one(user, {',
      '    fields: [post.userId],',
      '    references: [user.id],',
      '  }),',
      '}))',
      '',
    ])

    const expected = [
      {
        name: 'user',
        fields: [
          {
            name: 'id',
            definition: 'v.pipe(v.string(), v.uuid())',
            description: 'Primary key',
          },
          {
            name: 'name',
            definition: 'v.pipe(v.string(), v.minLength(1), v.maxLength(50))',
            description: 'Display name',
          },
        ],
      },
      {
        name: 'post',
        fields: [
          {
            name: 'id',
            definition: 'v.pipe(v.string(), v.uuid())',
            description: 'Primary key',
          },
          {
            name: 'title',
            definition: 'v.pipe(v.string(), v.minLength(1), v.maxLength(100))',
            description: 'Article title',
          },
          {
            name: 'content',
            definition: 'v.string()',
            description: 'Body content (no length limit)',
          },
          {
            name: 'userId',
            definition: 'v.pipe(v.string(), v.uuid())',
            description: 'Foreign key referencing User.id',
          },
        ],
      },
    ]
    expect(result).toStrictEqual(expected)
  })
})
