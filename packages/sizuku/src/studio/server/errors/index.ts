import { Data } from "effect";

export class UnknownTableError extends Data.TaggedError("UnknownTableError")<{
  readonly table: string;
}> {}

export class InvalidInputError extends Data.TaggedError("InvalidInputError")<{
  readonly field: string;
  readonly message: string;
}> {}

export class SchemaParseError extends Data.TaggedError("SchemaParseError")<{
  readonly message: string;
  readonly line: number;
  readonly column: number;
}> {}

export class FileReadError extends Data.TaggedError("FileReadError")<{
  readonly path: string;
  readonly cause: string;
}> {}

export class FileWriteError extends Data.TaggedError("FileWriteError")<{
  readonly path: string;
  readonly cause: string;
}> {}

export class FormatError extends Data.TaggedError("FormatError")<{
  readonly message: string;
}> {}

export class RenderError extends Data.TaggedError("RenderError")<{
  readonly message: string;
}> {}

export class DatabaseUnavailableError extends Data.TaggedError("DatabaseUnavailableError")<{
  readonly reason: string;
}> {}

export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly cause: string;
}> {}

export class ServerListenError extends Data.TaggedError("ServerListenError")<{
  readonly port: number;
  readonly code: string | null;
  readonly message: string;
}> {}

export class LanguageUnavailableError extends Data.TaggedError("LanguageUnavailableError")<{
  readonly reason: string;
}> {}

/** A query that does not parse, with where in its own text. */
export class QueryError extends Data.TaggedError("QueryError")<{
  readonly message: string;
  readonly line: number;
  readonly column: number;
}> {}
