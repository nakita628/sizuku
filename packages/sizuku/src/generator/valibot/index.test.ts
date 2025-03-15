import { describe, expect, it } from 'vitest'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

describe('Sizuku Valibot Generator', () => {
  it('sizuku-valibot valid', async () => {
    const testDir = 'valibot-test'

    try {
      // CLI
      execSync(
        `node ${path.resolve('dist/generator/valibot/index.js')} db/schema.ts -o ${testDir}/index.ts`,
        { stdio: 'pipe' },
      )

      expect(fs.existsSync(`${testDir}/index.ts`)).toBe(true)

      const result = fs.readFileSync(`${testDir}/index.ts`, 'utf-8')
      
      const expected = `import * as v from 'valibot'

export const UserSchema = v.object({
  /**
   * (PK) Unique identifier for the user.
   */
  id: v.pipe(v.string(), v.uuid()),
  /**
   * Username of the user.
   */
  username: v.string(),
  /**
   * Email address of the user.
   */
  email: v.pipe(v.string(), v.email()),
  /**
   * Password for the user.
   */
  password: v.pipe(v.string(), v.minLength(8), v.maxLength(100)),
  /**
   * Timestamp when the user was created.
   */
  createdAt: v.date(),
  /**
   * Timestamp when the user was last updated.
   */
  updatedAt: v.date(),
})

export const PostSchema = v.object({
  /**
   * (PK) Unique identifier for the post.
   */
  id: v.pipe(v.string(), v.uuid()),
  /**
   * (FK) ID of the user who created the post.
   */
  userId: v.pipe(v.string(), v.uuid()),
  /**
   * Content of the post.
   */
  content: v.string(),
  /**
   * Timestamp when the post was created.
   */
  createdAt: v.date(),
  /**
   * Timestamp when the post was last updated.
   */
  updatedAt: v.date(),
})

export const LikesSchema = v.object({
  /**
   * (PK) Unique identifier for the like.
   */
  id: v.pipe(v.string(), v.uuid()),
  /**
   * (FK) ID of the post that is liked.
   */
  postId: v.pipe(v.string(), v.uuid()),
  /**
   * (FK) ID of the user who liked the post.
   */
  userId: v.pipe(v.string(), v.uuid()),
  /**
   * Timestamp when the like was created.
   */
  createdAt: v.date(),
})
`

      expect(result).toBe(expected)
    } finally {
      // clean up
      if (fs.existsSync(testDir)) {
        fs.rmdirSync(testDir, { recursive: true })
      }
    }
  })
})
