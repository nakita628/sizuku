import fs from 'node:fs'
import fsp from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'
import { sizukuArktype } from './index.js'

// Test run
// pnpm vitest run ./src/generator/arktype/index.test.ts

const TEST_CODE = [
  "export const user = mysqlTable('user', {",
  '  /// Primary key',
  "  /// @a.'string.uuid'",
  "  id: varchar('id', { length: 36 }).primaryKey(),",
  '  /// Display name',
  "  /// @a.'string'",
  "  name: varchar('name', { length: 50 }).notNull(),",
  '})',
  '',
  '/// @relation user.id post.userId one-to-many',
  "export const post = mysqlTable('post', {",
  '  /// Primary key',
  "  /// @a.'string.uuid'",
  "  id: varchar('id', { length: 36 }).primaryKey(),",
  '  /// Article title',
  "  /// @a.'string'",
  "  title: varchar('title', { length: 100 }).notNull(),",
  '  /// Body content (no length limit)',
  "  /// @a.'string'",
  "  content: varchar('content', { length: 65535 }).notNull(),",
  '  /// Foreign key referencing User.id',
  "  /// @a.'string.uuid'",
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
]

describe('sizukuArktype', () => {
  afterEach(() => {
    if (!fs.existsSync('tmp')) {
      fs.rmdirSync('tmp', { recursive: true })
    }
    if (fs.existsSync('tmp/arktype-test.ts')) {
      fs.unlinkSync('tmp/arktype-test.ts')
    }
  })

  it('sizukuArktype', async () => {
    await sizukuArktype(TEST_CODE, 'tmp/arktype-test.ts')
    const result = await fsp.readFile('tmp/arktype-test.ts', 'utf-8')
    const expected = `import { type } from 'arktype'

export const UserSchema = type({ id: 'string.uuid', name: 'string' })

export const PostSchema = type({
  id: 'string.uuid',
  title: 'string',
  content: 'string',
  userId: 'string.uuid',
})
`
    expect(result).toBe(expected)
  })

  it('sizukuArktype type true', async () => {
    await sizukuArktype(TEST_CODE, 'tmp/arktype-test.ts', false, true)
    const result = await fsp.readFile('tmp/arktype-test.ts', 'utf-8')
    const expected = `import { type } from 'arktype'

export const UserSchema = type({ id: 'string.uuid', name: 'string' })

export type User = typeof UserSchema.infer

export const PostSchema = type({
  id: 'string.uuid',
  title: 'string',
  content: 'string',
  userId: 'string.uuid',
})

export type Post = typeof PostSchema.infer
`
    expect(result).toBe(expected)
  })

  it('sizukuArktype with relation', async () => {
    await sizukuArktype(TEST_CODE, 'tmp/arktype-test.ts', false, false, true)
    const result = await fsp.readFile('tmp/arktype-test.ts', 'utf-8')
    const expected = `import { type } from 'arktype'

export const UserSchema = type({ id: 'string.uuid', name: 'string' })

export const PostSchema = type({
  id: 'string.uuid',
  title: 'string',
  content: 'string',
  userId: 'string.uuid',
})

export const UserRelationsSchema = type({ ...UserSchema.t, posts: PostSchema.array() })

export const PostRelationsSchema = type({ ...PostSchema.t, user: UserSchema })
`
    expect(result).toBe(expected)
  })
})
