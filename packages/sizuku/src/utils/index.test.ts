import { describe, expect, it } from 'vitest'
import { buildRelationLine, extractRelations } from '../shared/helper/extract-schemas.js'
import {
  capitalize,
  extractFieldComments,
  fieldDefinitions,
  infer,
  inferInput,
  parseFieldComments,
} from './index'

// Test run
// pnpm vitest run ./src/utils/index.test.ts

describe('utils', () => {
  describe('capitalize', () => {
    it.concurrent('capitalize', () => {
      expect(capitalize('user')).toBe('User')
    })
  })

  describe('parseFieldComments', () => {
    it.concurrent('parseFieldComments', () => {
      expect(
        parseFieldComments(
          ['/// Primary key', '/// @z.uuid()', '/// @v.pipe(v.string(), v.uuid())'],
          '@z.',
        ),
      ).toStrictEqual({ definition: 'z.uuid()', description: 'Primary key', objectType: undefined })
      expect(
        parseFieldComments(
          ['/// Primary key', '/// @z.uuid()', '/// @v.pipe(v.string(), v.uuid())'],
          '@v.',
        ),
      ).toStrictEqual({
        definition: 'v.pipe(v.string(), v.uuid())',
        description: 'Primary key',
        objectType: undefined,
      })
    })

    it.concurrent('parseFieldComments with strictObject', () => {
      expect(
        parseFieldComments(['/// @z.strictObject', '/// Primary key', '/// @z.uuid()'], '@z.'),
      ).toStrictEqual({ definition: 'z.uuid()', description: 'Primary key', objectType: 'strict' })
      expect(
        parseFieldComments(
          ['/// @v.strictObject', '/// Primary key', '/// @v.pipe(v.string(), v.uuid())'],
          '@v.',
        ),
      ).toStrictEqual({
        definition: 'v.pipe(v.string(), v.uuid())',
        description: 'Primary key',
        objectType: 'strict',
      })
    })

    it.concurrent('parseFieldComments with looseObject', () => {
      expect(
        parseFieldComments(['/// @z.looseObject', '/// Primary key', '/// @z.uuid()'], '@z.'),
      ).toStrictEqual({ definition: 'z.uuid()', description: 'Primary key', objectType: 'loose' })
      expect(
        parseFieldComments(
          ['/// @v.looseObject', '/// Primary key', '/// @v.pipe(v.string(), v.uuid())'],
          '@v.',
        ),
      ).toStrictEqual({
        definition: 'v.pipe(v.string(), v.uuid())',
        description: 'Primary key',
        objectType: 'loose',
      })
    })
  })

  describe('extractFieldComments', () => {
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
}))
`
      const fieldStartPos = 113
      const result = extractFieldComments(sourceText, fieldStartPos)
      expect(result).toStrictEqual([
        '/// Primary key',
        '/// @z.uuid()',
        '/// @v.pipe(v.string(), v.uuid())',
      ])
    })
  })

  describe('extractRelations', () => {
    it.concurrent('extractRelations', () => {
      const result = extractRelations(['/// @relation user.id post.userId one-to-many'])
      const expected = [
        {
          fromModel: 'user',
          fromField: 'id',
          toModel: 'post',
          toField: 'userId',
          type: 'one-to-many',
        },
      ]
      expect(result).toStrictEqual(expected)
    })
  })

  describe('buildRelationLine', () => {
    it.concurrent.each([
      ['zero-one-to-zero-one', '|o--|o'],
      ['zero-one-to-one', '|o--||'],
      ['zero-one-to-zero-many', '|o--}o'],
      ['zero-one-to-many', '|o--}|'],
      ['zero-one-to-zero-one-optional', '|o..|o'],
      ['zero-one-to-one-optional', '|o..||'],
      ['zero-one-to-zero-many-optional', '|o..}o'],
      ['zero-one-to-many-optional', '|o..}|'],
      ['one-to-zero-one', '||--|o'],
      ['one-to-one', '||--||'],
      ['one-to-zero-many', '||--}o'],
      ['one-to-many', '||--}|'],
      ['one-to-zero-one-optional', '||..|o'],
      ['one-to-one-optional', '||..||'],
      ['one-to-zero-many-optional', '||..}o'],
      ['one-to-many-optional', '||..}|'],
      ['zero-many-to-zero-one', '}o--|o'],
      ['zero-many-to-one', '}o--||'],
      ['zero-many-to-zero-many', '}o--}o'],
      ['zero-many-to-many', '}o--}|'],
      ['zero-many-to-zero-one-optional', '}o..|o'],
      ['zero-many-to-one-optional', '}o..||'],
      ['zero-many-to-zero-many-optional', '}o..}o'],
      ['zero-many-to-many-optional', '}o..}|'],
      ['many-to-zero-one', '}|--|o'],
      ['many-to-one', '}|--||'],
      ['many-to-zero-many', '}|--}o'],
      ['many-to-many', '}|--}|'],
      ['many-to-zero-one-optional', '}|..|o'],
      ['many-to-one-optional', '}|..||'],
      ['many-to-zero-many-optional', '}|..}o'],
      ['many-to-many-optional', '}|..}|'],
      ['zero-many-to-zero-one-optional', '}o..|o'],
      ['zero-many-to-one-optional', '}o..||'],
      ['zero-many-to-zero-many-optional', '}o..}o'],
      ['zero-many-to-many-optional', '}o..}|'],
      ['many-to-zero-one-optional', '}|..|o'],
      ['many-to-one-optional', '}|..||'],
      ['many-to-zero-many-optional', '}|..}o'],
      ['many-to-many-optional', '}|..}|'],
      ['zero-one-to-zero-one-optional', '|o..|o'],
      ['zero-one-to-one-optional', '|o..||'],
    ])('buildRelationLine(%s) -> %s', (input, expected) => {
      const result = buildRelationLine(input)
      expect(result).toBe(expected)
    })
  })

  describe('infer', () => {
    it.concurrent('infer', () => {
      expect(infer('User')).toBe('export type User = z.infer<typeof UserSchema>')
    })
  })

  describe('inferInput', () => {
    it.concurrent('inferInput', () => {
      expect(inferInput('User')).toBe('export type User = v.InferInput<typeof UserSchema>')
    })
  })

  describe('fieldDefinitions', () => {
    it.concurrent('fieldDefinitions comment true', () => {
      const result = fieldDefinitions(
        {
          name: 'user',
          fields: [
            { name: 'id', definition: 'z.uuid()', description: 'Primary key' },
            {
              name: 'name',
              definition: 'z.string().min(1).max(50)',
              description: 'Display name',
            },
          ],
        },
        true,
      )

      const expected = `/**
* Primary key
*/
id:z.uuid(),
/**
* Display name
*/
name:z.string().min(1).max(50)`

      expect(result).toBe(expected)
    })

    it.concurrent('fieldDefinitions comment false', () => {
      const result = fieldDefinitions(
        {
          name: 'user',
          fields: [
            { name: 'id', definition: 'z.uuid()', description: 'Primary key' },
            {
              name: 'name',
              definition: 'z.string().min(1).max(50)',
              description: 'Display name',
            },
          ],
        },
        false,
      )
      const expected = `id:z.uuid(),
name:z.string().min(1).max(50)`
      expect(result).toBe(expected)
    })
  })
})
