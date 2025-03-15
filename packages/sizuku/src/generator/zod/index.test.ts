import { describe, expect, it } from 'vitest'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

describe('Sizuku Zod Generator', () => {
  it('sizuku-zod valid', async () => {
    const testDir = 'zod-test'

    try {
      // CLI
      execSync(
        `node ${path.resolve('dist/generator/zod/index.js')} db/schema.ts -o ${testDir}/index.ts`,
        { stdio: 'pipe' },
      )

      expect(fs.existsSync(`${testDir}/index.ts`)).toBe(true)

      const result = fs.readFileSync(`${testDir}/index.ts`, 'utf-8')
      
      const expected = `import { z } from 'zod'

export const UserSchema = z.object({
  /**
   * (PK) Unique identifier for the user.
   */
  id: z.string().uuid(),
  /**
   * Username of the user.
   */
  username: z.string(),
  /**
   * Email address of the user.
   */
  email: z.string().email(),
  /**
   * Password for the user.
   */
  password: z.string().min(8).max(100),
  /**
   * Timestamp when the user was created.
   */
  createdAt: z.date(),
  /**
   * Timestamp when the user was last updated.
   */
  updatedAt: z.date(),
})

export const PostSchema = z.object({
  /**
   * (PK) Unique identifier for the post.
   */
  id: z.string().uuid(),
  /**
   * (FK) ID of the user who created the post.
   */
  userId: z.string().uuid(),
  /**
   * Content of the post.
   */
  content: z.string(),
  /**
   * Timestamp when the post was created.
   */
  createdAt: z.date(),
  /**
   * Timestamp when the post was last updated.
   */
  updatedAt: z.date(),
})

export const LikesSchema = z.object({
  /**
   * (PK) Unique identifier for the like.
   */
  id: z.string().uuid(),
  /**
   * (FK) ID of the post that is liked.
   */
  postId: z.string().uuid(),
  /**
   * (FK) ID of the user who liked the post.
   */
  userId: z.string().uuid(),
  /**
   * Timestamp when the like was created.
   */
  createdAt: z.date(),
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
