import fs from 'node:fs'
import fsp from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'
import { sizukuZod } from './index.js'

// Test run
// pnpm vitest run ./src/generator/zod/index.test.ts

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

const TEST_CODE_WITH_OBJECT_TYPES = [
  '/// @z.strictObject',
  '/// @v.strictObject',
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
  '/// @z.looseObject',
  '/// @v.looseObject',
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
  '/// @z.strictObject',
  '/// @v.strictObject',
  'export const userRelations = relations(user, ({ many }) => ({',
  '  posts: many(post),',
  '}))',
  '',
  '/// @z.strictObject',
  '/// @v.strictObject',
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
    if (fs.existsSync('tmp/zod-test.ts')) {
      fs.unlinkSync('tmp/zod-test.ts')
    }
  })

  it('sizukuZod', async () => {
    await sizukuZod(TEST_CODE, 'tmp/zod-test.ts')
    const result = await fsp.readFile('tmp/zod-test.ts', 'utf-8')
    const expected = `import * as z from 'zod'

export const UserSchema = z.object({ id: z.uuid(), name: z.string().min(1).max(50) })

export const PostSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(100),
  content: z.string(),
  userId: z.uuid(),
})
`
    expect(result).toBe(expected)
  })

  it('sizukuZod comment true', async () => {
    await sizukuZod(TEST_CODE, 'tmp/zod-test.ts', true)
    const result = await fsp.readFile('tmp/zod-test.ts', 'utf-8')

    const expected = `import * as z from 'zod'

export const UserSchema = z.object({
  /**
   * Primary key
   */
  id: z.uuid(),
  /**
   * Display name
   */
  name: z.string().min(1).max(50),
})

export const PostSchema = z.object({
  /**
   * Primary key
   */
  id: z.uuid(),
  /**
   * Article title
   */
  title: z.string().min(1).max(100),
  /**
   * Body content (no length limit)
   */
  content: z.string(),
  /**
   * Foreign key referencing User.id
   */
  userId: z.uuid(),
})
`
    expect(result).toBe(expected)
  })

  it('sizukuZod type true', async () => {
    await sizukuZod(TEST_CODE, 'tmp/zod-test.ts', false, true)
    const result = await fsp.readFile('tmp/zod-test.ts', 'utf-8')
    const expected = `import * as z from 'zod'

export const UserSchema = z.object({ id: z.uuid(), name: z.string().min(1).max(50) })

export type User = z.infer<typeof UserSchema>

export const PostSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(100),
  content: z.string(),
  userId: z.uuid(),
})

export type Post = z.infer<typeof PostSchema>
`
    expect(result).toBe(expected)
  })

  it('sizukuZod zod @hono/zod-openapi', async () => {
    await sizukuZod(TEST_CODE, 'tmp/zod-test.ts', false, false, '@hono/zod-openapi')
    const result = await fsp.readFile('tmp/zod-test.ts', 'utf-8')
    const expected = `import { z } from '@hono/zod-openapi'

export const UserSchema = z.object({ id: z.uuid(), name: z.string().min(1).max(50) })

export const PostSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(100),
  content: z.string(),
  userId: z.uuid(),
})
`
    expect(result).toBe(expected)
  })

  it('sizukuZod with strictObject and looseObject', async () => {
    await sizukuZod(TEST_CODE_WITH_OBJECT_TYPES, 'tmp/zod-test.ts')
    const result = await fsp.readFile('tmp/zod-test.ts', 'utf-8')
    const expected = `import * as z from 'zod'

export const UserSchema = z.strictObject({ id: z.uuid(), name: z.string().min(1).max(50) })

export const PostSchema = z.looseObject({
  id: z.uuid(),
  title: z.string().min(1).max(100),
  content: z.string(),
  userId: z.uuid(),
})
`
    expect(result).toBe(expected)
  })

  it('sizukuZod with strictObject and looseObject with relations', async () => {
    await sizukuZod(TEST_CODE_WITH_OBJECT_TYPES, 'tmp/zod-test.ts', false, false, undefined, true)
    const result = await fsp.readFile('tmp/zod-test.ts', 'utf-8')
    const expected = `import * as z from 'zod'

export const UserSchema = z.strictObject({ id: z.uuid(), name: z.string().min(1).max(50) })

export const PostSchema = z.looseObject({
  id: z.uuid(),
  title: z.string().min(1).max(100),
  content: z.string(),
  userId: z.uuid(),
})

export const UserRelationsSchema = z.strictObject({
  ...UserSchema.shape,
  posts: z.array(PostSchema),
})

export const PostRelationsSchema = z.looseObject({ ...PostSchema.shape, user: UserSchema })
`
    expect(result).toBe(expected)
  })
})
