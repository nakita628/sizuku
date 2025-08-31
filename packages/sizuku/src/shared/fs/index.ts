import fs from 'node:fs'

export function readFileSync(path: string):
  | {
      readonly ok: true
      readonly value: string
    }
  | {
      readonly ok: false
      readonly error: string
    } {
  try {
    const result = fs.readFileSync(path, 'utf-8')
    return {
      ok: true,
      value: result,
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}
