import "@typespec/http";
import "@typespec/openapi";
import "@typespec/openapi3";

using Http;
using OpenAPI;

/**
 * Local API behind `sizuku studio`: the Drizzle schema file on disk, its ER diagram and docs,
 * the formatter, the project's TypeScript for the editor, and the connected database. It listens on loopback only and has no
 * authentication, so nothing here is reachable from another origin.
 */
@service(#{ title: "Sizuku Studio API" })
@info(#{ version: "1.0.0" })
namespace SizukuStudio;

// ---------------------------------------------------------------------------
// Scalars
// ---------------------------------------------------------------------------

/** A table as the schema exports it (`export const user = pgTable(...)` → `user`). */
@pattern("^[A-Za-z_$][A-Za-z0-9_$]*$")
@extension("x-error-message", "Table name must be a JavaScript identifier")
scalar tableName extends string;

/** Rows to skip before the page (0-based). Defaults to 0. */
@minValue(0)
@extension("x-coerce", true)
@extension("x-prefault", 0)
@extension("x-minValue-message", "skip must be 0 or more")
scalar skip extends int32;

/** Rows per page (1-1000). Defaults to 100. */
@minValue(1)
@maxValue(1000)
@extension("x-coerce", true)
@extension("x-prefault", 100)
@extension("x-minValue-message", "take must be at least 1")
@extension("x-maxValue-message", "take must be 1000 or fewer")
scalar take extends int32;

/** The colour scheme a diagram is drawn in. */
enum Theme {
  light,
  dark,
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

/** Where a syntax error stopped the parser, 1-based. */
@example(#{ message: "Expected `)` but found `EOF`", line: 12, column: 3 })
model ParseError {
  /** What the parser expected */
  message: string;

  /** The line of the error */
  line: int32;

  /** The column of the error */
  column: int32;
}

/** The schema file as it is on disk. */
model Snapshot {
  /** The path the studio was started with */
  path: string;

  /** The file name, for the title */
  file: string;

  /** The file's text */
  source: string;

  /** The first syntax error in the file, or null when it parses */
  parseError: ParseError | null;
}

/** Text to write to the schema file. */
model SaveBody {
  /** The whole file */
  source: string;
}

// ---------------------------------------------------------------------------
// Diagram
// ---------------------------------------------------------------------------

/** A schema to draw: the editor buffer, saved or not. */
model DiagramBody {
  /** The schema source */
  source: string;

  /** The colour scheme; light when left out */
  theme?: Theme;
}

/** The ER diagram of a schema, or why it could not be drawn. */
model Diagram {
  /** The SVG document, null when the source does not parse */
  svg: string | null;

  /** The syntax error that stopped the drawing */
  parseError: ParseError | null;
}

/** The ER diagram rasterised to PNG at 2x. */
model Png {
  /** The PNG file, base64-encoded */
  base64: string;
}

// ---------------------------------------------------------------------------
// Format
// ---------------------------------------------------------------------------

/** oxfmt options (a subset of Prettier's), as `.oxfmtrc.json` holds them. */
model FormatOptions {
  /** The line length the printer wraps at */
  @minValue(20)
  @maxValue(400)
  printWidth?: int32;

  /** Spaces per indentation level */
  @minValue(1)
  @maxValue(16)
  tabWidth?: int32;

  /** Indent with tabs instead of spaces */
  useTabs?: boolean;

  /** End statements with a semicolon */
  semi?: boolean;

  /** Use single quotes for strings */
  singleQuote?: boolean;

  /** Trailing commas where valid */
  trailingComma?: "all" | "es5" | "none";

  /** Spaces inside object braces */
  bracketSpacing?: boolean;

  /** Parentheses around a sole arrow function parameter */
  arrowParens?: "always" | "avoid";
}

/** The formatter settings in effect, and the file they come from. */
model FormatSettings {
  /** The options the formatter runs with */
  options: FormatOptions;

  /** The `.oxfmtrc.json` they were read from, null when there is none yet */
  configPath: string | null;
}

/** Options to write to the project's `.oxfmtrc.json`. */
model FormatSettingsBody {
  /** The options to save */
  options: FormatOptions;
}

/** Text to format. */
model FormatBody {
  /** The schema source */
  source: string;

  /** Options for this run; the saved settings when left out */
  options?: FormatOptions;
}

/** The formatted text. */
model Formatted {
  /** The source as the formatter prints it */
  source: string;
}

// ---------------------------------------------------------------------------
// Docs
// ---------------------------------------------------------------------------

/** What a column points at through a foreign key or a relation. */
model ColumnReference {
  /** The table it references */
  table: string;

  /** The column it references */
  column: string;
}

/** A column as the docs describe it. */
model DocColumn {
  /** The property name in the schema */
  name: string;

  /** The database column name */
  dbName: string;

  /** The column builder (`varchar`, `uuid`, an enum's name, ...) */
  type: string;

  /** Whether the column may hold null */
  nullable: boolean;

  /** Whether it is the primary key or part of it */
  primaryKey: boolean;

  /** Whether a unique constraint covers it alone */
  unique: boolean;

  /** Whether it is an array column */
  isList: boolean;

  /** The enum it holds, null for a scalar */
  enumName: string | null;

  /** Its default and generated values, as written */
  defaults: string[];

  /** The `///` description */
  description: string | null;

  /** The column it references, null when it is not a foreign key */
  references: ColumnReference | null;
}

/** An index or constraint over one or more columns. */
model DocIndex {
  /** What kind it is */
  type: "id" | "unique" | "normal" | "fulltext";

  /** The columns it covers */
  columns: string[];
}

/** A relation as seen from one table. */
model DocRelation {
  /** The other table */
  table: string;

  /** The column on this side */
  column: string;

  /** The column on the other side */
  otherColumn: string;

  /** How it reads from this side: `one to many`, `many to one`, ... */
  kind: string;

  /** Where it was found: a foreign key, a `relations()` block or a `/// @relation` note */
  origin: string;

  /** The action on delete of the parent row */
  onDelete: string | null;

  /** The action on update of the parent key */
  onUpdate: string | null;
}

/** One table of the docs. */
model DocTable {
  /** The exported name */
  name: string;

  /** The database table name */
  dbName: string;

  /** The `///` description above it */
  description: string | null;

  /** Its columns, in declaration order */
  columns: DocColumn[];

  /** Its indexes and constraints */
  indexes: DocIndex[];

  /** The relations where this table holds the foreign key */
  references: DocRelation[];

  /** The relations where another table points here */
  referencedBy: DocRelation[];
}

/** One enum of the docs. */
model DocEnum {
  /** The exported name */
  name: string;

  /** The database type name */
  dbName: string;

  /** The `///` description above it */
  description: string | null;

  /** Its values, in order */
  values: string[];
}

/** The generated documentation of the saved schema. */
model Docs {
  /** Every table, in file order */
  tables: DocTable[];

  /** Every enum, in file order */
  enums: DocEnum[];

  /** The syntax error that kept the docs from being read */
  parseError: ParseError | null;
}

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

/** A column the data views read and write. */
model DbColumn {
  /** The property name in the schema */
  name: string;

  /** The database column name */
  column: string;

  /** The column builder */
  type: string;

  /** Whether it may hold null */
  nullable: boolean;
}

/** A table of the schema as the data views see it. */
model DbTable {
  /** The exported name */
  name: string;

  /** The database table name */
  table: string;

  /** Its columns, in declaration order */
  columns: DbColumn[];

  /** The columns that identify a row: the primary key, else the unique columns, else all */
  key: string[];
}

/** The database connection, and the tables the schema declares. */
model DbStatus {
  /** Whether a database is connected */
  connected: boolean;

  /** The SQL dialect of the connection */
  dialect: "sqlite" | "postgresql" | "mysql" | null;

  /** The connection URL with its password hidden */
  url: string | null;

  /** Why the connection failed, null when it did not */
  error: string | null;

  /** The tables of the saved schema */
  tables: DbTable[];
}

/** Row counts by table name; a table whose count fails is left out. */
model Counts {
  /** Rows per table */
  counts: Record<int32>;
}

/** A row keyed by column property name. */
model Row is Record<string | float64 | boolean | null>;

/** The paging parameters of a rows request. */
model RowsQuery {
  /** Rows to skip before the page */
  @query skip: skip;

  /** Rows per page */
  @query take: take;
}

/** One page of a table's rows. */
model Rows {
  /** The rows of the page */
  rows: Row[];

  /** How many rows the table has */
  total: int32;

  /** The skip the page was read with */
  skip: int32;

  /** The take the page was read with */
  take: int32;
}

/** A row to insert. */
model InsertBody {
  /** The values to insert, keyed by property name */
  values: Row;
}

/** A row to change. */
model UpdateBody {
  /** The key columns of the row to change */
  where: Row;

  /** The columns to set */
  values: Row;
}

/** A row to delete. */
model DeleteBody {
  /** The key columns of the row to delete */
  where: Row;
}

/** How many rows a write changed. */
model Affected {
  /** Rows changed */
  count: int32;
}

/** A statement for the SQL console. */
model SqlBody {
  /** The SQL statement */
  @minLength(1)
  sql: string;
}

/** What a statement returned. */
model SqlResult {
  /** The result columns, in order */
  columns: string[];

  /** The rows, keyed by column */
  rows: Row[];

  /** Rows returned, or changed by a write */
  rowCount: int32;

  /** How long the statement took */
  durationMs: float64;
}

// ---------------------------------------------------------------------------
// Language (the project's TypeScript, over the schema file)
// ---------------------------------------------------------------------------

/** Whether the editor has TypeScript behind it. */
model LanguageStatus {
  /** The version of the project's TypeScript, null when it could not be loaded */
  typescript: string | null;

  /** Why there is no language service, null when there is one */
  reason: string | null;
}

/** The editor buffer and a place in it. */
model PositionBody {
  /** The schema source, saved or not */
  source: string;

  /** The UTF-16 offset of the cursor */
  @minValue(0)
  offset: int32;
}

/** A completion to describe in full. */
model CompletionDetailBody {
  ...PositionBody;

  /** The name of the completion */
  name: string;
}

/** A stretch of the source, as UTF-16 offsets. */
model TextRange {
  /** Where it starts */
  start: int32;

  /** Where it ends */
  end: int32;
}

/** One thing TypeScript offers at the cursor. */
model CompletionItem {
  /** What is shown and inserted */
  label: string;

  /** TypeScript's kind of the entry: `method`, `property`, `function`, ... */
  kind: string;

  /** How TypeScript orders it */
  sortText: string;

  /** Text to insert in place of the label, when it differs */
  insertText: string | null;

  /** The text the completion replaces, when it is not the word at the cursor */
  replacement: TextRange | null;
}

/** The completions at the cursor. */
model Completions {
  /** The items, in TypeScript's order */
  items: CompletionItem[];
}

/** The type and documentation of one completion. */
model CompletionDetail {
  /** Its signature or type */
  detail: string | null;

  /** Its doc comment, as Markdown */
  documentation: string | null;
}

/** What TypeScript says about the symbol at the cursor. */
model Hover {
  /** The type and documentation, as Markdown; null over nothing */
  contents: string | null;

  /** The symbol's range */
  range: TextRange | null;
}

/** One parameter of a signature. */
model SignatureParameter {
  /** How it reads in the signature */
  label: string;

  /** Its doc comment */
  documentation: string | null;
}

/** One overload of the call. */
model Signature {
  /** The whole signature */
  label: string;

  /** Its doc comment */
  documentation: string | null;

  /** Its parameters */
  parameters: SignatureParameter[];
}

/** The signatures of the call the cursor is in. */
model SignatureHelp {
  /** The overloads */
  signatures: Signature[];

  /** The overload TypeScript picked */
  activeSignature: int32;

  /** The parameter the cursor is on */
  activeParameter: int32;
}

/** A source to check. */
model SourceBody {
  /** The schema source, saved or not */
  source: string;
}

/** One problem TypeScript found. */
model Diagnostic {
  /** What is wrong */
  message: string;

  /** How bad it is */
  severity: "error" | "warning" | "info";

  /** Where it is */
  range: TextRange;
}

/** The type errors of a source; its syntax errors come from the parser, with the diagram. */
model Diagnostics {
  /** The problems, in order of position */
  diagnostics: Diagnostic[];
}

// ---------------------------------------------------------------------------
// Problems (RFC 9457)
// ---------------------------------------------------------------------------

/** One field that failed validation. */
model FieldError {
  /** The dotted path of the field */
  field: string;

  /** Why it failed */
  message: string;
}

/** RFC 9457 Problem Details for a request that failed validation. */
model ValidationProblem {
  /** Problem type identifier (relative URI reference) */
  type: "/problems/validation-failed";

  /** Short, human-readable summary of the problem type */
  title: "Validation Failed";

  /** HTTP status code, restated in the body per RFC 9457 */
  status: 422;

  /** Human-readable explanation specific to this occurrence */
  detail: string;

  /** URI reference identifying this occurrence (the request path) */
  instance: string;

  /** Extension member: one entry per field that failed validation */
  errors: FieldError[];
}

/** 422 Unprocessable Content (`application/problem+json`) */
@error
model ValidationProblemResponse {
  @statusCode statusCode: 422;
  @header contentType: "application/problem+json";
  @body body: ValidationProblem;
}

/** RFC 9457 Problem Details for a table the schema does not declare. */
@example(#{
  type: "/problems/not-found",
  title: "Not Found",
  status: 404,
  detail: "Unknown table \"nope\".",
  instance: "/api/db/rows/nope",
})
model NotFoundProblem {
  /** Problem type identifier (relative URI reference) */
  type: "/problems/not-found";

  /** Short, human-readable summary of the problem type */
  title: "Not Found";

  /** HTTP status code, restated in the body per RFC 9457 */
  status: 404;

  /** Human-readable explanation specific to this occurrence */
  detail: string;

  /** URI reference identifying this occurrence (the request path) */
  instance: string;
}

/** 404 Not Found (`application/problem+json`) */
@error
model NotFoundProblemResponse {
  @statusCode statusCode: 404;
  @header contentType: "application/problem+json";
  @body body: NotFoundProblem;
}

/**
 * RFC 9457 Problem Details for a request that needs the database while none is connected,
 * or whose statement the database rejected.
 */
@example(#{
  type: "/problems/service-unavailable",
  title: "Service Unavailable",
  status: 503,
  detail: "No database is connected. Pass --url to sizuku studio or set DATABASE_URL.",
  instance: "/api/db/counts",
})
model ServiceUnavailableProblem {
  /** Problem type identifier (relative URI reference) */
  type: "/problems/service-unavailable";

  /** Short, human-readable summary of the problem type */
  title: "Service Unavailable";

  /** HTTP status code, restated in the body per RFC 9457 */
  status: 503;

  /** Human-readable explanation specific to this occurrence */
  detail: string;

  /** URI reference identifying this occurrence (the request path) */
  instance: string;
}

/** 503 Service Unavailable (`application/problem+json`) */
@error
model ServiceUnavailableProblemResponse {
  @statusCode statusCode: 503;
  @header contentType: "application/problem+json";
  @body body: ServiceUnavailableProblem;
}

/** RFC 9457 Problem Details for any unexpected failure. */
model InternalServerProblem {
  /** Problem type identifier (relative URI reference) */
  type: "/problems/internal-server-error";

  /** Short, human-readable summary of the problem type */
  title: "Internal Server Error";

  /** HTTP status code, restated in the body per RFC 9457 */
  status: 500;

  /** Human-readable explanation specific to this occurrence */
  detail: string;

  /** URI reference identifying this occurrence (the request path) */
  instance: string;
}

/** 500 Internal Server Error (`application/problem+json`) */
@error
model InternalServerProblemResponse {
  @statusCode statusCode: 500;
  @header contentType: "application/problem+json";
  @body body: InternalServerProblem;
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

@route("/schema")
@tag("schema")
namespace SchemaRoutes {
  /** The schema file as it is on disk. */
  @get
  @operationId("readSchema")
  op read(): Snapshot | InternalServerProblemResponse;

  /** Write the schema file. */
  @put
  @operationId("writeSchema")
  op write(@body body: SaveBody):
    | Snapshot
    | ValidationProblemResponse
    | InternalServerProblemResponse;

  /** A `change` event whenever the schema file changes on disk. */
  @get
  @route("/events")
  @operationId("readSchemaEvents")
  op events(): {
    @statusCode statusCode: 200;
    @header contentType: "text/event-stream";
    @body body: string;
  };
}

@route("/diagram")
@tag("diagram")
namespace DiagramRoutes {
  /** The ER diagram of a schema as SVG. */
  @post
  @route("/svg")
  @operationId("drawSvg")
  op svg(@body body: DiagramBody):
    | Diagram
    | ValidationProblemResponse
    | InternalServerProblemResponse;

  /** The ER diagram of a schema as PNG. */
  @post
  @route("/png")
  @operationId("drawPng")
  op png(@body body: DiagramBody):
    | Png
    | ValidationProblemResponse
    | InternalServerProblemResponse;
}

@route("/format")
@tag("format")
namespace FormatRoutes {
  /** Format a schema with oxfmt; a source that does not parse is a 422. */
  @post
  @operationId("formatSource")
  op format(@body body: FormatBody):
    | Formatted
    | ValidationProblemResponse
    | InternalServerProblemResponse;

  /** The formatter settings in effect. */
  @get
  @route("/settings")
  @operationId("readFormatSettings")
  op settings(): FormatSettings | InternalServerProblemResponse;

  /** Save the formatter settings to the project's `.oxfmtrc.json`. */
  @put
  @route("/settings")
  @operationId("writeFormatSettings")
  op writeSettings(@body body: FormatSettingsBody):
    | FormatSettings
    | ValidationProblemResponse
    | InternalServerProblemResponse;
}

@route("/docs")
@tag("docs")
namespace DocsRoutes {
  /** The generated documentation of the saved schema. */
  @get
  @operationId("readDocs")
  op read(): Docs | InternalServerProblemResponse;
}

@route("/db")
@tag("db")
namespace DbRoutes {
  /** The database connection and the tables of the schema. */
  @get
  @operationId("readDbStatus")
  op status(): DbStatus | InternalServerProblemResponse;

  /** The row count of every table. */
  @get
  @route("/counts")
  @operationId("readCounts")
  op counts(): Counts | ServiceUnavailableProblemResponse | InternalServerProblemResponse;

  /** One page of a table's rows, ordered by its key. */
  @get
  @route("/rows/{tableName}")
  @operationId("readRows")
  op rows(@path tableName: tableName, ...RowsQuery):
    | Rows
    | NotFoundProblemResponse
    | ValidationProblemResponse
    | ServiceUnavailableProblemResponse
    | InternalServerProblemResponse;

  /** Insert one row. */
  @post
  @route("/rows/{tableName}")
  @operationId("createRow")
  op insert(@path tableName: tableName, @body body: InsertBody):
    | Affected
    | NotFoundProblemResponse
    | ValidationProblemResponse
    | ServiceUnavailableProblemResponse
    | InternalServerProblemResponse;

  /** Update the row identified by `where`. */
  @patch
  @route("/rows/{tableName}")
  @operationId("updateRow")
  op update(@path tableName: tableName, @body body: UpdateBody):
    | Affected
    | NotFoundProblemResponse
    | ValidationProblemResponse
    | ServiceUnavailableProblemResponse
    | InternalServerProblemResponse;

  /** Delete the row identified by `where`. */
  @delete
  @route("/rows/{tableName}")
  @operationId("deleteRow")
  op remove(@path tableName: tableName, @body body: DeleteBody):
    | Affected
    | NotFoundProblemResponse
    | ValidationProblemResponse
    | ServiceUnavailableProblemResponse
    | InternalServerProblemResponse;

  /** Run one SQL statement. */
  @post
  @route("/sql")
  @operationId("runSql")
  op sql(@body body: SqlBody):
    | SqlResult
    | ValidationProblemResponse
    | ServiceUnavailableProblemResponse
    | InternalServerProblemResponse;
}

@route("/language")
@tag("language")
namespace LanguageRoutes {
  /** Whether the project's TypeScript is loaded, and why not when it is not. */
  @get
  @operationId("readLanguageStatus")
  op status(): LanguageStatus | InternalServerProblemResponse;

  /** The completions at the cursor. */
  @post
  @route("/complete")
  @operationId("complete")
  op complete(@body body: PositionBody):
    | Completions
    | ValidationProblemResponse
    | ServiceUnavailableProblemResponse
    | InternalServerProblemResponse;

  /** The type and documentation of one completion. */
  @post
  @route("/complete/detail")
  @operationId("completeDetail")
  op completeDetail(@body body: CompletionDetailBody):
    | CompletionDetail
    | ValidationProblemResponse
    | ServiceUnavailableProblemResponse
    | InternalServerProblemResponse;

  /** What TypeScript says about the symbol at the cursor. */
  @post
  @route("/hover")
  @operationId("hover")
  op hover(@body body: PositionBody):
    | Hover
    | ValidationProblemResponse
    | ServiceUnavailableProblemResponse
    | InternalServerProblemResponse;

  /** The signatures of the call the cursor is in. */
  @post
  @route("/signature")
  @operationId("signature")
  op signature(@body body: PositionBody):
    | SignatureHelp
    | ValidationProblemResponse
    | ServiceUnavailableProblemResponse
    | InternalServerProblemResponse;

  /** The type errors of the source. */
  @post
  @route("/diagnostics")
  @operationId("diagnostics")
  op diagnostics(@body body: SourceBody):
    | Diagnostics
    | ValidationProblemResponse
    | ServiceUnavailableProblemResponse
    | InternalServerProblemResponse;
}
