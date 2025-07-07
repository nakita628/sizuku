import fsp from 'node:fs/promises'
import { ResultAsync } from 'neverthrow'

export function mkdir(path: string): ResultAsync<string | undefined, Error> {
  return ResultAsync.fromPromise(fsp.mkdir(path, { recursive: true }), (e) => new Error(String(e)))
}

export function writeFile(path: string, data: string): ResultAsync<void, Error> {
  return ResultAsync.fromPromise(fsp.writeFile(path, data), (e) => new Error(String(e)))
}
