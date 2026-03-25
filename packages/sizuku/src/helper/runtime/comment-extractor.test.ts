import { describe, expect, it } from 'vitest'
import {
  createEmptyCommentInfo,
  extractCommentsFromSource,
  parseAnnotations,
} from './comment-extractor.js'

describe('parseAnnotations', () => {
  it('parses zod annotation', () => {
    const result = parseAnnotations('@z.string().min(1)')
    expect(result).toStrictEqual([
      { type: 'zod', key: 'schema', value: 'string().min(1)' },
    ])
  })

  it('parses valibot annotation', () => {
    const result = parseAnnotations('@v.pipe(v.string(), v.email())')
    expect(result).toStrictEqual([
      { type: 'valibot', key: 'schema', value: 'pipe(v.string(), v.email())' },
    ])
  })

  it('parses arktype annotation', () => {
    const result = parseAnnotations('@a."string.uuid"')
    expect(result).toStrictEqual([
      { type: 'arktype', key: 'schema', value: '"string.uuid"' },
    ])
  })

  it('parses effect annotation', () => {
    const result = parseAnnotations('@e.Schema.UUID')
    expect(result).toStrictEqual([
      { type: 'effect', key: 'schema', value: 'Schema.UUID' },
    ])
  })

  it('parses description annotation', () => {
    const result = parseAnnotations('@description "User email address"')
    expect(result).toStrictEqual([
      { type: 'description', key: 'description', value: 'User email address' },
    ])
  })

  it('parses multiple annotations', () => {
    const result = parseAnnotations('@z.string().min(1)\n@v.pipe(v.string(), v.minLength(1))')
    expect(result).toStrictEqual([
      { type: 'zod', key: 'schema', value: 'string().min(1)' },
      { type: 'valibot', key: 'schema', value: 'pipe(v.string(), v.minLength(1))' },
    ])
  })

  it('returns empty array for comment without annotations', () => {
    const result = parseAnnotations('just a comment')
    expect(result).toStrictEqual([])
  })

  it('returns empty array for empty string', () => {
    const result = parseAnnotations('')
    expect(result).toStrictEqual([])
  })
})

describe('createEmptyCommentInfo', () => {
  it('returns object with empty maps', () => {
    const result = createEmptyCommentInfo()
    expect(result.tableComments.size).toBe(0)
    expect(result.columnComments.size).toBe(0)
  })
})

describe('extractCommentsFromSource', () => {
  it('extracts table and column annotations from pgTable definition', () => {
    const source = `/// @z.strictObject
export const user = pgTable('user', {
  /// @z.uuid()
  /// @v.pipe(v.string(), v.uuid())
  id: uuid('id').primaryKey(),
  /// @z.string().min(1)
  name: text('name').notNull(),
})`

    const result = extractCommentsFromSource(source)

    // Table-level annotations
    const tableAnnotations = result.tableComments.get('user')
    expect(tableAnnotations).toStrictEqual([
      { type: 'zod', key: 'schema', value: 'strictObject' },
    ])

    // Column-level annotations for id
    const idAnnotations = result.columnComments.get('user.id')
    expect(idAnnotations).toStrictEqual([
      { type: 'zod', key: 'schema', value: 'uuid()' },
      { type: 'valibot', key: 'schema', value: 'pipe(v.string(), v.uuid())' },
    ])

    // Column-level annotations for name
    const nameAnnotations = result.columnComments.get('user.name')
    expect(nameAnnotations).toStrictEqual([
      { type: 'zod', key: 'schema', value: 'string().min(1)' },
    ])
  })

  it('returns empty maps for source with no annotations', () => {
    const source = `export const user = pgTable('user', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
})`

    const result = extractCommentsFromSource(source)
    expect(result.tableComments.size).toBe(0)
    expect(result.columnComments.size).toBe(0)
  })

  it('extracts column annotations from multiple tables', () => {
    const source = `/// @z.strictObject
export const user = pgTable('user', {
  /// @z.uuid()
  id: uuid('id').primaryKey(),
})

/// @z.strictObject
export const post = pgTable('post', {
  /// @z.uuid()
  id: uuid('id').primaryKey(),
  /// @z.uuid()
  userId: uuid('user_id').notNull(),
})`

    const result = extractCommentsFromSource(source)

    const userIdAnnotations = result.columnComments.get('user.id')
    expect(userIdAnnotations).toStrictEqual([
      { type: 'zod', key: 'schema', value: 'uuid()' },
    ])

    const postIdAnnotations = result.columnComments.get('post.id')
    expect(postIdAnnotations).toStrictEqual([
      { type: 'zod', key: 'schema', value: 'uuid()' },
    ])

    const postUserIdAnnotations = result.columnComments.get('post.userId')
    expect(postUserIdAnnotations).toStrictEqual([
      { type: 'zod', key: 'schema', value: 'uuid()' },
    ])
  })
})
