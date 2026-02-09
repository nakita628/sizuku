import { describe, expect, it } from 'vitest'
import { extractSchemas, extractValibotSchemas, extractZodSchemas } from './extract-schemas.js'

// Test run
// pnpm vitest run ./src/helper/extract-schemas.test.ts

describe('extractSchemas', () => {
  const sourceCode = [
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

  const expectedZodSchemas = [
    {
      name: 'user',
      fields: [
        {
          name: 'id',
          definition: 'z.uuid()',
          description: 'Primary key',
        },
        {
          name: 'name',
          definition: 'z.string().min(1).max(50)',
          description: 'Display name',
        },
      ],
      objectType: undefined,
    },
    {
      name: 'post',
      fields: [
        {
          name: 'id',
          definition: 'z.uuid()',
          description: 'Primary key',
        },
        {
          name: 'title',
          definition: 'z.string().min(1).max(100)',
          description: 'Article title',
        },
        {
          name: 'content',
          definition: 'z.string()',
          description: 'Body content (no length limit)',
        },
        {
          name: 'userId',
          definition: 'z.uuid()',
          description: 'Foreign key referencing User.id',
        },
      ],
      objectType: undefined,
    },
  ]

  const expectedValibotSchemas = [
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
      objectType: undefined,
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
      objectType: undefined,
    },
  ]

  it.concurrent('extractSchemas with zod library', () => {
    const result = extractSchemas(sourceCode, 'zod')
    expect(result).toStrictEqual(expectedZodSchemas)
  })

  it.concurrent('extractSchemas with valibot library', () => {
    const result = extractSchemas(sourceCode, 'valibot')
    expect(result).toStrictEqual(expectedValibotSchemas)
  })

  it.concurrent('extractZodSchemas (alias function)', () => {
    const result = extractZodSchemas(sourceCode)
    expect(result).toStrictEqual(expectedZodSchemas)
  })

  it.concurrent('extractValibotSchemas (alias function)', () => {
    const result = extractValibotSchemas(sourceCode)
    expect(result).toStrictEqual(expectedValibotSchemas)
  })

  it.concurrent('extractSchemas with strictObject and looseObject', () => {
    const sourceCodeWithObjectTypes = [
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
    ]

    const resultZod = extractSchemas(sourceCodeWithObjectTypes, 'zod')
    expect(resultZod[0].objectType).toBe('strict')
    expect(resultZod[1].objectType).toBe('loose')

    const resultValibot = extractSchemas(sourceCodeWithObjectTypes, 'valibot')
    expect(resultValibot[0].objectType).toBe('strict')
    expect(resultValibot[1].objectType).toBe('loose')
  })
})
