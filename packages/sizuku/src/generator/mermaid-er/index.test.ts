import fs from 'node:fs'
import fsp from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'
import { sizukuMermaidER } from './index.js'

// Test run
// pnpm vitest run ./src/generator/mermaid-er/index.test.ts

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
  "  userId: varchar('user_id', { length: 36 }).notNull().references(() => user.id),",
  '})',
  '',
]

const TEST_CODE_WITHOUT_COMMENTS = [
  "export const user = mysqlTable('user', {",
  "  id: varchar('id', { length: 36 }).primaryKey(),",
  "  name: varchar('name', { length: 50 }).notNull(),",
  '})',
  '',
  "export const post = mysqlTable('post', {",
  "  id: varchar('id', { length: 36 }).primaryKey(),",
  "  title: varchar('title', { length: 100 }).notNull(),",
  "  content: varchar('content', { length: 65535 }).notNull(),",
  "  userId: varchar('user_id', { length: 36 }).notNull().references(() => user.id),",
  '})',
  '',
]

// Test code with foreignKey() constraints
const TEST_CODE_WITH_FOREIGN_KEY = [
  "import { foreignKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'",
  '',
  "export const User = sqliteTable('User', {",
  "  id: text('id').notNull().primaryKey(),",
  "  name: text('name').notNull(),",
  '})',
  '',
  'export const Post = sqliteTable(',
  "  'Post',",
  '  {',
  "    id: text('id').notNull().primaryKey(),",
  "    body: text('body').notNull(),",
  "    userId: text('userId').notNull(),",
  '  },',
  '  (Post) => ({',
  '    Post_user_fkey: foreignKey({',
  "      name: 'Post_user_fkey',",
  '      columns: [Post.userId],',
  '      foreignColumns: [User.id],',
  '    })',
  '      .onDelete("cascade")',
  '      .onUpdate("cascade"),',
  '  }),',
  ')',
  '',
]

// Test code with relations() blocks
const TEST_CODE_WITH_RELATIONS_BLOCK = [
  "import { relations } from 'drizzle-orm'",
  "import { sqliteTable, text } from 'drizzle-orm/sqlite-core'",
  '',
  "export const User = sqliteTable('User', {",
  "  id: text('id').notNull().primaryKey(),",
  "  name: text('name').notNull(),",
  '})',
  '',
  "export const Post = sqliteTable('Post', {",
  "  id: text('id').notNull().primaryKey(),",
  "  body: text('body').notNull(),",
  "  userId: text('userId').notNull(),",
  '})',
  '',
  'export const PostRelations = relations(Post, ({ one }) => ({',
  '  user: one(User, {',
  '    fields: [Post.userId],',
  '    references: [User.id],',
  '  }),',
  '}))',
  '',
]

// Test code without imports (simulates how sizuku actually processes code)
const TEST_CODE_WITHOUT_IMPORTS = [
  "export const User = sqliteTable('User', {",
  "  id: text('id').notNull().primaryKey(),",
  "  name: text('name').notNull(),",
  '})',
  '',
  'export const Post = sqliteTable(',
  "  'Post',",
  '  {',
  "    id: text('id').notNull().primaryKey(),",
  "    body: text('body').notNull(),",
  "    userId: text('userId').notNull(),",
  '  },',
  '  (Post) => ({',
  '    Post_user_fkey: foreignKey({',
  "      name: 'Post_user_fkey',",
  '      columns: [Post.userId],',
  '      foreignColumns: [User.id],',
  '    })',
  '      .onDelete("cascade")',
  '      .onUpdate("cascade"),',
  '  }),',
  ')',
  '',
  'export const PostRelations = relations(Post, ({ one }) => ({',
  '  user: one(User, {',
  '    fields: [Post.userId],',
  '    references: [User.id],',
  '  }),',
  '}))',
  '',
]

describe('sizukuMermaidER', () => {
  afterEach(() => {
    if (!fs.existsSync('tmp')) {
      fs.rmdirSync('tmp', { recursive: true })
    }
    if (fs.existsSync('tmp/mermaid-er-test.md')) {
      fs.unlinkSync('tmp/mermaid-er-test.md')
    }
  })
  it('sizukuMermaidER', async () => {
    await sizukuMermaidER(TEST_CODE, 'tmp/mermaid-er-test.md')
    const result = await fsp.readFile('tmp/mermaid-er-test.md', 'utf-8')
    const expected = `\`\`\`mermaid
erDiagram
    user ||--}| post : "(id) - (userId)"
    user {
        varchar id PK "Primary key"
        varchar name "Display name"
    }
    post {
        varchar id PK "Primary key"
        varchar title "Article title"
        varchar content "Body content (no length limit)"
        varchar userId FK "Foreign key referencing User.id"
    }
\`\`\``
    expect(result).toBe(expected)
  })

  it('sizukuMermaidER without comments', async () => {
    await sizukuMermaidER(TEST_CODE_WITHOUT_COMMENTS, 'tmp/mermaid-er-test.md')
    const result = await fsp.readFile('tmp/mermaid-er-test.md', 'utf-8')
    const expected = `\`\`\`mermaid
erDiagram
    user ||--}| post : "(id) - (userId)"
    user {
        varchar id PK
        varchar name
    }
    post {
        varchar id PK
        varchar title
        varchar content
        varchar userId FK
    }
\`\`\``
    expect(result).toBe(expected)
  })

  it('detects relations from foreignKey() constraints', async () => {
    await sizukuMermaidER(TEST_CODE_WITH_FOREIGN_KEY, 'tmp/mermaid-er-test.md')
    const result = await fsp.readFile('tmp/mermaid-er-test.md', 'utf-8')
    // Check that relation is detected
    expect(result).toContain('User ||--}| Post')
    expect(result).toContain('(id) - (userId)')
  })

  it('detects relations from relations() blocks', async () => {
    await sizukuMermaidER(TEST_CODE_WITH_RELATIONS_BLOCK, 'tmp/mermaid-er-test.md')
    const result = await fsp.readFile('tmp/mermaid-er-test.md', 'utf-8')
    // Check that relation is detected
    expect(result).toContain('User ||--}| Post')
    expect(result).toContain('(id) - (userId)')
  })

  it('detects relations without imports (simulates real usage)', async () => {
    await sizukuMermaidER(TEST_CODE_WITHOUT_IMPORTS, 'tmp/mermaid-er-test.md')
    const result = await fsp.readFile('tmp/mermaid-er-test.md', 'utf-8')
    // Check that relation is detected from both foreignKey() and relations()
    expect(result).toContain('User ||--}| Post')
    expect(result).toContain('(id) - (userId)')
  })
})
