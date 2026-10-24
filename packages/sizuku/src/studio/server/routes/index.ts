import { createRoute, z } from "@hono/zod-openapi";

export const ParseErrorSchema = z
  .object({
    message: z.string().openapi({ description: "What the parser expected" }),
    line: z.int32().openapi({ description: "The line of the error" }),
    column: z.int32().openapi({ description: "The column of the error" }),
  })
  .readonly()
  .openapi({
    required: ["message", "line", "column"],
    description: "Where a syntax error stopped the parser, 1-based.",
    example: { message: "Expected `)` but found `EOF`", line: 12, column: 3 },
  })
  .openapi("ParseError");

export const SnapshotSchema = z
  .object({
    path: z.string().openapi({ description: "The path the studio was started with" }),
    file: z.string().openapi({ description: "The file name, for the title" }),
    source: z.string().openapi({ description: "The file's text" }),
    parseError: ParseErrorSchema.nullable().openapi({
      description: "The first syntax error in the file, or null when it parses",
    }),
  })
  .readonly()
  .openapi({
    required: ["path", "file", "source", "parseError"],
    description: "The schema file as it is on disk.",
  })
  .openapi("Snapshot");

export const InternalServerProblemSchema = z
  .object({
    type: z
      .literal("/problems/internal-server-error")
      .openapi({ description: "Problem type identifier (relative URI reference)" }),
    title: z
      .literal("Internal Server Error")
      .openapi({ description: "Short, human-readable summary of the problem type" }),
    status: z
      .literal(500)
      .openapi({ description: "HTTP status code, restated in the body per RFC 9457" }),
    detail: z
      .string()
      .openapi({ description: "Human-readable explanation specific to this occurrence" }),
    instance: z
      .string()
      .openapi({ description: "URI reference identifying this occurrence (the request path)" }),
  })
  .readonly()
  .openapi({
    required: ["type", "title", "status", "detail", "instance"],
    description: "RFC 9457 Problem Details for any unexpected failure.",
  })
  .openapi("InternalServerProblem");

export const FieldErrorSchema = z
  .object({
    field: z.string().openapi({ description: "The dotted path of the field" }),
    message: z.string().openapi({ description: "Why it failed" }),
  })
  .readonly()
  .openapi({ required: ["field", "message"], description: "One field that failed validation." })
  .openapi("FieldError");

export const ValidationProblemSchema = z
  .object({
    type: z
      .literal("/problems/validation-failed")
      .openapi({ description: "Problem type identifier (relative URI reference)" }),
    title: z
      .literal("Validation Failed")
      .openapi({ description: "Short, human-readable summary of the problem type" }),
    status: z
      .literal(422)
      .openapi({ description: "HTTP status code, restated in the body per RFC 9457" }),
    detail: z
      .string()
      .openapi({ description: "Human-readable explanation specific to this occurrence" }),
    instance: z
      .string()
      .openapi({ description: "URI reference identifying this occurrence (the request path)" }),
    errors: z
      .array(FieldErrorSchema)
      .readonly()
      .openapi({ description: "Extension member: one entry per field that failed validation" }),
  })
  .readonly()
  .openapi({
    required: ["type", "title", "status", "detail", "instance", "errors"],
    description: "RFC 9457 Problem Details for a request that failed validation.",
  })
  .openapi("ValidationProblem");

export const SaveBodySchema = z
  .object({ source: z.string().openapi({ description: "The whole file" }) })
  .readonly()
  .openapi({ required: ["source"], description: "Text to write to the schema file." })
  .openapi("SaveBody");

export const DiagramSchema = z
  .object({
    svg: z
      .string()
      .nullable()
      .openapi({ description: "The SVG document, null when the source does not parse" }),
    parseError: ParseErrorSchema.nullable().openapi({
      description: "The syntax error that stopped the drawing",
    }),
  })
  .readonly()
  .openapi({
    required: ["svg", "parseError"],
    description: "The ER diagram of a schema, or why it could not be drawn.",
  })
  .openapi("Diagram");

export const ThemeSchema = z
  .enum(["light", "dark"])
  .openapi({ description: "The colour scheme a diagram is drawn in." })
  .openapi("Theme");

export const DiagramBodySchema = z
  .object({
    source: z.string().openapi({ description: "The schema source" }),
    theme: ThemeSchema.exactOptional().openapi({
      description: "The colour scheme; light when left out",
    }),
  })
  .readonly()
  .openapi({
    required: ["source"],
    description: "A schema to draw: the editor buffer, saved or not.",
  })
  .openapi("DiagramBody");

export const PngSchema = z
  .object({ base64: z.string().openapi({ description: "The PNG file, base64-encoded" }) })
  .readonly()
  .openapi({ required: ["base64"], description: "The ER diagram rasterised to PNG at 2x." })
  .openapi("Png");

export const FormattedSchema = z
  .object({ source: z.string().openapi({ description: "The source as the formatter prints it" }) })
  .readonly()
  .openapi({ required: ["source"], description: "The formatted text." })
  .openapi("Formatted");

export const FormatOptionsSchema = z
  .object({
    printWidth: z
      .int32()
      .min(20)
      .max(400)
      .exactOptional()
      .openapi({ description: "The line length the printer wraps at" }),
    tabWidth: z
      .int32()
      .min(1)
      .max(16)
      .exactOptional()
      .openapi({ description: "Spaces per indentation level" }),
    useTabs: z
      .boolean()
      .exactOptional()
      .openapi({ description: "Indent with tabs instead of spaces" }),
    semi: z.boolean().exactOptional().openapi({ description: "End statements with a semicolon" }),
    singleQuote: z
      .boolean()
      .exactOptional()
      .openapi({ description: "Use single quotes for strings" }),
    trailingComma: z
      .enum(["all", "es5", "none"])
      .exactOptional()
      .openapi({ description: "Trailing commas where valid" }),
    bracketSpacing: z
      .boolean()
      .exactOptional()
      .openapi({ description: "Spaces inside object braces" }),
    arrowParens: z
      .enum(["always", "avoid"])
      .exactOptional()
      .openapi({ description: "Parentheses around a sole arrow function parameter" }),
  })
  .readonly()
  .openapi({
    required: [],
    description: "oxfmt options (a subset of Prettier's), as `.oxfmtrc.json` holds them.",
  })
  .openapi("FormatOptions");

export const FormatBodySchema = z
  .object({
    source: z.string().openapi({ description: "The schema source" }),
    options: FormatOptionsSchema.exactOptional().openapi({
      description: "Options for this run; the saved settings when left out",
    }),
  })
  .readonly()
  .openapi({ required: ["source"], description: "Text to format." })
  .openapi("FormatBody");

export const FormatSettingsSchema = z
  .object({
    options: FormatOptionsSchema.openapi({ description: "The options the formatter runs with" }),
    configPath: z.string().nullable().openapi({
      description: "The `.oxfmtrc.json` they were read from, null when there is none yet",
    }),
  })
  .readonly()
  .openapi({
    required: ["options", "configPath"],
    description: "The formatter settings in effect, and the file they come from.",
  })
  .openapi("FormatSettings");

export const FormatSettingsBodySchema = z
  .object({ options: FormatOptionsSchema.openapi({ description: "The options to save" }) })
  .readonly()
  .openapi({
    required: ["options"],
    description: "Options to write to the project's `.oxfmtrc.json`.",
  })
  .openapi("FormatSettingsBody");

export const ColumnReferenceSchema = z
  .object({
    table: z.string().openapi({ description: "The table it references" }),
    column: z.string().openapi({ description: "The column it references" }),
  })
  .readonly()
  .openapi({
    required: ["table", "column"],
    description: "What a column points at through a foreign key or a relation.",
  })
  .openapi("ColumnReference");

export const DocColumnSchema = z
  .object({
    name: z.string().openapi({ description: "The property name in the schema" }),
    dbName: z.string().openapi({ description: "The database column name" }),
    type: z
      .string()
      .openapi({ description: "The column builder (`varchar`, `uuid`, an enum's name, ...)" }),
    nullable: z.boolean().openapi({ description: "Whether the column may hold null" }),
    primaryKey: z.boolean().openapi({ description: "Whether it is the primary key or part of it" }),
    unique: z.boolean().openapi({ description: "Whether a unique constraint covers it alone" }),
    isList: z.boolean().openapi({ description: "Whether it is an array column" }),
    enumName: z
      .string()
      .nullable()
      .openapi({ description: "The enum it holds, null for a scalar" }),
    defaults: z
      .array(z.string())
      .readonly()
      .openapi({ description: "Its default and generated values, as written" }),
    description: z.string().nullable().openapi({ description: "The `///` description" }),
    references: ColumnReferenceSchema.nullable().openapi({
      description: "The column it references, null when it is not a foreign key",
    }),
  })
  .readonly()
  .openapi({
    required: [
      "name",
      "dbName",
      "type",
      "nullable",
      "primaryKey",
      "unique",
      "isList",
      "enumName",
      "defaults",
      "description",
      "references",
    ],
    description: "A column as the docs describe it.",
  })
  .openapi("DocColumn");

export const DocIndexSchema = z
  .object({
    type: z
      .enum(["id", "unique", "normal", "fulltext"])
      .openapi({ description: "What kind it is" }),
    columns: z.array(z.string()).readonly().openapi({ description: "The columns it covers" }),
  })
  .readonly()
  .openapi({
    required: ["type", "columns"],
    description: "An index or constraint over one or more columns.",
  })
  .openapi("DocIndex");

export const DocRelationSchema = z
  .object({
    table: z.string().openapi({ description: "The other table" }),
    column: z.string().openapi({ description: "The column on this side" }),
    otherColumn: z.string().openapi({ description: "The column on the other side" }),
    kind: z
      .string()
      .openapi({ description: "How it reads from this side: `one to many`, `many to one`, ..." }),
    origin: z.string().openapi({
      description:
        "Where it was found: a foreign key, a `relations()` block or a `/// @relation` note",
    }),
    onDelete: z
      .string()
      .nullable()
      .openapi({ description: "The action on delete of the parent row" }),
    onUpdate: z
      .string()
      .nullable()
      .openapi({ description: "The action on update of the parent key" }),
  })
  .readonly()
  .openapi({
    required: ["table", "column", "otherColumn", "kind", "origin", "onDelete", "onUpdate"],
    description: "A relation as seen from one table.",
  })
  .openapi("DocRelation");

export const DocTableSchema = z
  .object({
    name: z.string().openapi({ description: "The exported name" }),
    dbName: z.string().openapi({ description: "The database table name" }),
    description: z.string().nullable().openapi({ description: "The `///` description above it" }),
    columns: z
      .array(DocColumnSchema)
      .readonly()
      .openapi({ description: "Its columns, in declaration order" }),
    indexes: z
      .array(DocIndexSchema)
      .readonly()
      .openapi({ description: "Its indexes and constraints" }),
    references: z
      .array(DocRelationSchema)
      .readonly()
      .openapi({ description: "The relations where this table holds the foreign key" }),
    referencedBy: z
      .array(DocRelationSchema)
      .readonly()
      .openapi({ description: "The relations where another table points here" }),
  })
  .readonly()
  .openapi({
    required: ["name", "dbName", "description", "columns", "indexes", "references", "referencedBy"],
    description: "One table of the docs.",
  })
  .openapi("DocTable");

export const DocEnumSchema = z
  .object({
    name: z.string().openapi({ description: "The exported name" }),
    dbName: z.string().openapi({ description: "The database type name" }),
    description: z.string().nullable().openapi({ description: "The `///` description above it" }),
    values: z.array(z.string()).readonly().openapi({ description: "Its values, in order" }),
  })
  .readonly()
  .openapi({
    required: ["name", "dbName", "description", "values"],
    description: "One enum of the docs.",
  })
  .openapi("DocEnum");

export const DocsSchema = z
  .object({
    tables: z
      .array(DocTableSchema)
      .readonly()
      .openapi({ description: "Every table, in file order" }),
    enums: z.array(DocEnumSchema).readonly().openapi({ description: "Every enum, in file order" }),
    parseError: ParseErrorSchema.nullable().openapi({
      description: "The syntax error that kept the docs from being read",
    }),
  })
  .readonly()
  .openapi({
    required: ["tables", "enums", "parseError"],
    description: "The generated documentation of the saved schema.",
  })
  .openapi("Docs");

export const DbColumnSchema = z
  .object({
    name: z.string().openapi({ description: "The property name in the schema" }),
    column: z.string().openapi({ description: "The database column name" }),
    type: z.string().openapi({ description: "The column builder" }),
    nullable: z.boolean().openapi({ description: "Whether it may hold null" }),
  })
  .readonly()
  .openapi({
    required: ["name", "column", "type", "nullable"],
    description: "A column the data views read and write.",
  })
  .openapi("DbColumn");

export const DbTableSchema = z
  .object({
    name: z.string().openapi({ description: "The exported name" }),
    table: z.string().openapi({ description: "The database table name" }),
    columns: z
      .array(DbColumnSchema)
      .readonly()
      .openapi({ description: "Its columns, in declaration order" }),
    key: z.array(z.string()).readonly().openapi({
      description:
        "The columns that identify a row: the primary key, else the unique columns, else all",
    }),
  })
  .readonly()
  .openapi({
    required: ["name", "table", "columns", "key"],
    description: "A table of the schema as the data views see it.",
  })
  .openapi("DbTable");

export const DbStatusSchema = z
  .object({
    connected: z.boolean().openapi({ description: "Whether a database is connected" }),
    dialect: z
      .enum(["sqlite", "postgresql", "mysql"])
      .nullable()
      .openapi({ description: "The SQL dialect of the connection" }),
    url: z
      .string()
      .nullable()
      .openapi({ description: "The connection URL with its password hidden" }),
    error: z
      .string()
      .nullable()
      .openapi({ description: "Why the connection failed, null when it did not" }),
    tables: z
      .array(DbTableSchema)
      .readonly()
      .openapi({ description: "The tables of the saved schema" }),
  })
  .readonly()
  .openapi({
    required: ["connected", "dialect", "url", "error", "tables"],
    description: "The database connection, and the tables the schema declares.",
  })
  .openapi("DbStatus");

export const CountsSchema = z
  .object({
    counts: z.record(z.string(), z.int32()).readonly().openapi({ description: "Rows per table" }),
  })
  .readonly()
  .openapi({
    required: ["counts"],
    description: "Row counts by table name; a table whose count fails is left out.",
  })
  .openapi("Counts");

export const ServiceUnavailableProblemSchema = z
  .object({
    type: z
      .literal("/problems/service-unavailable")
      .openapi({ description: "Problem type identifier (relative URI reference)" }),
    title: z
      .literal("Service Unavailable")
      .openapi({ description: "Short, human-readable summary of the problem type" }),
    status: z
      .literal(503)
      .openapi({ description: "HTTP status code, restated in the body per RFC 9457" }),
    detail: z
      .string()
      .openapi({ description: "Human-readable explanation specific to this occurrence" }),
    instance: z
      .string()
      .openapi({ description: "URI reference identifying this occurrence (the request path)" }),
  })
  .readonly()
  .openapi({
    required: ["type", "title", "status", "detail", "instance"],
    description:
      "RFC 9457 Problem Details for a request that needs the database while none is connected,\nor whose statement the database rejected.",
    example: {
      type: "/problems/service-unavailable",
      title: "Service Unavailable",
      status: 503,
      detail: "No database is connected. Pass --url to sizuku studio or set DATABASE_URL.",
      instance: "/api/db/counts",
    },
  })
  .openapi("ServiceUnavailableProblem");

export const TableNameSchema = z
  .string({ error: "Table name must be a JavaScript identifier" })
  .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, { error: "Table name must be a JavaScript identifier" })
  .openapi({
    description: "A table as the schema exports it (`export const user = pgTable(...)` → `user`).",
  })
  .openapi("TableName");

export const SkipSchema = z.coerce
  .number()
  .pipe(z.int32().min(0))
  .prefault(0)
  .openapi({
    description: "Rows to skip before the page (0-based). Defaults to 0.",
    "x-minValue-message": "skip must be 0 or more",
  })
  .openapi("Skip");

export const TakeSchema = z.coerce
  .number()
  .pipe(z.int32().min(1).max(1000))
  .prefault(100)
  .openapi({
    description: "Rows per page (1-1000). Defaults to 100.",
    "x-maxValue-message": "take must be 1000 or fewer",
    "x-minValue-message": "take must be at least 1",
  })
  .openapi("Take");

export const RowSchema = z
  .record(z.string(), z.union([z.string(), z.float64(), z.boolean()]).nullable())
  .readonly()
  .openapi({ description: "A row keyed by column property name." })
  .openapi("Row");

export const RowsSchema = z
  .object({
    rows: z.array(RowSchema).readonly().openapi({ description: "The rows of the page" }),
    total: z.int32().openapi({ description: "How many rows the table has" }),
    skip: z.int32().openapi({ description: "The skip the page was read with" }),
    take: z.int32().openapi({ description: "The take the page was read with" }),
  })
  .readonly()
  .openapi({
    required: ["rows", "total", "skip", "take"],
    description: "One page of a table's rows.",
  })
  .openapi("Rows");

export const NotFoundProblemSchema = z
  .object({
    type: z
      .literal("/problems/not-found")
      .openapi({ description: "Problem type identifier (relative URI reference)" }),
    title: z
      .literal("Not Found")
      .openapi({ description: "Short, human-readable summary of the problem type" }),
    status: z
      .literal(404)
      .openapi({ description: "HTTP status code, restated in the body per RFC 9457" }),
    detail: z
      .string()
      .openapi({ description: "Human-readable explanation specific to this occurrence" }),
    instance: z
      .string()
      .openapi({ description: "URI reference identifying this occurrence (the request path)" }),
  })
  .readonly()
  .openapi({
    required: ["type", "title", "status", "detail", "instance"],
    description: "RFC 9457 Problem Details for a table the schema does not declare.",
    example: {
      type: "/problems/not-found",
      title: "Not Found",
      status: 404,
      detail: 'Unknown table "nope".',
      instance: "/api/db/rows/nope",
    },
  })
  .openapi("NotFoundProblem");

export const AffectedSchema = z
  .object({ count: z.int32().openapi({ description: "Rows changed" }) })
  .readonly()
  .openapi({ required: ["count"], description: "How many rows a write changed." })
  .openapi("Affected");

export const InsertBodySchema = z
  .object({
    values: RowSchema.openapi({ description: "The values to insert, keyed by property name" }),
  })
  .readonly()
  .openapi({ required: ["values"], description: "A row to insert." })
  .openapi("InsertBody");

export const UpdateBodySchema = z
  .object({
    where: RowSchema.openapi({ description: "The key columns of the row to change" }),
    values: RowSchema.openapi({ description: "The columns to set" }),
  })
  .readonly()
  .openapi({ required: ["where", "values"], description: "A row to change." })
  .openapi("UpdateBody");

export const DeleteBodySchema = z
  .object({ where: RowSchema.openapi({ description: "The key columns of the row to delete" }) })
  .readonly()
  .openapi({ required: ["where"], description: "A row to delete." })
  .openapi("DeleteBody");

export const SqlResultSchema = z
  .object({
    columns: z
      .array(z.string())
      .readonly()
      .openapi({ description: "The result columns, in order" }),
    rows: z.array(RowSchema).readonly().openapi({ description: "The rows, keyed by column" }),
    rowCount: z.int32().openapi({ description: "Rows returned, or changed by a write" }),
    durationMs: z.float64().openapi({ description: "How long the statement took" }),
  })
  .readonly()
  .openapi({
    required: ["columns", "rows", "rowCount", "durationMs"],
    description: "What a statement returned.",
  })
  .openapi("SqlResult");

export const SqlBodySchema = z
  .object({ sql: z.string().min(1).openapi({ description: "The SQL statement" }) })
  .readonly()
  .openapi({ required: ["sql"], description: "A statement for the SQL console." })
  .openapi("SqlBody");

export const LanguageStatusSchema = z
  .object({
    typescript: z.string().nullable().openapi({
      description: "The version of the project's TypeScript, null when it could not be loaded",
    }),
    reason: z
      .string()
      .nullable()
      .openapi({ description: "Why there is no language service, null when there is one" }),
  })
  .readonly()
  .openapi({
    required: ["typescript", "reason"],
    description: "Whether the editor has TypeScript behind it.",
  })
  .openapi("LanguageStatus");

export const TextRangeSchema = z
  .object({
    start: z.int32().openapi({ description: "Where it starts" }),
    end: z.int32().openapi({ description: "Where it ends" }),
  })
  .readonly()
  .openapi({
    required: ["start", "end"],
    description: "A stretch of the source, as UTF-16 offsets.",
  })
  .openapi("TextRange");

export const CompletionItemSchema = z
  .object({
    label: z.string().openapi({ description: "What is shown and inserted" }),
    kind: z.string().openapi({
      description: "TypeScript's kind of the entry: `method`, `property`, `function`, ...",
    }),
    sortText: z.string().openapi({ description: "How TypeScript orders it" }),
    insertText: z
      .string()
      .nullable()
      .openapi({ description: "Text to insert in place of the label, when it differs" }),
    replacement: TextRangeSchema.nullable().openapi({
      description: "The text the completion replaces, when it is not the word at the cursor",
    }),
  })
  .readonly()
  .openapi({
    required: ["label", "kind", "sortText", "insertText", "replacement"],
    description: "One thing TypeScript offers at the cursor.",
  })
  .openapi("CompletionItem");

export const CompletionsSchema = z
  .object({
    items: z
      .array(CompletionItemSchema)
      .readonly()
      .openapi({ description: "The items, in TypeScript's order" }),
  })
  .readonly()
  .openapi({ required: ["items"], description: "The completions at the cursor." })
  .openapi("Completions");

export const PositionBodySchema = z
  .object({
    source: z.string().openapi({ description: "The schema source, saved or not" }),
    offset: z.int32().min(0).openapi({ description: "The UTF-16 offset of the cursor" }),
  })
  .readonly()
  .openapi({ required: ["source", "offset"], description: "The editor buffer and a place in it." })
  .openapi("PositionBody");

export const CompletionDetailSchema = z
  .object({
    detail: z.string().nullable().openapi({ description: "Its signature or type" }),
    documentation: z.string().nullable().openapi({ description: "Its doc comment, as Markdown" }),
  })
  .readonly()
  .openapi({
    required: ["detail", "documentation"],
    description: "The type and documentation of one completion.",
  })
  .openapi("CompletionDetail");

export const CompletionDetailBodySchema = z
  .object({
    source: z.string().openapi({ description: "The schema source, saved or not" }),
    offset: z.int32().min(0).openapi({ description: "The UTF-16 offset of the cursor" }),
    name: z.string().openapi({ description: "The name of the completion" }),
  })
  .readonly()
  .openapi({
    required: ["source", "offset", "name"],
    description: "A completion to describe in full.",
  })
  .openapi("CompletionDetailBody");

export const HoverSchema = z
  .object({
    contents: z
      .string()
      .nullable()
      .openapi({ description: "The type and documentation, as Markdown; null over nothing" }),
    range: TextRangeSchema.nullable().openapi({ description: "The symbol's range" }),
  })
  .readonly()
  .openapi({
    required: ["contents", "range"],
    description: "What TypeScript says about the symbol at the cursor.",
  })
  .openapi("Hover");

export const SignatureParameterSchema = z
  .object({
    label: z.string().openapi({ description: "How it reads in the signature" }),
    documentation: z.string().nullable().openapi({ description: "Its doc comment" }),
  })
  .readonly()
  .openapi({ required: ["label", "documentation"], description: "One parameter of a signature." })
  .openapi("SignatureParameter");

export const SignatureSchema = z
  .object({
    label: z.string().openapi({ description: "The whole signature" }),
    documentation: z.string().nullable().openapi({ description: "Its doc comment" }),
    parameters: z
      .array(SignatureParameterSchema)
      .readonly()
      .openapi({ description: "Its parameters" }),
  })
  .readonly()
  .openapi({
    required: ["label", "documentation", "parameters"],
    description: "One overload of the call.",
  })
  .openapi("Signature");

export const SignatureHelpSchema = z
  .object({
    signatures: z.array(SignatureSchema).readonly().openapi({ description: "The overloads" }),
    activeSignature: z.int32().openapi({ description: "The overload TypeScript picked" }),
    activeParameter: z.int32().openapi({ description: "The parameter the cursor is on" }),
  })
  .readonly()
  .openapi({
    required: ["signatures", "activeSignature", "activeParameter"],
    description: "The signatures of the call the cursor is in.",
  })
  .openapi("SignatureHelp");

export const DiagnosticSchema = z
  .object({
    message: z.string().openapi({ description: "What is wrong" }),
    severity: z.enum(["error", "warning", "info"]).openapi({ description: "How bad it is" }),
    range: TextRangeSchema.openapi({ description: "Where it is" }),
  })
  .readonly()
  .openapi({
    required: ["message", "severity", "range"],
    description: "One problem TypeScript found.",
  })
  .openapi("Diagnostic");

export const DiagnosticsSchema = z
  .object({
    diagnostics: z
      .array(DiagnosticSchema)
      .readonly()
      .openapi({ description: "The problems, in order of position" }),
  })
  .readonly()
  .openapi({
    required: ["diagnostics"],
    description:
      "The type errors of a source; its syntax errors come from the parser, with the diagram.",
  })
  .openapi("Diagnostics");

export const SourceBodySchema = z
  .object({ source: z.string().openapi({ description: "The schema source, saved or not" }) })
  .readonly()
  .openapi({ required: ["source"], description: "A source to check." })
  .openapi("SourceBody");

const RowsQuerySkipParamsSchema = SkipSchema.openapi({
  param: {
    name: "skip",
    in: "query",
    required: true,
    description: "Rows to skip before the page",
    schema: { $ref: "#/components/schemas/skip" },
    explode: false,
  },
});

const RowsQueryTakeParamsSchema = TakeSchema.openapi({
  param: {
    name: "take",
    in: "query",
    required: true,
    description: "Rows per page",
    schema: { $ref: "#/components/schemas/take" },
    explode: false,
  },
});

export const getSchemaRoute = createRoute({
  method: "get",
  path: "/schema",
  tags: ["schema"],
  description: "The schema file as it is on disk.",
  operationId: "readSchema",
  responses: {
    200: {
      description: "The request has succeeded.",
      content: { "application/json": { schema: SnapshotSchema } },
    },
    500: {
      description: "500 Internal Server Error (`application/problem+json`)",
      content: { "application/problem+json": { schema: InternalServerProblemSchema } },
    },
  },
} as const);

export const putSchemaRoute = createRoute({
  method: "put",
  path: "/schema",
  tags: ["schema"],
  description: "Write the schema file.",
  operationId: "writeSchema",
  request: {
    body: { content: { "application/json": { schema: SaveBodySchema } }, required: true },
  },
  responses: {
    200: {
      description: "The request has succeeded.",
      content: { "application/json": { schema: SnapshotSchema } },
    },
    422: {
      description: "422 Unprocessable Content (`application/problem+json`)",
      content: { "application/problem+json": { schema: ValidationProblemSchema } },
    },
    500: {
      description: "500 Internal Server Error (`application/problem+json`)",
      content: { "application/problem+json": { schema: InternalServerProblemSchema } },
    },
  },
} as const);

export const getSchemaEventsRoute = createRoute({
  method: "get",
  path: "/schema/events",
  tags: ["schema"],
  description: "A `change` event whenever the schema file changes on disk.",
  operationId: "readSchemaEvents",
  responses: {
    200: {
      description: "The request has succeeded.",
      content: { "text/event-stream": { schema: z.string() } },
    },
  },
} as const);

export const postDiagramSvgRoute = createRoute({
  method: "post",
  path: "/diagram/svg",
  tags: ["diagram"],
  description: "The ER diagram of a schema as SVG.",
  operationId: "drawSvg",
  request: {
    body: { content: { "application/json": { schema: DiagramBodySchema } }, required: true },
  },
  responses: {
    200: {
      description: "The request has succeeded.",
      content: { "application/json": { schema: DiagramSchema } },
    },
    422: {
      description: "422 Unprocessable Content (`application/problem+json`)",
      content: { "application/problem+json": { schema: ValidationProblemSchema } },
    },
    500: {
      description: "500 Internal Server Error (`application/problem+json`)",
      content: { "application/problem+json": { schema: InternalServerProblemSchema } },
    },
  },
} as const);

export const postDiagramPngRoute = createRoute({
  method: "post",
  path: "/diagram/png",
  tags: ["diagram"],
  description: "The ER diagram of a schema as PNG.",
  operationId: "drawPng",
  request: {
    body: { content: { "application/json": { schema: DiagramBodySchema } }, required: true },
  },
  responses: {
    200: {
      description: "The request has succeeded.",
      content: { "application/json": { schema: PngSchema } },
    },
    422: {
      description: "422 Unprocessable Content (`application/problem+json`)",
      content: { "application/problem+json": { schema: ValidationProblemSchema } },
    },
    500: {
      description: "500 Internal Server Error (`application/problem+json`)",
      content: { "application/problem+json": { schema: InternalServerProblemSchema } },
    },
  },
} as const);

export const postFormatRoute = createRoute({
  method: "post",
  path: "/format",
  tags: ["format"],
  description: "Format a schema with oxfmt; a source that does not parse is a 422.",
  operationId: "formatSource",
  request: {
    body: { content: { "application/json": { schema: FormatBodySchema } }, required: true },
  },
  responses: {
    200: {
      description: "The request has succeeded.",
      content: { "application/json": { schema: FormattedSchema } },
    },
    422: {
      description: "422 Unprocessable Content (`application/problem+json`)",
      content: { "application/problem+json": { schema: ValidationProblemSchema } },
    },
    500: {
      description: "500 Internal Server Error (`application/problem+json`)",
      content: { "application/problem+json": { schema: InternalServerProblemSchema } },
    },
  },
} as const);

export const getFormatSettingsRoute = createRoute({
  method: "get",
  path: "/format/settings",
  tags: ["format"],
  description: "The formatter settings in effect.",
  operationId: "readFormatSettings",
  responses: {
    200: {
      description: "The request has succeeded.",
      content: { "application/json": { schema: FormatSettingsSchema } },
    },
    500: {
      description: "500 Internal Server Error (`application/problem+json`)",
      content: { "application/problem+json": { schema: InternalServerProblemSchema } },
    },
  },
} as const);

export const putFormatSettingsRoute = createRoute({
  method: "put",
  path: "/format/settings",
  tags: ["format"],
  description: "Save the formatter settings to the project's `.oxfmtrc.json`.",
  operationId: "writeFormatSettings",
  request: {
    body: { content: { "application/json": { schema: FormatSettingsBodySchema } }, required: true },
  },
  responses: {
    200: {
      description: "The request has succeeded.",
      content: { "application/json": { schema: FormatSettingsSchema } },
    },
    422: {
      description: "422 Unprocessable Content (`application/problem+json`)",
      content: { "application/problem+json": { schema: ValidationProblemSchema } },
    },
    500: {
      description: "500 Internal Server Error (`application/problem+json`)",
      content: { "application/problem+json": { schema: InternalServerProblemSchema } },
    },
  },
} as const);

export const getDocsRoute = createRoute({
  method: "get",
  path: "/docs",
  tags: ["docs"],
  description: "The generated documentation of the saved schema.",
  operationId: "readDocs",
  responses: {
    200: {
      description: "The request has succeeded.",
      content: { "application/json": { schema: DocsSchema } },
    },
    500: {
      description: "500 Internal Server Error (`application/problem+json`)",
      content: { "application/problem+json": { schema: InternalServerProblemSchema } },
    },
  },
} as const);

export const getDbRoute = createRoute({
  method: "get",
  path: "/db",
  tags: ["db"],
  description: "The database connection and the tables of the schema.",
  operationId: "readDbStatus",
  responses: {
    200: {
      description: "The request has succeeded.",
      content: { "application/json": { schema: DbStatusSchema } },
    },
    500: {
      description: "500 Internal Server Error (`application/problem+json`)",
      content: { "application/problem+json": { schema: InternalServerProblemSchema } },
    },
  },
} as const);

export const getDbCountsRoute = createRoute({
  method: "get",
  path: "/db/counts",
  tags: ["db"],
  description: "The row count of every table.",
  operationId: "readCounts",
  responses: {
    200: {
      description: "The request has succeeded.",
      content: { "application/json": { schema: CountsSchema } },
    },
    500: {
      description: "500 Internal Server Error (`application/problem+json`)",
      content: { "application/problem+json": { schema: InternalServerProblemSchema } },
    },
    503: {
      description: "503 Service Unavailable (`application/problem+json`)",
      content: { "application/problem+json": { schema: ServiceUnavailableProblemSchema } },
    },
  },
} as const);

export const getDbRowsTableNameRoute = createRoute({
  method: "get",
  path: "/db/rows/{tableName}",
  tags: ["db"],
  description: "One page of a table's rows, ordered by its key.",
  operationId: "readRows",
  request: {
    params: z.object({
      tableName: TableNameSchema.openapi({
        param: {
          name: "tableName",
          in: "path",
          required: true,
          schema: { $ref: "#/components/schemas/tableName" },
        },
      }),
    }),
    query: z.object({ skip: RowsQuerySkipParamsSchema, take: RowsQueryTakeParamsSchema }),
  },
  responses: {
    200: {
      description: "The request has succeeded.",
      content: { "application/json": { schema: RowsSchema } },
    },
    404: {
      description: "404 Not Found (`application/problem+json`)",
      content: { "application/problem+json": { schema: NotFoundProblemSchema } },
    },
    422: {
      description: "422 Unprocessable Content (`application/problem+json`)",
      content: { "application/problem+json": { schema: ValidationProblemSchema } },
    },
    500: {
      description: "500 Internal Server Error (`application/problem+json`)",
      content: { "application/problem+json": { schema: InternalServerProblemSchema } },
    },
    503: {
      description: "503 Service Unavailable (`application/problem+json`)",
      content: { "application/problem+json": { schema: ServiceUnavailableProblemSchema } },
    },
  },
} as const);

export const postDbRowsTableNameRoute = createRoute({
  method: "post",
  path: "/db/rows/{tableName}",
  tags: ["db"],
  description: "Insert one row.",
  operationId: "createRow",
  request: {
    params: z.object({
      tableName: TableNameSchema.openapi({
        param: {
          name: "tableName",
          in: "path",
          required: true,
          schema: { $ref: "#/components/schemas/tableName" },
        },
      }),
    }),
    body: { content: { "application/json": { schema: InsertBodySchema } }, required: true },
  },
  responses: {
    200: {
      description: "The request has succeeded.",
      content: { "application/json": { schema: AffectedSchema } },
    },
    404: {
      description: "404 Not Found (`application/problem+json`)",
      content: { "application/problem+json": { schema: NotFoundProblemSchema } },
    },
    422: {
      description: "422 Unprocessable Content (`application/problem+json`)",
      content: { "application/problem+json": { schema: ValidationProblemSchema } },
    },
    500: {
      description: "500 Internal Server Error (`application/problem+json`)",
      content: { "application/problem+json": { schema: InternalServerProblemSchema } },
    },
    503: {
      description: "503 Service Unavailable (`application/problem+json`)",
      content: { "application/problem+json": { schema: ServiceUnavailableProblemSchema } },
    },
  },
} as const);

export const deleteDbRowsTableNameRoute = createRoute({
  method: "delete",
  path: "/db/rows/{tableName}",
  tags: ["db"],
  description: "Delete the row identified by `where`.",
  operationId: "deleteRow",
  request: {
    params: z.object({
      tableName: TableNameSchema.openapi({
        param: {
          name: "tableName",
          in: "path",
          required: true,
          schema: { $ref: "#/components/schemas/tableName" },
        },
      }),
    }),
    body: { content: { "application/json": { schema: DeleteBodySchema } }, required: true },
  },
  responses: {
    200: {
      description: "The request has succeeded.",
      content: { "application/json": { schema: AffectedSchema } },
    },
    404: {
      description: "404 Not Found (`application/problem+json`)",
      content: { "application/problem+json": { schema: NotFoundProblemSchema } },
    },
    422: {
      description: "422 Unprocessable Content (`application/problem+json`)",
      content: { "application/problem+json": { schema: ValidationProblemSchema } },
    },
    500: {
      description: "500 Internal Server Error (`application/problem+json`)",
      content: { "application/problem+json": { schema: InternalServerProblemSchema } },
    },
    503: {
      description: "503 Service Unavailable (`application/problem+json`)",
      content: { "application/problem+json": { schema: ServiceUnavailableProblemSchema } },
    },
  },
} as const);

export const patchDbRowsTableNameRoute = createRoute({
  method: "patch",
  path: "/db/rows/{tableName}",
  tags: ["db"],
  description: "Update the row identified by `where`.",
  operationId: "updateRow",
  request: {
    params: z.object({
      tableName: TableNameSchema.openapi({
        param: {
          name: "tableName",
          in: "path",
          required: true,
          schema: { $ref: "#/components/schemas/tableName" },
        },
      }),
    }),
    body: { content: { "application/json": { schema: UpdateBodySchema } }, required: true },
  },
  responses: {
    200: {
      description: "The request has succeeded.",
      content: { "application/json": { schema: AffectedSchema } },
    },
    404: {
      description: "404 Not Found (`application/problem+json`)",
      content: { "application/problem+json": { schema: NotFoundProblemSchema } },
    },
    422: {
      description: "422 Unprocessable Content (`application/problem+json`)",
      content: { "application/problem+json": { schema: ValidationProblemSchema } },
    },
    500: {
      description: "500 Internal Server Error (`application/problem+json`)",
      content: { "application/problem+json": { schema: InternalServerProblemSchema } },
    },
    503: {
      description: "503 Service Unavailable (`application/problem+json`)",
      content: { "application/problem+json": { schema: ServiceUnavailableProblemSchema } },
    },
  },
} as const);

export const postDbSqlRoute = createRoute({
  method: "post",
  path: "/db/sql",
  tags: ["db"],
  description: "Run one SQL statement.",
  operationId: "runSql",
  request: { body: { content: { "application/json": { schema: SqlBodySchema } }, required: true } },
  responses: {
    200: {
      description: "The request has succeeded.",
      content: { "application/json": { schema: SqlResultSchema } },
    },
    422: {
      description: "422 Unprocessable Content (`application/problem+json`)",
      content: { "application/problem+json": { schema: ValidationProblemSchema } },
    },
    500: {
      description: "500 Internal Server Error (`application/problem+json`)",
      content: { "application/problem+json": { schema: InternalServerProblemSchema } },
    },
    503: {
      description: "503 Service Unavailable (`application/problem+json`)",
      content: { "application/problem+json": { schema: ServiceUnavailableProblemSchema } },
    },
  },
} as const);

export const getLanguageRoute = createRoute({
  method: "get",
  path: "/language",
  tags: ["language"],
  description: "Whether the project's TypeScript is loaded, and why not when it is not.",
  operationId: "readLanguageStatus",
  responses: {
    200: {
      description: "The request has succeeded.",
      content: { "application/json": { schema: LanguageStatusSchema } },
    },
    500: {
      description: "500 Internal Server Error (`application/problem+json`)",
      content: { "application/problem+json": { schema: InternalServerProblemSchema } },
    },
  },
} as const);

export const postLanguageCompleteRoute = createRoute({
  method: "post",
  path: "/language/complete",
  tags: ["language"],
  description: "The completions at the cursor.",
  operationId: "complete",
  request: {
    body: { content: { "application/json": { schema: PositionBodySchema } }, required: true },
  },
  responses: {
    200: {
      description: "The request has succeeded.",
      content: { "application/json": { schema: CompletionsSchema } },
    },
    422: {
      description: "422 Unprocessable Content (`application/problem+json`)",
      content: { "application/problem+json": { schema: ValidationProblemSchema } },
    },
    500: {
      description: "500 Internal Server Error (`application/problem+json`)",
      content: { "application/problem+json": { schema: InternalServerProblemSchema } },
    },
    503: {
      description: "503 Service Unavailable (`application/problem+json`)",
      content: { "application/problem+json": { schema: ServiceUnavailableProblemSchema } },
    },
  },
} as const);

export const postLanguageCompleteDetailRoute = createRoute({
  method: "post",
  path: "/language/complete/detail",
  tags: ["language"],
  description: "The type and documentation of one completion.",
  operationId: "completeDetail",
  request: {
    body: {
      content: { "application/json": { schema: CompletionDetailBodySchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: "The request has succeeded.",
      content: { "application/json": { schema: CompletionDetailSchema } },
    },
    422: {
      description: "422 Unprocessable Content (`application/problem+json`)",
      content: { "application/problem+json": { schema: ValidationProblemSchema } },
    },
    500: {
      description: "500 Internal Server Error (`application/problem+json`)",
      content: { "application/problem+json": { schema: InternalServerProblemSchema } },
    },
    503: {
      description: "503 Service Unavailable (`application/problem+json`)",
      content: { "application/problem+json": { schema: ServiceUnavailableProblemSchema } },
    },
  },
} as const);

export const postLanguageHoverRoute = createRoute({
  method: "post",
  path: "/language/hover",
  tags: ["language"],
  description: "What TypeScript says about the symbol at the cursor.",
  operationId: "hover",
  request: {
    body: { content: { "application/json": { schema: PositionBodySchema } }, required: true },
  },
  responses: {
    200: {
      description: "The request has succeeded.",
      content: { "application/json": { schema: HoverSchema } },
    },
    422: {
      description: "422 Unprocessable Content (`application/problem+json`)",
      content: { "application/problem+json": { schema: ValidationProblemSchema } },
    },
    500: {
      description: "500 Internal Server Error (`application/problem+json`)",
      content: { "application/problem+json": { schema: InternalServerProblemSchema } },
    },
    503: {
      description: "503 Service Unavailable (`application/problem+json`)",
      content: { "application/problem+json": { schema: ServiceUnavailableProblemSchema } },
    },
  },
} as const);

export const postLanguageSignatureRoute = createRoute({
  method: "post",
  path: "/language/signature",
  tags: ["language"],
  description: "The signatures of the call the cursor is in.",
  operationId: "signature",
  request: {
    body: { content: { "application/json": { schema: PositionBodySchema } }, required: true },
  },
  responses: {
    200: {
      description: "The request has succeeded.",
      content: { "application/json": { schema: SignatureHelpSchema } },
    },
    422: {
      description: "422 Unprocessable Content (`application/problem+json`)",
      content: { "application/problem+json": { schema: ValidationProblemSchema } },
    },
    500: {
      description: "500 Internal Server Error (`application/problem+json`)",
      content: { "application/problem+json": { schema: InternalServerProblemSchema } },
    },
    503: {
      description: "503 Service Unavailable (`application/problem+json`)",
      content: { "application/problem+json": { schema: ServiceUnavailableProblemSchema } },
    },
  },
} as const);

export const postLanguageDiagnosticsRoute = createRoute({
  method: "post",
  path: "/language/diagnostics",
  tags: ["language"],
  description: "The type errors of the source.",
  operationId: "diagnostics",
  request: {
    body: { content: { "application/json": { schema: SourceBodySchema } }, required: true },
  },
  responses: {
    200: {
      description: "The request has succeeded.",
      content: { "application/json": { schema: DiagnosticsSchema } },
    },
    422: {
      description: "422 Unprocessable Content (`application/problem+json`)",
      content: { "application/problem+json": { schema: ValidationProblemSchema } },
    },
    500: {
      description: "500 Internal Server Error (`application/problem+json`)",
      content: { "application/problem+json": { schema: InternalServerProblemSchema } },
    },
    503: {
      description: "503 Service Unavailable (`application/problem+json`)",
      content: { "application/problem+json": { schema: ServiceUnavailableProblemSchema } },
    },
  },
} as const);
