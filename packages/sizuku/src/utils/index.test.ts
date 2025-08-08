import { describe, expect, it } from 'vitest'
import { capitalize, extractFieldComments, infer, inferInput, parseFieldComments } from './index'

// Test run
// pnpm vitest run ./src/utils/index.test.ts

describe('utils', () => {
  it.concurrent('capitalize', () => {
    expect(capitalize('user')).toBe('User')
  })
  it.concurrent('parseFieldComments', () => {
    expect(
      parseFieldComments(
        ['/// Primary key', '/// @z.uuid()', '/// @v.pipe(v.string(), v.uuid())'],
        '@z.',
      ),
    ).toStrictEqual({ definition: 'z.uuid()', description: 'Primary key' })
    expect(
      parseFieldComments(
        ['/// Primary key', '/// @z.uuid()', '/// @v.pipe(v.string(), v.uuid())'],
        '@v.',
      ),
    ).toStrictEqual({ definition: 'v.pipe(v.string(), v.uuid())', description: 'Primary key' })
  })
  it.concurrent('extractFieldComments', () => {
    const sourceText = `export const user = mysqlTable('user', {
  /// Primary key
  /// @z.uuid()
  /// @v.pipe(v.string(), v.uuid())
  id: varchar('id', { length: 36 }).primaryKey(),
  /// Display name
  /// @z.string().min(1).max(50)
  /// @v.pipe(v.string(), v.minLength(1), v.maxLength(50))
  name: varchar('name', { length: 50 }).notNull(),
})

/// @relation user.id post.userId one-to-many
export const post = mysqlTable('post', {
  /// Primary key
  /// @z.uuid()
  /// @v.pipe(v.string(), v.uuid())
  id: varchar('id', { length: 36 }).primaryKey(),
  /// Article title
  /// @z.string().min(1).max(100)
  /// @v.pipe(v.string(), v.minLength(1), v.maxLength(100))
  title: varchar('title', { length: 100 }).notNull(),
  /// Body content (no length limit)
  /// @z.string().min(1).max(65535)
  /// @v.pipe(v.string(), v.minLength(1), v.maxLength(65535))
  content: varchar('content', { length: 65535 }).notNull(),
  /// Foreign key referencing User.id
  /// @z.uuid()
  /// @v.pipe(v.string(), v.uuid())
  userId: varchar('user_id', { length: 36 }).notNull(),
})

export const userRelations = relations(user, ({ many }) => ({
  posts: many(post),
}))

export const postRelations = relations(post, ({ one }) => ({
  user: one(user, {
    fields: [post.userId],
    references: [user.id],
  }),
}))`
    const fieldStartPos = 113
    const result = extractFieldComments(sourceText, fieldStartPos)
    expect(result).toStrictEqual([
      '/// Primary key',
      '/// @z.uuid()',
      '/// @v.pipe(v.string(), v.uuid())',
    ])
  })

  it.concurrent('infer', () => {
    expect(infer('User')).toBe('export type User = z.infer<typeof UserSchema>')
  })
  it.concurrent('inferInput', () => {
    expect(inferInput('User')).toBe('export type User = v.InferInput<typeof UserSchema>')
  })
})
