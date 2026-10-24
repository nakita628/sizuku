![img](https://github.com/nakita628/sizuku/blob/main/assets/img/sizuku.png)

# Sizuku

**[Sizuku](https://www.npmjs.com/package/sizuku)** is a CLI tool that generates validation schemas for Zod, Valibot, ArkType, and Effect Schema, as well as ER diagrams, from [Drizzle](https://orm.drizzle.team/) schemas.

## Features

- 💎 Generates [Zod](https://zod.dev/) schemas from your Drizzle schema
- 🤖 Generates [Valibot](https://valibot.dev/) schemas from your Drizzle schema
- 🏹 Generates [ArkType](https://arktype.io/) schemas from your Drizzle schema
- ⚡ Generates [Effect Schema](https://effect.website/docs/schema/introduction/) from your Drizzle schema
- 📊 Creates [Mermaid](https://mermaid.js.org/) ER diagrams
- 📝 Generates [DBML](https://dbml.dbdiagram.io/) (Database Markup Language) files
- 🖼️ Draws ER diagrams as **SVG** / **PNG** images (light and dark)
- ✏️ `sizuku studio`: edit the schema in Monaco beside its live ER diagram, read its generated docs, and browse and edit the database's rows

## Installation

```bash
npm install -D sizuku
```

## Usage

```
sizuku <input> -o <output> [options]
sizuku studio <input> [--port <port>] [--url <database-url>]
```

### Options

```
-o <path>                         Output file path (.ts, .md, .dbml, .svg, .png)
--zod                             Generate Zod validation schema
--valibot                         Generate Valibot validation schema
--arktype                         Generate ArkType validation schema
--effect                          Generate Effect Schema validation schema
--zod-version <version>           Zod variant: 'v4' | 'mini' | '@hono/zod-openapi'
--no-export-types                 Do not export inferred types
--no-with-comment                 Do not add JSDoc comments
--no-with-relation                Do not generate relation schemas
--theme <light|dark>              Colour scheme of the .svg / .png ER diagram
--port <port>                     Port for sizuku studio (default: 4983)
--url <database-url>              Database for sizuku studio (default: $DATABASE_URL)
-h, --help                        Display help message
```

### Quick Start

```sh
# Generate Zod schema
npx sizuku db/schema.ts -o zod/index.ts --zod

# Generate Valibot schema
npx sizuku db/schema.ts -o valibot/index.ts --valibot

# Generate DBML
npx sizuku db/schema.ts -o docs/schema.dbml

# Generate ER diagram (SVG or PNG)
npx sizuku db/schema.ts -o docs/er.svg
npx sizuku db/schema.ts -o docs/er.png --theme dark

# Generate Mermaid ER diagram
npx sizuku db/schema.ts -o docs/ER.md

# Edit the schema, its ER diagram, docs and data in the browser
npx sizuku studio db/schema.ts --url file:./dev.db
```

## Schema Annotations

Add `///` comments to your Drizzle schema fields with library-specific annotations:

```ts
import { relations } from "drizzle-orm";
import { mysqlTable, varchar } from "drizzle-orm/mysql-core";

export const user = mysqlTable("user", {
  /// Primary key
  /// @z.uuid()
  /// @v.pipe(v.string(), v.uuid())
  /// @a."string.uuid"
  /// @e.Schema.UUID
  id: varchar("id", { length: 36 }).primaryKey(),
  /// Display name
  /// @z.string().min(1).max(50)
  /// @v.pipe(v.string(), v.minLength(1), v.maxLength(50))
  /// @a."1 <= string <= 50"
  /// @e.Schema.String.pipe(Schema.minLength(1), Schema.maxLength(50))
  name: varchar("name", { length: 50 }).notNull(),
});

export const post = mysqlTable("post", {
  /// @z.uuid()
  /// @v.pipe(v.string(), v.uuid())
  /// @a."string.uuid"
  /// @e.Schema.UUID
  id: varchar("id", { length: 36 }).primaryKey(),
  /// @z.string().min(1).max(100)
  /// @v.pipe(v.string(), v.minLength(1), v.maxLength(100))
  /// @a."1 <= string <= 100"
  /// @e.Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100))
  title: varchar("title", { length: 100 }).notNull(),
  /// @z.uuid()
  /// @v.pipe(v.string(), v.uuid())
  /// @a."string.uuid"
  /// @e.Schema.UUID
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => user.id),
});

export const userRelations = relations(user, ({ many }) => ({
  posts: many(post),
}));

export const postRelations = relations(post, ({ one }) => ({
  user: one(user, {
    fields: [post.userId],
    references: [user.id],
  }),
}));
```

Annotations are optional. Generators work without them (DBML/Mermaid don't need annotations at all).

## Output Examples

### Zod

```sh
npx sizuku db/schema.ts -o zod/index.ts --zod
```

```ts
import * as z from "zod";

export const UserSchema = z.object({
  /**
   * Primary key
   */
  id: z.uuid(),
  /**
   * Display name
   */
  name: z.string().min(1).max(50),
});

export type User = z.infer<typeof UserSchema>;

export const UserRelationsSchema = z.object({
  ...UserSchema.shape,
  posts: z.array(PostSchema),
});

export type UserRelations = z.infer<typeof UserRelationsSchema>;
```

### Valibot

```sh
npx sizuku db/schema.ts -o valibot/index.ts --valibot
```

```ts
import * as v from "valibot";

export const UserSchema = v.object({
  /**
   * Primary key
   */
  id: v.pipe(v.string(), v.uuid()),
  /**
   * Display name
   */
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(50)),
});

export type User = v.InferOutput<typeof UserSchema>;

export const UserRelationsSchema = v.object({
  ...UserSchema.entries,
  posts: v.array(PostSchema),
});

export type UserRelations = v.InferOutput<typeof UserRelationsSchema>;
```

### ArkType

```sh
npx sizuku db/schema.ts -o arktype/index.ts --arktype
```

```ts
import { type } from "arktype";

export const UserSchema = type({
  /**
   * Primary key
   */
  id: "string.uuid",
  /**
   * Display name
   */
  name: "1 <= string <= 50",
});

export type User = typeof UserSchema.infer;

export const UserRelationsSchema = type({
  ...UserSchema.t,
  posts: PostSchema.array(),
});

export type UserRelations = typeof UserRelationsSchema.infer;
```

### Effect Schema

```sh
npx sizuku db/schema.ts -o effect/index.ts --effect
```

```ts
import { Schema } from "effect";

export const UserSchema = Schema.Struct({
  /**
   * Primary key
   */
  id: Schema.UUID,
  /**
   * Display name
   */
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(50)),
});

export type User = typeof UserSchema.Type;

export const UserRelationsSchema = Schema.Struct({
  ...UserSchema.fields,
  posts: Schema.Array(PostSchema),
});

export type UserRelations = typeof UserRelationsSchema.Type;
```

### DBML

```sh
npx sizuku db/schema.ts -o docs/schema.dbml
```

```dbml
Table user {
  id varchar [pk, note: 'Primary key']
  name varchar [note: 'Display name']
}

Table post {
  id varchar [pk]
  title varchar
  userId varchar
}

Ref post_userId_user_id_fk: post.userId > user.id
```

### Mermaid ER

```sh
npx sizuku db/schema.ts -o docs/ER.md
```

```mermaid
erDiagram
    user ||--|{ post : "(id) - (userId)"
    user {
        varchar id PK "Primary key"
        varchar name "Display name"
    }
    post {
        varchar id PK
        varchar title
        varchar userId FK
    }
```

### ER Diagram (SVG / PNG)

```sh
npx sizuku db/schema.ts -o docs/er.svg
npx sizuku db/schema.ts -o docs/er.png --theme dark
```

![ER diagram](https://github.com/nakita628/sizuku/blob/main/fixtures/example/docs/er-diagram.png)

Tables are laid out left to right along their relations. Each card shows its columns with
the primary key, foreign keys, `UK` for unique columns, `?` for nullable ones, defaults
(`.default()`, `.defaultNow()`, `$defaultFn()`, `$onUpdate()`), `///` descriptions and the
indexes, unique and composite key constraints of the table. `pgEnum`s get a card of their own.
Edges use crow's-foot notation and name the relation and its `onDelete` / `onUpdate` action;
an edge declared only by `/// @relation` is dashed, since nothing in the database backs it.

## Studio

```sh
npx sizuku studio db/schema.ts
npx sizuku studio db/schema.ts --url file:./dev.db          # SQLite (node:sqlite)
npx sizuku studio db/schema.ts --url postgres://localhost/app # pg from your project
```

Opens `http://127.0.0.1:4983` with four pages:

- **Schema**: the file in Monaco with its ER diagram beside it, redrawn as you type. Completion,
  hovers, signature help and type errors come from the project's TypeScript and drizzle-orm's
  types; syntax errors are underlined with their line while the last good drawing stays.
  Ctrl/Cmd + S saves, **Format** runs oxfmt, and the diagram downloads as SVG or PNG.
- **Docs**: every table, column, key, default, index, relation (both ways) and enum, with the
  `///` descriptions.
- **Data**: each table's rows, with adding, editing and deleting a row (composite keys included).
- **SQL**: a console on the same database.

The formatter settings are saved to the project's `.oxfmtrc.json`, so `oxfmt` formats the file the
same way; the editor settings (font size, word wrap, format on save, auto save, ...) stay in the
browser. The server listens on `127.0.0.1` only.

See [docs/studio.md](https://github.com/nakita628/sizuku/blob/main/packages/sizuku/docs/studio.md) for the full guide and
[docs/studio-api.md](https://github.com/nakita628/sizuku/blob/main/packages/sizuku/docs/studio-api.md) for its API.

## Relation Detection

Sizuku detects relations from four sources. They are reflected consistently
across every ER output format (Mermaid, DBML, SVG and PNG).

### 1. `.references()` chain

```ts
userId: varchar("user_id").references(() => user.id);
```

### 2. `foreignKey()` constraint

```ts
export const post = pgTable('post', { ... }, (t) => [
  foreignKey({ columns: [t.userId], foreignColumns: [user.id] }),
])
```

The older object form, `(t) => ({ fk: foreignKey(...) })`, is read as well.

### 3. `relations()` block

```ts
export const postRelations = relations(post, ({ one }) => ({
  user: one(user, { fields: [post.userId], references: [user.id] }),
}));
```

### 4. `/// @relation` annotation (no foreign key required)

Document a relation for the ER diagram without a Drizzle foreign key by adding a
`/// @relation <parent>.<field> <child>.<field> <cardinality>` annotation. No
`.references()` is needed:

```ts
/// @relation user.id post.userId one-to-many
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});

export const post = sqliteTable("post", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
});
```

`<field>` is the schema **property name** (`userId`), not the database column.
`<cardinality>` is `<from>-to-<to>` where each side is `zero-one`, `one`,
`zero-many`, or `many`; add a `-optional` suffix for a dashed (non-identifying) line.

## License

Distributed under the MIT License. See [LICENSE](https://github.com/nakita628/sizuku?tab=MIT-1-ov-file) for more information.
