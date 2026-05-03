import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { stripImports } from "../utils/index.js";

const HELP_TEXT = `💧 sizuku - Drizzle ORM schema tools

Usage:
  sizuku <input> -o <output> [options]

Options:
  -o <path>                         Output file path
  --zod                             Generate Zod validation schema
  --valibot                         Generate Valibot validation schema
  --arktype                         Generate ArkType validation schema
  --effect                          Generate Effect Schema validation schema
  --zod-version <version>           Zod variant: 'v4' | 'mini' | '@hono/zod-openapi'
  --no-export-types                 Do not export inferred types
  --no-with-comment                 Do not add JSDoc comments
  --no-with-relation                Do not generate relation schemas
  -h, --help                        Display this help message`;

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
    expect(result).toStrictEqual([""]);
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

  it("handles content with only imports returns last import via slice(-1)", () => {
    const code = `import { pgTable } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'`;
    const result = stripImports(code);
    expect(result).toStrictEqual(["import { relations } from 'drizzle-orm'"]);
  });

  it("multi-line import: stripImports only checks line-level import prefix", () => {
    const code = `import {
  pgTable,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

export const user = pgTable('user', {})`;
    const result = stripImports(code);
    // stripImports checks per-line startsWith('import') — continuation lines
    // like "  pgTable," don't start with "import", so they become the first result
    expect(result[0]).toBe("  pgTable,");
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

describe("sizuku argv parsing", () => {
  const originalArgv = process.argv;

  afterEach(() => {
    process.argv = originalArgv;
  });

  it("returns help text when no arguments provided", async () => {
    process.argv = ["node", "sizuku"];
    const { sizuku } = await import("./index.js");
    const result = await sizuku();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(HELP_TEXT);
    }
  });

  it("returns help text when input starts with -", async () => {
    process.argv = ["node", "sizuku", "-o", "output.dbml"];
    const { sizuku } = await import("./index.js");
    const result = await sizuku();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(HELP_TEXT);
    }
  });

  it("returns help text with --help flag", async () => {
    process.argv = ["node", "sizuku", "--help"];
    const { sizuku } = await import("./index.js");
    const result = await sizuku();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(HELP_TEXT);
    }
  });

  it("returns help text with -h flag", async () => {
    process.argv = ["node", "sizuku", "-h"];
    const { sizuku } = await import("./index.js");
    const result = await sizuku();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(HELP_TEXT);
    }
  });

  it("returns error when -o flag is missing", async () => {
    process.argv = ["node", "sizuku", "schema.ts"];
    const { sizuku } = await import("./index.js");
    const result = await sizuku();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Missing -o flag. Usage: sizuku <input> -o <output>");
    }
  });

  it("returns error when output path is missing after -o", async () => {
    process.argv = ["node", "sizuku", "schema.ts", "-o"];
    const { sizuku } = await import("./index.js");
    const result = await sizuku();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Missing output file path after -o");
    }
  });

  it("returns error for unsupported output format .txt", async () => {
    process.argv = ["node", "sizuku", "schema.ts", "-o", "output.txt"];
    const { sizuku } = await import("./index.js");
    const result = await sizuku();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(
        "Unsupported output format: output.txt. Supported: .dbml, .png, .md, .ts",
      );
    }
  });

  it("returns error for .ts output without schema flag", async () => {
    process.argv = ["node", "sizuku", "schema.ts", "-o", "output.ts"];
    const { sizuku } = await import("./index.js");
    const result = await sizuku();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Specify --zod, --valibot, --arktype, or --effect for .ts output");
    }
  });

  it("returns error when input file does not exist", async () => {
    process.argv = ["node", "sizuku", "/tmp/nonexistent-schema-file.ts", "-o", "/tmp/out.dbml"];
    const { sizuku } = await import("./index.js");
    const result = await sizuku();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(
        "Failed to read input: ENOENT: no such file or directory, open '/tmp/nonexistent-schema-file.ts'",
      );
    }
  });
});

// ============================================================================
// sizuku() direct schema mode (process.argv mock + tmpfile)
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

describe("sizuku() direct schema via process.argv", () => {
  const originalArgv = process.argv;
  let tmpdir: string;

  beforeEach(() => {
    tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "sizuku-direct-schema-"));
    fs.writeFileSync(path.join(tmpdir, "schema.ts"), annotatedSchema, "utf-8");
  });

  afterEach(() => {
    process.argv = originalArgv;
    fs.rmSync(tmpdir, { recursive: true, force: true });
  });

  it("generates Zod schema via --zod", async () => {
    const output = path.join(tmpdir, "out", "zod.ts");
    process.argv = ["node", "sizuku", path.join(tmpdir, "schema.ts"), "-o", output, "--zod"];
    const { sizuku } = await import("./index.js");
    const result = await sizuku();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(`💧 Generated Zod schema at: ${output}`);
    }
    const content = fs.readFileSync(output, "utf-8");
    expect(content.includes("from 'zod'")).toBe(true);
    expect(content.includes("UserSchema")).toBe(true);
  });

  it("generates Valibot schema via --valibot", async () => {
    const output = path.join(tmpdir, "out", "valibot.ts");
    process.argv = ["node", "sizuku", path.join(tmpdir, "schema.ts"), "-o", output, "--valibot"];
    const { sizuku } = await import("./index.js");
    const result = await sizuku();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(`💧 Generated Valibot schema at: ${output}`);
    }
    const content = fs.readFileSync(output, "utf-8");
    expect(content.includes("from 'valibot'")).toBe(true);
    expect(content.includes("UserSchema")).toBe(true);
  });

  it("generates ArkType schema via --arktype", async () => {
    const output = path.join(tmpdir, "out", "arktype.ts");
    process.argv = ["node", "sizuku", path.join(tmpdir, "schema.ts"), "-o", output, "--arktype"];
    const { sizuku } = await import("./index.js");
    const result = await sizuku();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(`💧 Generated ArkType schema at: ${output}`);
    }
    const content = fs.readFileSync(output, "utf-8");
    expect(content.includes("from 'arktype'")).toBe(true);
    expect(content.includes("UserSchema")).toBe(true);
  });

  it("generates Effect schema via --effect", async () => {
    const output = path.join(tmpdir, "out", "effect.ts");
    process.argv = ["node", "sizuku", path.join(tmpdir, "schema.ts"), "-o", output, "--effect"];
    const { sizuku } = await import("./index.js");
    const result = await sizuku();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(`💧 Generated Effect schema at: ${output}`);
    }
    const content = fs.readFileSync(output, "utf-8");
    expect(content.includes("from 'effect'")).toBe(true);
    expect(content.includes("UserSchema")).toBe(true);
  });

  it("generates Zod schema without types via --no-export-types", async () => {
    const output = path.join(tmpdir, "out", "no-types.ts");
    process.argv = [
      "node",
      "sizuku",
      path.join(tmpdir, "schema.ts"),
      "-o",
      output,
      "--zod",
      "--no-export-types",
    ];
    const { sizuku } = await import("./index.js");
    const result = await sizuku();
    expect(result.ok).toBe(true);
    const content = fs.readFileSync(output, "utf-8");
    expect(content.includes("UserSchema")).toBe(true);
    expect(content.includes("export type User")).toBe(false);
  });

  it("generates Zod schema without comments via --no-with-comment", async () => {
    const output = path.join(tmpdir, "out", "no-comment.ts");
    process.argv = [
      "node",
      "sizuku",
      path.join(tmpdir, "schema.ts"),
      "-o",
      output,
      "--zod",
      "--no-with-comment",
    ];
    const { sizuku } = await import("./index.js");
    const result = await sizuku();
    expect(result.ok).toBe(true);
    const content = fs.readFileSync(output, "utf-8");
    expect(content.includes("UserSchema")).toBe(true);
  });

  it("each library produces distinct output", async () => {
    const zodOut = path.join(tmpdir, "out", "z.ts");
    const valibotOut = path.join(tmpdir, "out", "v.ts");
    const arktypeOut = path.join(tmpdir, "out", "a.ts");
    const effectOut = path.join(tmpdir, "out", "e.ts");
    const schemaPath = path.join(tmpdir, "schema.ts");

    for (const [flag, out] of [
      ["--zod", zodOut],
      ["--valibot", valibotOut],
      ["--arktype", arktypeOut],
      ["--effect", effectOut],
    ]) {
      process.argv = ["node", "sizuku", schemaPath, "-o", out, flag];
      const { sizuku } = await import("./index.js");
      await sizuku();
    }

    const zodContent = fs.readFileSync(zodOut, "utf-8");
    const valibotContent = fs.readFileSync(valibotOut, "utf-8");
    const arktypeContent = fs.readFileSync(arktypeOut, "utf-8");
    const effectContent = fs.readFileSync(effectOut, "utf-8");

    // Each has distinct import
    expect(zodContent.includes("from 'zod'")).toBe(true);
    expect(valibotContent.includes("from 'valibot'")).toBe(true);
    expect(arktypeContent.includes("from 'arktype'")).toBe(true);
    expect(effectContent.includes("from 'effect'")).toBe(true);

    // All different
    expect(zodContent).not.toBe(valibotContent);
    expect(zodContent).not.toBe(arktypeContent);
    expect(zodContent).not.toBe(effectContent);
    expect(valibotContent).not.toBe(arktypeContent);
  });
});

// ============================================================================
// E2E: DBML generation
// ============================================================================

// ============================================================================
// E2E: Full pipeline via sizuku() with process.argv
// ============================================================================

describe("E2E: sizuku() full pipeline", () => {
  let tmpdir: string;
  const originalArgv = process.argv;

  beforeEach(() => {
    tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "sizuku-e2e-full-"));
    fs.writeFileSync(path.join(tmpdir, "schema.ts"), ecSchemaContent, "utf-8");
  });

  afterEach(() => {
    process.argv = originalArgv;
    fs.rmSync(tmpdir, { recursive: true, force: true });
  });

  it("sizuku() generates DBML file via CLI args", async () => {
    const schemaPath = path.join(tmpdir, "schema.ts");
    const outputPath = path.join(tmpdir, "out", "schema.dbml");
    process.argv = ["node", "sizuku", schemaPath, "-o", outputPath];

    const { sizuku } = await import("./index.js");
    const result = await sizuku();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(`💧 Generated DBML at: ${outputPath}`);
    }
    expect(fs.existsSync(outputPath)).toBe(true);
    const content = fs.readFileSync(outputPath, "utf-8");
    expect(content.includes("Table user {")).toBe(true);
    expect(content.includes("Table order {")).toBe(true);
    expect(content.includes("Table orderItem {")).toBe(true);
  });

  it("sizuku() generates Mermaid ER file via CLI args", async () => {
    const schemaPath = path.join(tmpdir, "schema.ts");
    const outputPath = path.join(tmpdir, "out", "ER.md");
    process.argv = ["node", "sizuku", schemaPath, "-o", outputPath];

    const { sizuku } = await import("./index.js");
    const result = await sizuku();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(`💧 Generated Mermaid ER at: ${outputPath}`);
    }
    expect(fs.existsSync(outputPath)).toBe(true);
    const content = fs.readFileSync(outputPath, "utf-8");
    expect(content.includes("erDiagram")).toBe(true);
  });

  it("sizuku() generates PNG file via CLI args", async () => {
    const schemaPath = path.join(tmpdir, "schema.ts");
    const outputPath = path.join(tmpdir, "out", "er.png");
    process.argv = ["node", "sizuku", schemaPath, "-o", outputPath];

    const { sizuku } = await import("./index.js");
    const result = await sizuku();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(`💧 Generated PNG at: ${outputPath}`);
    }
    expect(fs.existsSync(outputPath)).toBe(true);
    const buffer = fs.readFileSync(outputPath);
    expect(buffer[0]).toBe(0x89);
    expect(buffer[1]).toBe(0x50);
  });

  it("sizuku() returns error for non-existent input file", async () => {
    const outputPath = path.join(tmpdir, "out", "schema.dbml");
    process.argv = ["node", "sizuku", "/tmp/does-not-exist-12345.ts", "-o", outputPath];

    const { sizuku } = await import("./index.js");
    const result = await sizuku();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(
        "Failed to read input: ENOENT: no such file or directory, open '/tmp/does-not-exist-12345.ts'",
      );
    }
  });
});
