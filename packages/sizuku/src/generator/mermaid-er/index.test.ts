import { describe, expect, it } from 'vitest'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

describe('Sizuku ER Generator CLI', () => {
  it('sizuku-mermaid-er valid', async () => {
    const testDir = 'mermaid-test-er'

    try {
      // CLI
      execSync(
        `node ${path.resolve('dist/generator/mermaid-er/index.js')} db/schema.ts -o ${testDir}/ER.md`,
        { stdio: 'pipe' },
      )

      expect(fs.existsSync(`${testDir}/ER.md`)).toBe(true)

      const result = fs.readFileSync(`${testDir}/ER.md`, 'utf-8')

      const expected = `\`\`\`mermaid
erDiagram
    user ||--|{ post : "(id) - (userId)"
    post ||--|{ likes : "(id) - (postId)"
    user ||--|{ likes : "(id) - (userId)"
    user {
        varchar id "(PK) Unique identifier for the user."
        varchar username "Username of the user."
        varchar email "Email address of the user."
        varchar password "Password for the user."
        timestamp createdAt "Timestamp when the user was created."
        timestamp updatedAt "Timestamp when the user was last updated."
    }
    post {
        varchar id "(PK) Unique identifier for the post."
        varchar userId "(FK) ID of the user who created the post."
        varchar content "Content of the post."
        timestamp createdAt "Timestamp when the post was created."
        timestamp updatedAt "Timestamp when the post was last updated."
    }
    likes {
        varchar id "(PK) Unique identifier for the like."
        varchar postId "(FK) ID of the post that is liked."
        varchar userId "(FK) ID of the user who liked the post."
        timestamp createdAt "Timestamp when the like was created."
    }
\`\`\``
      expect(result).toBe(expected)
    } finally {
      if (fs.existsSync(testDir)) {
        fs.rmdirSync(testDir, { recursive: true })
      }
    }
  })

  it('sizuku-mermaid-er error', async () => {
    const testDir = 'mermaid-test-er'
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true })
    }

    try {
      // CLI
      execSync(
        `node ${path.resolve('dist/generator/mermaid-er/index.js')} db/schema.ts ${testDir}/ER.md`,
        { stdio: 'pipe' },
      )
    } catch (e) {
      expect(e).toBeInstanceOf(Error)
    } finally {
      // clean up
      if (fs.existsSync(testDir)) {
        fs.rmdirSync(testDir, { recursive: true })
      }
    }
  })
})
