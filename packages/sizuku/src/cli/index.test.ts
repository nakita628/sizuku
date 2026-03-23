import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { detectOutputType, stripImports } from "./index.js";

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
// detectOutputType
// ============================================================================

describe("detectOutputType", () => {
  it("returns dbml for .dbml extension", () => {
    expect(detectOutputType("schema.dbml")).toBe("dbml");
  });

  it("returns png for .png extension", () => {
    expect(detectOutputType("er-diagram.png")).toBe("png");
  });

  it("returns mermaid for .md extension", () => {
    expect(detectOutputType("ER.md")).toBe("mermaid");
  });

  it("returns null for unsupported extension .ts", () => {
    expect(detectOutputType("output.ts")).toBe(null);
  });

  it("returns null for unsupported extension .json", () => {
    expect(detectOutputType("output.json")).toBe(null);
  });

  it("returns null for unsupported extension .sql", () => {
    expect(detectOutputType("output.sql")).toBe(null);
  });

  it("returns null for unsupported extension .svg", () => {
    expect(detectOutputType("diagram.svg")).toBe(null);
  });

  it("returns null for empty string", () => {
    expect(detectOutputType("")).toBe(null);
  });

  it("returns null for filename without extension", () => {
    expect(detectOutputType("README")).toBe(null);
  });

  it("returns null for dot-only filename", () => {
    expect(detectOutputType(".")).toBe(null);
  });

  it("handles nested path with .dbml", () => {
    expect(detectOutputType("docs/db/schema.dbml")).toBe("dbml");
  });

  it("handles nested path with .png", () => {
    expect(detectOutputType("docs/er/diagram.png")).toBe("png");
  });

  it("handles nested path with .md", () => {
    expect(detectOutputType("docs/mermaid/ER.md")).toBe("mermaid");
  });

  it("handles deeply nested output path", () => {
    expect(detectOutputType("a/b/c/d/e/schema.dbml")).toBe("dbml");
  });

  it("returns null for .dbml.bak (compound extension)", () => {
    expect(detectOutputType("schema.dbml.bak")).toBe(null);
  });

  it("returns null for .md in directory name but .txt file", () => {
    expect(detectOutputType("docs.md/schema.txt")).toBe(null);
  });

  it("returns null for .png in directory name but .json file", () => {
    expect(detectOutputType("images.png/data.json")).toBe(null);
  });

  it("handles absolute path with .dbml", () => {
    expect(detectOutputType("/home/user/project/schema.dbml")).toBe("dbml");
  });

  it("handles absolute path with .md", () => {
    expect(detectOutputType("/tmp/output/ER.md")).toBe("mermaid");
  });
});

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

  it("returns error when input starts with -", async () => {
    process.argv = ["node", "sizuku", "-o", "output.dbml"];
    const { sizuku } = await import("./index.js");
    const result = await sizuku();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Missing input file path");
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
        "Unsupported output format: output.txt. Supported: .dbml, .png, .md",
      );
    }
  });

  it("returns error for unsupported output format .ts", async () => {
    process.argv = ["node", "sizuku", "schema.ts", "-o", "output.ts"];
    const { sizuku } = await import("./index.js");
    const result = await sizuku();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(
        "Unsupported output format: output.ts. Supported: .dbml, .png, .md",
      );
    }
  });

  it("returns error when input file does not exist", async () => {
    process.argv = ["node", "sizuku", "/tmp/nonexistent-schema-file.ts", "-o", "/tmp/out.dbml"];
    const { sizuku } = await import("./index.js");
    const result = await sizuku();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.startsWith("Failed to read input:")).toBe(true);
    }
  });
});

// ============================================================================
// E2E: DBML generation
// ============================================================================

describe("E2E: DBML generation", () => {
  let tmpdir: string;

  beforeEach(() => {
    tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "sizuku-e2e-dbml-"));
  });

  afterEach(() => {
    fs.rmSync(tmpdir, { recursive: true, force: true });
  });

  it("generates DBML with correct table and column definitions for EC schema", async () => {
    fs.writeFileSync(path.join(tmpdir, "schema.ts"), ecSchemaContent, "utf-8");
    const output = path.join(tmpdir, "output", "schema.dbml");

    const code = stripImports(ecSchemaContent);
    const { sizukuDbml } = await import("../generator/dbml/index.js");
    const result = await sizukuDbml(code, output);

    expect(result.ok).toBe(true);
    expect(fs.existsSync(output)).toBe(true);

    const content = fs.readFileSync(output, "utf-8");

    // Tables exist
    expect(content.includes("Table user {")).toBe(true);
    expect(content.includes("Table order {")).toBe(true);
    expect(content.includes("Table orderItem {")).toBe(true);

    // User columns
    expect(content.includes("id varchar [pk]")).toBe(true);
    expect(content.includes("name varchar")).toBe(true);
    expect(content.includes("email varchar")).toBe(true);

    // Order columns
    expect(content.includes("userId varchar")).toBe(true);
    expect(content.includes("total decimal")).toBe(true);
    expect(content.includes("createdAt timestamp")).toBe(true);

    // OrderItem columns
    expect(content.includes("orderId int")).toBe(true);
    expect(content.includes("productName varchar")).toBe(true);
    expect(content.includes("quantity int")).toBe(true);
    expect(content.includes("price decimal")).toBe(true);

    // Foreign key refs
    expect(content.includes("Ref order_userId_user_id_fk: order.userId > user.id")).toBe(true);
    expect(
      content.includes("Ref orderItem_orderId_order_id_fk: orderItem.orderId > order.id"),
    ).toBe(true);
  });

  it("generates DBML with field descriptions as notes for auth schema", async () => {
    fs.writeFileSync(path.join(tmpdir, "schema.ts"), pgAuthSchema, "utf-8");
    const output = path.join(tmpdir, "output", "auth.dbml");

    const code = stripImports(pgAuthSchema);
    const { sizukuDbml } = await import("../generator/dbml/index.js");
    const result = await sizukuDbml(code, output);

    expect(result.ok).toBe(true);
    const content = fs.readFileSync(output, "utf-8");

    expect(content.includes("Table account {")).toBe(true);
    expect(content.includes("note: 'Primary key'")).toBe(true);
    expect(content.includes("note: 'User email address'")).toBe(true);
  });

  it("generates DBML for single-table schema without refs", async () => {
    fs.writeFileSync(path.join(tmpdir, "schema.ts"), singleTableSchema, "utf-8");
    const output = path.join(tmpdir, "output", "config.dbml");

    const code = stripImports(singleTableSchema);
    const { sizukuDbml } = await import("../generator/dbml/index.js");
    const result = await sizukuDbml(code, output);

    expect(result.ok).toBe(true);
    const content = fs.readFileSync(output, "utf-8");

    expect(content.includes("Table config {")).toBe(true);
    expect(content.includes("key text [pk]")).toBe(true);
    expect(content.includes("value text")).toBe(true);
    // No Ref lines
    expect(content.includes("Ref ")).toBe(false);
  });
});

// ============================================================================
// E2E: Mermaid ER generation
// ============================================================================

describe("E2E: Mermaid ER generation", () => {
  let tmpdir: string;

  beforeEach(() => {
    tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "sizuku-e2e-mermaid-"));
  });

  afterEach(() => {
    fs.rmSync(tmpdir, { recursive: true, force: true });
  });

  it("generates Mermaid ER with full erDiagram block for EC schema", async () => {
    fs.writeFileSync(path.join(tmpdir, "schema.ts"), ecSchemaContent, "utf-8");
    const output = path.join(tmpdir, "output", "ER.md");

    const code = stripImports(ecSchemaContent);
    const { sizukuMermaidER } = await import("../generator/mermaid-er/index.js");
    const result = await sizukuMermaidER(code, output);

    expect(result.ok).toBe(true);
    expect(fs.existsSync(output)).toBe(true);

    const content = fs.readFileSync(output, "utf-8");

    // Mermaid structure
    expect(content.startsWith("```mermaid\nerDiagram")).toBe(true);
    expect(content.endsWith("```")).toBe(true);

    // Relations (user -> order, order -> orderItem)
    expect(content.includes('user ||--}| order : "(id) - (userId)"')).toBe(true);
    expect(content.includes('order ||--}| orderItem : "(id) - (orderId)"')).toBe(true);

    // Table definitions
    expect(content.includes("user {")).toBe(true);
    expect(content.includes("order {")).toBe(true);
    expect(content.includes("orderItem {")).toBe(true);

    // Field details
    expect(content.includes("varchar id PK")).toBe(true);
    expect(content.includes("varchar name")).toBe(true);
    expect(content.includes("varchar userId FK")).toBe(true);
    expect(content.includes("int orderId FK")).toBe(true);
  });

  it("generates Mermaid ER for single-table schema without relations", async () => {
    fs.writeFileSync(path.join(tmpdir, "schema.ts"), singleTableSchema, "utf-8");
    const output = path.join(tmpdir, "output", "ER.md");

    const code = stripImports(singleTableSchema);
    const { sizukuMermaidER } = await import("../generator/mermaid-er/index.js");
    const result = await sizukuMermaidER(code, output);

    expect(result.ok).toBe(true);
    const content = fs.readFileSync(output, "utf-8");

    expect(content.startsWith("```mermaid\nerDiagram")).toBe(true);
    expect(content.endsWith("```")).toBe(true);
    expect(content.includes("config {")).toBe(true);
    expect(content.includes("text key PK")).toBe(true);
    expect(content.includes("text value")).toBe(true);
    // No relation lines (no ||-- pattern)
    expect(content.includes("||--")).toBe(false);
  });

  it("generates Mermaid ER with field descriptions for auth schema", async () => {
    fs.writeFileSync(path.join(tmpdir, "schema.ts"), pgAuthSchema, "utf-8");
    const output = path.join(tmpdir, "output", "ER.md");

    const code = stripImports(pgAuthSchema);
    const { sizukuMermaidER } = await import("../generator/mermaid-er/index.js");
    const result = await sizukuMermaidER(code, output);

    expect(result.ok).toBe(true);
    const content = fs.readFileSync(output, "utf-8");

    expect(content.includes("account {")).toBe(true);
    expect(content.includes('uuid id PK "Primary key"')).toBe(true);
    expect(content.includes('varchar email "User email address"')).toBe(true);
  });
});

// ============================================================================
// E2E: PNG generation
// ============================================================================

describe("E2E: PNG generation", () => {
  let tmpdir: string;

  beforeEach(() => {
    tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "sizuku-e2e-png-"));
  });

  afterEach(() => {
    fs.rmSync(tmpdir, { recursive: true, force: true });
  });

  it("generates valid PNG binary for EC schema", async () => {
    fs.writeFileSync(path.join(tmpdir, "schema.ts"), ecSchemaContent, "utf-8");
    const output = path.join(tmpdir, "output", "er.png");

    const code = stripImports(ecSchemaContent);
    const { sizukuDbml } = await import("../generator/dbml/index.js");
    const result = await sizukuDbml(code, output);

    expect(result.ok).toBe(true);
    expect(fs.existsSync(output)).toBe(true);

    const buffer = fs.readFileSync(output);
    // PNG magic bytes: 89 50 4E 47 (‰PNG)
    expect(buffer[0]).toBe(0x89);
    expect(buffer[1]).toBe(0x50);
    expect(buffer[2]).toBe(0x4e);
    expect(buffer[3]).toBe(0x47);
    expect(buffer.length > 1000).toBe(true);
  });

  it("generates valid PNG for single-table schema", async () => {
    fs.writeFileSync(path.join(tmpdir, "schema.ts"), singleTableSchema, "utf-8");
    const output = path.join(tmpdir, "output", "config.png");

    const code = stripImports(singleTableSchema);
    const { sizukuDbml } = await import("../generator/dbml/index.js");
    const result = await sizukuDbml(code, output);

    expect(result.ok).toBe(true);
    expect(fs.existsSync(output)).toBe(true);

    const buffer = fs.readFileSync(output);
    expect(buffer[0]).toBe(0x89);
    expect(buffer[1]).toBe(0x50);
    expect(buffer[2]).toBe(0x4e);
    expect(buffer[3]).toBe(0x47);
  });
});

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
      expect(result.error.startsWith("Failed to read input:")).toBe(true);
    }
  });
});
