import { Data } from "effect";

/**
 * Columns a validator schema cannot be written for: each needs a `///` line in the library's
 * tag above it (`/// @z.string()`), and without one the generated object would not parse.
 */
export class MissingAnnotationError extends Data.TaggedError("MissingAnnotationError")<{
  readonly message: string;
  /** The columns, as `table.column` */
  readonly columns: readonly string[];
}> {}
