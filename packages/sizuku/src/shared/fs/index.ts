import fs from 'node:fs'
import type { Result } from 'neverthrow'
import { err, ok } from 'neverthrow'

export function readFileSync(path: string): Result<string, Error> {
  try {
    return ok(fs.readFileSync(path, 'utf-8'))
  } catch (e) {
    return err(new Error(String(e)))
  }
}
