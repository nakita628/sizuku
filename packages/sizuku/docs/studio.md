# sizuku studio

A local web app for a Drizzle schema: edit it in Monaco with its ER diagram beside it, read its
generated docs, and browse and edit the rows of the database it describes.

```sh
npx sizuku studio db/schema.ts
npx sizuku studio db/schema.ts --url file:./dev.db
npx sizuku studio db/schema.ts --url postgres://user:pass@localhost:5432/app --port 5000
```

| Option                 | Default         | What it does                                                   |
| ---------------------- | --------------- | -------------------------------------------------------------- |
| `--url <database-url>` | `$DATABASE_URL` | The database the **Data** and **SQL** pages work on. Optional. |
| `--port <port>`        | `4983`          | The port to listen on. The server answers on `127.0.0.1` only. |

Stop the server with **Ctrl+C**; the database connection is closed with it.

## Pages

### Schema

The schema file in [Monaco](https://microsoft.github.io/monaco-editor/) on the left and its ER
diagram on the right, redrawn about a quarter of a second after you stop typing — unsaved text
included.

- A syntax error is underlined in the editor and named under the diagram, with its line and
  column; click it to jump there. The last diagram that parsed stays on screen meanwhile.
- **Save** (Ctrl/Cmd + S) writes the file. A change made by another editor is picked up: a clean
  editor takes it at once, and with unsaved edits a banner asks whether to load the file or keep
  your edits.
- **Format** (Shift + Alt + F, or _Format Document_ in the context menu) runs
  [oxfmt](https://oxc.rs/docs/guide/usage/formatter) on the server with the project's settings.
- **SVG** / **PNG** download the diagram in the current theme. The diagram is the same one
  `sizuku db/schema.ts -o er.svg` writes.
- Drag to pan, scroll to zoom around the pointer, and use the **−**, **+** and **⛶** (fit) buttons.
  The divider between the panes can be dragged, or moved with the arrow keys.

#### Completion and type errors

The editor asks the project's own TypeScript about the schema, through the server, so it knows
drizzle-orm's types as they are installed:

- **Completion** of what is there to write: the builders an import offers (`varchar`,
  `integer`, `pgEnum`, ...), the column methods after a `.` (`.notNull()`, `.default()`,
  `.references()`, ...), object keys and the tables of the file. The highlighted item shows its
  type and documentation.
- **Signature help** inside a call, with the parameter you are on.
- **Hover** over a name for its type.
- **Type errors** under a squiggle about half a second after you stop typing: `.notNul()` is
  `Property 'notNul' does not exist ... Did you mean 'notNull'?`. While the file has a syntax
  error, only that one is shown.

The header says which TypeScript is in use (**TS 6.0.3**). The schema is checked as part of the
project: with the compiler options of the nearest `tsconfig.json`, and with its imports — other
files of the schema, drizzle-orm — resolved from the schema's directory as the project resolves
them. Unsaved text is what is checked.

This needs `typescript` 5.x or 6.x installed in the project (`npm install -D typescript`).
TypeScript 7 has no language service API yet. Without one, the header says **No TypeScript**
(hover it for why) and the editor keeps its colouring and the parser's syntax errors.

### Docs

The documentation of the saved file, generated from the schema and its `///` comments:

- every table with its database name and description;
- each column's type, `PK` / `UNIQUE` / `NOT NULL`, its defaults (`.default()`, `.defaultNow()`,
  `$defaultFn()`, ...), its description and the column it references;
- indexes, unique and composite keys;
- relations in both directions (**References** and **Referenced by**), with their cardinality and
  `onDelete` / `onUpdate` actions. A relation declared only with `/// @relation` is marked, since
  no foreign key backs it;
- every `pgEnum` and its values.

### Data

One page per table of the schema, listed in the sidebar with its row count. The rows are read 50
at a time, ordered by the primary key.

- **Add row** opens a form with a field per column. Fields left empty are not sent, so the
  database fills them in from its defaults; a nullable column has a **NULL** box.
- The pencil (or a double click on a row) edits a row; only the fields you changed are sent.
- The bin deletes a row after asking.

A row is identified by its primary key — a composite one included — or, without one, by its
unique columns, or else by all of its columns. Columns are written by their database names
(`author_id`), while the page shows the schema's property names (`authorId`).

### SQL

A SQL console on the same database: one statement at a time, **Ctrl/Cmd + Enter** to run it. A
query shows its rows; a write shows how many rows it changed and refreshes the counts in the
sidebar. The text is kept in the browser between visits.

## Databases

| URL                                                | Driver                                                             |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| `file:./dev.db`, `sqlite:./dev.db`, `./dev.sqlite` | Node.js's built-in `node:sqlite` (Node 22.13+)                     |
| `postgres://...`, `postgresql://...`               | [`pg`](https://www.npmjs.com/package/pg) from your project         |
| `mysql://...`, `mariadb://...`                     | [`mysql2`](https://www.npmjs.com/package/mysql2) from your project |

sizuku ships no database driver of its own: PostgreSQL and MySQL use the package your project
already depends on (`npm install pg` or `npm install mysql2` if it does not). A relative SQLite
path is resolved from the directory the studio was started in.

When the connection fails, the studio still starts: the Schema and Docs pages work, and the
sidebar shows why the database is not connected.

## Settings

The gear at the bottom of the sidebar opens the settings.

### Formatter

The options oxfmt formats the schema with. They belong to the project, not to the browser:
**Save formatter settings** writes them to the `.oxfmtrc.json` (or `.oxfmtrc.jsonc`) oxfmt itself
reads — the nearest one above the schema — so `oxfmt` on the command line and your editor format
the file the same way. Other keys of that file (`ignorePatterns`, ...) are kept. Without one,
a new `.oxfmtrc.json` is created in the working directory.

| Option            | Default  |
| ----------------- | -------- |
| Print width       | `100`    |
| Tab width         | `2`      |
| Indent with tabs  | off      |
| Semicolons        | on       |
| Single quotes     | off      |
| Spaces in braces  | on       |
| Trailing commas   | `all`    |
| Arrow parentheses | `always` |

The editor indents with the tab width and tabs setting from here as well.

### Editor

Kept in the browser and applied at once: font size, word wrap, minimap, **Format on save** (run
the formatter before every save) and **Auto save** (save a second after you stop typing, as long
as the schema parses).

The theme switch (sun / moon) is beside the gear; the first visit follows the system setting.

## Security

The API is unauthenticated, so the server listens on `127.0.0.1` only and refuses any request
whose host name is not `localhost`, `127.0.0.1` or `[::1]` — a page on another site cannot reach
it even through a DNS name that resolves to your machine. It reads and writes the schema file it
was started with, the formatter config, and the database you pass.

## API

The page talks to a JSON API under `/api`, described in [studio-api.md](studio-api.md) and served
as OpenAPI 3.1 at `http://127.0.0.1:4983/api/openapi.json` while the studio runs. Errors are
[RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) problem details (`application/problem+json`).

```sh
curl -s http://127.0.0.1:4983/api/db/rows/user?skip=0\&take=10
curl -s -X POST http://127.0.0.1:4983/api/db/sql -H 'content-type: application/json' \
  -d '{"sql":"SELECT count(*) AS n FROM users"}'
```

## Working on the studio

The API contract is [`main.tsp`](../main.tsp) (TypeSpec). `pnpm -F sizuku studio:api` turns it
into the `@hono/zod-openapi` routes (`src/studio/server/routes`), the typed `hc` client and the
TanStack Query hooks (`src/studio/client/api`, `hooks`) and [studio-api.md](studio-api.md), with
[hono-takibi](https://www.npmjs.com/package/hono-takibi). Handlers it has already written are kept.

| Path                         | What it is                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------ |
| `src/studio/server/handlers` | One Hono handler per route: runs a use case, maps its errors to problems       |
| `src/studio/server/usecases` | What each route does, as [Effect](https://effect.website) programs             |
| `src/studio/server/services` | The schema file, the formatter, the project's TypeScript, the database drivers |
| `src/studio/server/domain`   | Pure functions: docs, SQL statements, parse errors, problems                   |
| `src/studio/client`          | React + TanStack Router / Query + HeroUI + Tailwind + Monaco, built by Vite    |

```sh
pnpm -F sizuku studio:dev   # Vite with hot reload and the API, on examples/studio/db/schema.ts
SIZUKU_SCHEMA=path/to/schema.ts SIZUKU_DATABASE_URL=file:./dev.db pnpm -F sizuku studio:dev
pnpm -F sizuku build        # the library (tsdown) and the client (dist/studio)
```
