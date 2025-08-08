import fs from 'node:fs'
import fsp from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'
import { sizukuValibot } from './index.js'

// Test run
// pnpm vitest run ./src/generator/valibot/index.test.ts

const TEST_CODE = [
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
]

describe('sizukuZod', () => {
  afterEach(() => {
    if (!fs.existsSync('tmp')) {
      fs.rmdirSync('tmp', { recursive: true })
    }
    if (fs.existsSync('tmp/valibot-test.ts')) {
      fs.unlinkSync('tmp/valibot-test.ts')
    }
  })

  it('sizukuValibot', async () => {
    await sizukuValibot(TEST_CODE, 'tmp/valibot-test.ts')
    const result = await fsp.readFile('tmp/valibot-test.ts', 'utf-8')
    const expected = `import * as v from 'valibot'

export const UserSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(50)),
})

export const PostSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  title: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
  content: v.string(),
  userId: v.pipe(v.string(), v.uuid()),
})
`
    expect(result).toBe(expected)
  })

  it('sizukuValibot comment true', async () => {
    await sizukuValibot(TEST_CODE, 'tmp/valibot-test.ts', true)
    const result = await fsp.readFile('tmp/valibot-test.ts', 'utf-8')
    const expected = `import * as v from 'valibot'

export const UserSchema = v.object({
  /**
   * Primary key
   */
  id: v.pipe(v.string(), v.uuid()),
  /**
   * Display name
   */
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(50)),
})

export const PostSchema = v.object({
  /**
   * Primary key
   */
  id: v.pipe(v.string(), v.uuid()),
  /**
   * Article title
   */
  title: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
  /**
   * Body content (no length limit)
   */
  content: v.string(),
  /**
   * Foreign key referencing User.id
   */
  userId: v.pipe(v.string(), v.uuid()),
})
`
    expect(result).toBe(expected)
  })

  it('sizukuValibot type true', async () => {
    await sizukuValibot(TEST_CODE, 'tmp/valibot-test.ts', false, true)
    const result = await fsp.readFile('tmp/valibot-test.ts', 'utf-8')
    const expected = `import * as v from 'valibot'

export const UserSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(50)),
})

export type User = v.InferInput<typeof UserSchema>

export const PostSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  title: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
  content: v.string(),
  userId: v.pipe(v.string(), v.uuid()),
})

export type Post = v.InferInput<typeof PostSchema>
`
    expect(result).toBe(expected)
  })
})
