import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NodeServices } from "@effect/platform-node";
import { Effect, Exit, Stdio } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { version } from "../../package.json" with { type: "json" };
import { stripImports } from "../utils/index.js";
import { outputKind, sizuku } from "./index.js";

// ============================================================================
// Fixture: MySQL EC schema (User + Order + OrderItem with relations)
// ============================================================================

const ecSchemaContent = `import { mysqlTable, varchar, int, decimal, timestamp } from 'drizzle-orm/mysql-core'
import { relations } from 'drizzle-orm'

export const user = mysqlTable('user', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
})

export const order = mysqlTable('order', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => user.id),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').notNull(),
})

export const orderItem = mysqlTable('order_item', {
  id: int('id').primaryKey().autoincrement(),
  orderId: int('order_id').notNull().references(() => order.id),
  productName: varchar('product_name', { length: 200 }).notNull(),
  quantity: int('quantity').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
})`;

// ============================================================================
// Fixture: Simple single-table schema (no relations)
// ============================================================================

const singleTableSchema = `import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const config = sqliteTable('config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})`;

// ============================================================================
// Fixture: PostgreSQL auth schema with comments
// ============================================================================

const pgAuthSchema = `import { pgTable, uuid, varchar, timestamp, boolean } from 'drizzle-orm/pg-core'

/// Account table
export const account = pgTable('account', {
  /// Primary key
  id: uuid('id').primaryKey().defaultRandom(),
  /// User email address
  email: varchar('email', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  isActive: boolean('is_active').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})`;
// ============================================================================
// stripImports
// ============================================================================

describe("stripImports", () => {
  it("strips two import lines and blank line from EC schema", () => {
    const result = stripImports(ecSchemaContent);
    expect(result[0]).toBe("export const user = mysqlTable('user', {");
    expect(result.length).toBe(20);
  });

  it("strips single import line from single-table schema", () => {
    const result = stripImports(singleTableSchema);
    expect(result[0]).toBe("export const config = sqliteTable('config', {");
  });

  it("strips imports from PG auth schema and preserves comment lines", () => {
    const result = stripImports(pgAuthSchema);
    expect(result[0]).toBe("/// Account table");
    expect(result[1]).toBe("export const account = pgTable('account', {");
  });

  it("returns all lines for content without imports", () => {
    const code = "export const user = mysqlTable('user', {\n  id: varchar('id').primaryKey(),\n})";
    const result = stripImports(code);
    expect(result[0]).toBe("export const user = mysqlTable('user', {");
    expect(result.length).toBe(3);
  });

  it("handles empty content", () => {
    const result = stripImports("");
    expect(result).toStrictEqual([]);
  });

  it("strips multiple import lines with blank lines between them", () => {
    const code = `import { pgTable } from 'drizzle-orm/pg-core'

import { relations } from 'drizzle-orm'

export const account = pgTable('account', {})`;
    const result = stripImports(code);
    expect(result[0]).toBe("export const account = pgTable('account', {})");
  });

  it("preserves inline comment annotations after imports", () => {
    const code = `import { sqliteTable } from 'drizzle-orm/sqlite-core'

/// @relation user.id post.userId one-to-many
export const user = sqliteTable('user', {})`;
    const result = stripImports(code);
    expect(result[0]).toBe("/// @relation user.id post.userId one-to-many");
    expect(result[1]).toBe("export const user = sqliteTable('user', {})");
  });

  it("handles content with only imports", () => {
    const code = `import { pgTable } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'`;
    const result = stripImports(code);
    expect(result).toStrictEqual([]);
  });

  it("strips an import written over several lines", () => {
    const code = `import {
  pgTable,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

export const user = pgTable('user', {})`;
    const result = stripImports(code);
    expect(result).toStrictEqual(["export const user = pgTable('user', {})"]);
  });

  it("falls back to dropping import lines when the source does not parse", () => {
    expect(stripImports("import { a } from 'a'\nexport const x = (")).toStrictEqual([
      "export const x = (",
    ]);
  });

  it("preserves blank lines within schema definitions", () => {
    const code = `import { mysqlTable, varchar } from 'drizzle-orm/mysql-core'

export const user = mysqlTable('user', {
  id: varchar('id', { length: 36 }).primaryKey(),
})

export const post = mysqlTable('post', {
  id: varchar('id', { length: 36 }).primaryKey(),
})`;
    const result = stripImports(code);
    // includes the blank line between tables
    expect(result[0]).toBe("export const user = mysqlTable('user', {");
    expect(result[3]).toBe("");
    expect(result[4]).toBe("export const post = mysqlTable('post', {");
  });
});
// ============================================================================
// sizuku() - argv parsing integration (via process.argv mock)
// ============================================================================

/**
 * Runs the CLI as `dist/index.mjs` does — same command, same platform services — with the
 * arguments put in through `Stdio` and `console` recorded, which is everything a user would see.
 */
async function cli(args: readonly string[]) {
  const out: string[] = [];
  const err: string[] = [];
  vi.spyOn(console, "log").mockImplementation((...parts: unknown[]) => {
    out.push(parts.map(String).join(" "));
  });
  vi.spyOn(console, "error").mockImplementation((...parts: unknown[]) => {
    err.push(parts.map(String).join(" "));
  });
  const exit = await Effect.runPromiseExit(
    sizuku().pipe(
      Effect.provide(Stdio.layerTest({ args: Effect.succeed(args) })),
      Effect.provide(NodeServices.layer),
    ),
  );
  vi.restoreAllMocks();
  return { exit, out: out.join("\n"), printed: [...out, ...err].join("\n") };
}

describe("outputKind", () => {
  it("reads what an output path asks for from its extension", () => {
    expect(["a.dbml", "a.png", "a.svg", "a.md", "a.ts", "a.txt"].map(outputKind)).toStrictEqual([
      "dbml",
      "diagram",
      "diagram",
      "mermaid",
      "typescript",
      null,
    ]);
  });
});

describe("sizuku --help and --version", () => {
  it("shows the usage, the generate flags and the studio subcommand", async () => {
    // Without arguments the usage is the answer: shown as help (the binary exits 0), not as an error.
    for (const args of [[], ["--help"], ["-h"]]) {
      const { out, printed } = await cli(args);
      expect(printed).not.toContain("ERROR");
      expect(out).toContain("USAGE");
      expect(out).toContain("--zod-version");
      expect(out).toContain("--no-export-types");
      expect(out).toContain("studio");
    }
  });

  it("prints the version", async () => {
    expect((await cli(["--version"])).out).toContain(version);
  });

  it("shows the studio subcommand's own flags", async () => {
    const { out } = await cli(["studio", "--help"]);
    expect(out).toContain("--port");
    expect(out).toContain("--url");
  });
});

describe("sizuku rejects a command line it cannot run", () => {
  const cases = [
    [["schema.ts"], "Missing -o flag. Usage: sizuku <input> -o <output>"],
    [["schema.ts", "-o", "output.txt"], "Unsupported output format: output.txt"],
    [["schema.ts", "-o", "output.ts"], "Specify --zod, --valibot, --arktype, or --effect"],
    [["/tmp/nonexistent-schema-file.ts", "-o", "/tmp/out.dbml"], "does not exist"],
    [["schema.ts", "-o", "a.svg", "--theme", "blue"], 'Expected: "light" | "dark"'],
    [["schema.ts", "-o", "a.ts", "--zod", "--zod-version", "v3"], "--zod-version"],
    [["studio"], "Missing required argument: input"],
    [["studio", "schema.ts", "--port", "70000"], "a port from 1 to 65535"],
  ] as const;
  for (const [args, message] of cases) {
    it(`sizuku ${args.join(" ")}`, async () => {
      const { exit, printed } = await cli(args);
      expect(Exit.isFailure(exit)).toBe(true);
      expect(printed).toContain(message);
    });
  }
});

// ============================================================================
// Generating from a schema on disk
// ============================================================================

const annotatedSchema = `import { mysqlTable, varchar } from 'drizzle-orm/mysql-core'

export const user = mysqlTable('user', {
  /// @z.string().uuid()
  /// @v.pipe(v.string(), v.uuid())
  /// @a."string.uuid"
  /// @e.Schema.UUID
  id: varchar('id', { length: 36 }).primaryKey(),
  /// @z.string().min(1)
  /// @v.pipe(v.string(), v.minLength(1))
  /// @a."string>=1"
  /// @e.Schema.String.pipe(Schema.minLength(1))
  name: varchar('name', { length: 50 }).notNull(),
})`;

describe("sizuku <input> -o <output>", () => {
  let tmpdir: string;
  let schemaPath: string;

  beforeEach(() => {
    tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "sizuku-cli-"));
    schemaPath = path.join(tmpdir, "schema.ts");
    fs.writeFileSync(schemaPath, annotatedSchema, "utf-8");
  });

  afterEach(() => {
    fs.rmSync(tmpdir, { recursive: true, force: true });
  });

  const libraries = [
    ["--zod", "Zod", "from 'zod'"],
    ["--valibot", "Valibot", "from 'valibot'"],
    ["--arktype", "ArkType", "from 'arktype'"],
    ["--effect", "Effect", "from 'effect'"],
  ] as const;

  for (const [flag, label, from] of libraries) {
    it(`generates the ${label} schema with ${flag}`, async () => {
      const output = path.join(tmpdir, "out", `${label}.ts`);
      const { exit, out } = await cli([schemaPath, "-o", output, flag]);
      expect(Exit.isSuccess(exit)).toBe(true);
      expect(out).toBe(`💧 Generated ${label} schema at: ${output}`);
      const content = fs.readFileSync(output, "utf-8");
      expect(content).toContain(from);
      expect(content).toContain("UserSchema");
    });
  }

  it("refuses a schema whose columns are not annotated, naming them, and writes nothing", async () => {
    const bare = path.join(tmpdir, "bare.ts");
    fs.writeFileSync(
      bare,
      "export const tag = mysqlTable('tag', {\n  /// @z.number()\n  id: int('id').primaryKey(),\n  name: varchar('name', { length: 50 }),\n})",
      "utf-8",
    );
    const output = path.join(tmpdir, "tag.ts");
    const { exit, printed } = await cli([bare, "-o", output, "--zod"]);
    expect(Exit.isFailure(exit)).toBe(true);
    expect(printed).toContain(
      "1 column has no /// @z. annotation, so the Zod schema cannot be written: tag.name.",
    );
    expect(printed).toContain("for example /// @z.string()");
    expect(fs.existsSync(output)).toBe(false);
  });

  it("takes the flags in any order, before the input too", async () => {
    const output = path.join(tmpdir, "first.ts");
    const { exit } = await cli(["--zod", "-o", output, schemaPath]);
    expect(Exit.isSuccess(exit)).toBe(true);
    expect(fs.readFileSync(output, "utf-8")).toContain("UserSchema");
  });

  it("leaves the types out with --no-export-types and the comments with --no-with-comment", async () => {
    const output = path.join(tmpdir, "bare.ts");
    await cli([schemaPath, "-o", output, "--zod", "--no-export-types", "--no-with-comment"]);
    const content = fs.readFileSync(output, "utf-8");
    expect(content).toContain("UserSchema");
    expect(content).not.toContain("export type User");
  });

  it("writes zod/mini with --zod-version mini", async () => {
    const output = path.join(tmpdir, "mini.ts");
    await cli([schemaPath, "-o", output, "--zod", "--zod-version", "mini"]);
    expect(fs.readFileSync(output, "utf-8")).toContain("from 'zod/mini'");
  });
});

describe("sizuku writes DBML, Mermaid and the ER diagram", () => {
  let tmpdir: string;
  let schemaPath: string;

  beforeEach(() => {
    tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "sizuku-e2e-"));
    schemaPath = path.join(tmpdir, "schema.ts");
    fs.writeFileSync(schemaPath, ecSchemaContent, "utf-8");
  });

  afterEach(() => {
    fs.rmSync(tmpdir, { recursive: true, force: true });
  });

  it("generates DBML", async () => {
    const output = path.join(tmpdir, "schema.dbml");
    const { out } = await cli([schemaPath, "-o", output]);
    expect(out).toBe(`💧 Generated DBML at: ${output}`);
    const content = fs.readFileSync(output, "utf-8");
    expect(content).toContain("Table user {");
    expect(content).toContain("Table order {");
    expect(content).toContain("Table orderItem {");
  });

  it("generates Mermaid ER", async () => {
    const output = path.join(tmpdir, "ER.md");
    const { out } = await cli([schemaPath, "-o", output]);
    expect(out).toBe(`💧 Generated Mermaid ER at: ${output}`);
    expect(fs.readFileSync(output, "utf-8")).toContain("erDiagram");
  });

  it("generates the PNG and the dark SVG ER diagram", async () => {
    const png = path.join(tmpdir, "er.png");
    expect((await cli([schemaPath, "-o", png])).out).toBe(`💧 Generated PNG ER diagram at: ${png}`);
    const buffer = fs.readFileSync(png);
    expect([buffer[0], buffer[1]]).toStrictEqual([0x89, 0x50]);
    const svg = path.join(tmpdir, "er.svg");
    await cli([schemaPath, "-o", svg, "--theme", "dark"]);
    expect(fs.readFileSync(svg, "utf-8")).toContain("<svg");
  });
});
