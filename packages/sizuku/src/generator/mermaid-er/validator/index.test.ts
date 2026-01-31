import { describe, expect, it } from 'vitest'
import { extractRelationsFromSchema, parseTableInfo } from '.'

// Test run
// pnpm vitest run ./src/generator/mermaid-er/validator/parse-table-info.test.ts

describe('parseTableInfo', () => {
  it.concurrent('parseTableInfo Test', () => {
    const result = parseTableInfo([
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
            keyType: null,
            description: 'Foreign key referencing User.id',
          },
        ],
      },
    ]
    expect(result).toStrictEqual(expected)
  })
})

describe('extractRelationsFromSchema', () => {
  it.concurrent('extracts relations from foreignKey constraints', () => {
    const code = [
      "export const User = sqliteTable('User', {",
      "  id: text('id').notNull().primaryKey(),",
      "  name: text('name').notNull(),",
      '})',
      '',
      'export const Post = sqliteTable(',
      "  'Post',",
      '  {',
      "    id: text('id').notNull().primaryKey(),",
      "    userId: text('userId').notNull(),",
      '  },',
      '  (Post) => ({',
      '    Post_user_fkey: foreignKey({',
      "      name: 'Post_user_fkey',",
      '      columns: [Post.userId],',
      '      foreignColumns: [User.id],',
      '    }),',
      '  }),',
      ')',
    ]

    const relations = extractRelationsFromSchema(code)
    expect(relations.length).toBeGreaterThan(0)
    expect(relations).toContainEqual({
      fromModel: 'User',
      toModel: 'Post',
      fromField: 'id',
      toField: 'userId',
      isRequired: true,
    })
  })

  it.concurrent('extracts relations from relations() blocks', () => {
    const code = [
      "export const User = sqliteTable('User', {",
      "  id: text('id').notNull().primaryKey(),",
      '})',
      '',
      "export const Post = sqliteTable('Post', {",
      "  id: text('id').notNull().primaryKey(),",
      "  userId: text('userId').notNull(),",
      '})',
      '',
      'export const PostRelations = relations(Post, ({ one }) => ({',
      '  user: one(User, {',
      '    fields: [Post.userId],',
      '    references: [User.id],',
      '  }),',
      '}))',
    ]

    const relations = extractRelationsFromSchema(code)
    expect(relations.length).toBeGreaterThan(0)
    expect(relations).toContainEqual({
      fromModel: 'User',
      toModel: 'Post',
      fromField: 'id',
      toField: 'userId',
      isRequired: true,
    })
  })

  it.concurrent('extracts relations from .references() calls', () => {
    const code = [
      "export const user = mysqlTable('user', {",
      "  id: varchar('id', { length: 36 }).primaryKey(),",
      '})',
      '',
      "export const post = mysqlTable('post', {",
      "  id: varchar('id', { length: 36 }).primaryKey(),",
      "  userId: varchar('user_id', { length: 36 }).notNull().references(() => user.id),",
      '})',
    ]

    const relations = extractRelationsFromSchema(code)
    expect(relations.length).toBeGreaterThan(0)
    expect(relations).toContainEqual({
      fromModel: 'user',
      toModel: 'post',
      fromField: 'id',
      toField: 'userId',
      isRequired: true,
    })
  })
})
