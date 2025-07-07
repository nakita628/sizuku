import { format } from 'prettier'
import { ResultAsync } from 'neverthrow'

export function fmt(code: string): ResultAsync<string, Error> {
  return ResultAsync.fromPromise(
    format(code, {
      parser: 'typescript',
      printWidth: 100,
      singleQuote: true,
      semi: false,
    }),
    (e) => new Error(String(e)),
  )
}
