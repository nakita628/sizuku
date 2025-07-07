import { describe, expect, it, afterEach } from 'vitest'
import { sizukuMermaidER } from './index.js'
import fs from 'node:fs'
import fsp from 'node:fs/promises'

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

describe('sizukuMermaidER', () => {
  afterEach(async () => {
    if (fs.existsSync('tmp')) {
      await fsp.rmdir('tmp', { recursive: true })
    }
  })
  it('sizukuMermaidER', async () => {
    await sizukuMermaidER(TEST_CODE, 'tmp/mermaid-er-test.md')
    const result = await fsp.readFile('tmp/mermaid-er-test.md', 'utf-8')
    const expected = `\`\`\`mermaid
erDiagram
    user ||--}| post : "(id) - (userId)"
    user {
        varchar id "(PK) Primary key"
        varchar name "Display name"
    }
    post {
        varchar id "(PK) Primary key"
        varchar title "Article title"
        varchar content "Body content (no length limit)"
        varchar userId "Foreign key referencing User.id"
    }
\`\`\``
    expect(result).toBe(expected)
  })
})
