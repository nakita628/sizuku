import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Test run
// pnpm vitest run ./src/index.test.ts

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
// CLI binary path
// ============================================================================

const CLI_PATH = path.resolve(__dirname, "../dist/index.mjs");

/**
 * Execute the built CLI binary and return stdout, stderr, and exit code
 */
function runCli(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    execFile("node", [CLI_PATH, ...args], { timeout: 30000 }, (error, stdout, stderr) => {
      resolve({
        stdout: stdout.toString().trim(),
        stderr: stderr.toString().trim(),
        code: error?.code ? Number(error.code) : 0,
      });
    });
  });
}

// ============================================================================
// Fixtures (inline, no external file dependency)
// ============================================================================

const mysqlEcSchema = `import { mysqlTable, varchar, int, decimal, timestamp } from 'drizzle-orm/mysql-core'
import { relations } from 'drizzle-orm'

export const customer = mysqlTable('customer', {
  /// @z.string().uuid()
  /// @v.pipe(v.string(), v.uuid())
  /// @a."string.uuid"
  /// @e.Schema.UUID
  id: varchar('id', { length: 36 }).primaryKey(),
  /// @z.string().min(1).max(100)
  /// @v.pipe(v.string(), v.minLength(1), v.maxLength(100))
  /// @a."1<=string<=100"
  /// @e.Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100))
  name: varchar('name', { length: 100 }).notNull(),
  /// @z.string().email()
  /// @v.pipe(v.string(), v.email())
  /// @a."string.email"
  /// @e.Schema.String.pipe(Schema.pattern(/^[^@]+@[^@]+$/))
  email: varchar('email', { length: 255 }).notNull(),
})

export const purchase = mysqlTable('purchase', {
  /// @z.number().int()
  /// @v.pipe(v.number(), v.integer())
  /// @a."number.integer"
  /// @e.Schema.Number.pipe(Schema.int())
  id: int('id').primaryKey().autoincrement(),
  /// @z.string().uuid()
  /// @v.pipe(v.string(), v.uuid())
  /// @a."string.uuid"
  /// @e.Schema.UUID
  customerId: varchar('customer_id', { length: 36 }).notNull().references(() => customer.id),
  /// @z.string()
  /// @v.string()
  /// @a."string"
  /// @e.Schema.String
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  /// @z.date()
  /// @v.date()
  /// @a."Date"
  /// @e.Schema.Date
  purchasedAt: timestamp('purchased_at').notNull(),
})`;

const authSchema = `import { relations, sql } from 'drizzle-orm'
import { foreignKey, int, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const User = sqliteTable('User', {
  /// Unique user ID
  id: text('id').notNull().primaryKey(),
  /// Display name
  name: text('name'),
  /// Email address
  email: text('email').unique(),
  /// Role of the user (ADMIN or USER)
  role: text('role', { enum: ['ADMIN', 'USER'] }).notNull().default('USER'),
  /// Whether 2FA is enabled
  isTwoFactorEnabled: int('isTwoFactorEnabled', { mode: 'boolean' }).default(false),
})

export const Account = sqliteTable(
  'Account',
  {
    /// Unique account ID
    id: text('id').notNull().primaryKey(),
    /// Reference to the user ID
    userId: text('userId').notNull(),
    /// Type of account
    type: text('type').notNull(),
    /// Provider name
    provider: text('provider').notNull(),
    /// Provider account ID
    providerAccountId: text('providerAccountId').notNull(),
  },
  (Account) => ({
    Account_user_fkey: foreignKey({
      name: 'Account_user_fkey',
      columns: [Account.userId],
      foreignColumns: [User.id],
    }),
  }),
)

export const TwoFactorConfirmation = sqliteTable(
  'TwoFactorConfirmation',
  {
    /// Confirmation ID
    id: text('id').notNull().primaryKey(),
    /// Reference to user
    userId: text('userId').notNull().unique(),
  },
  (TwoFactorConfirmation) => ({
    TwoFactorConfirmation_user_fkey: foreignKey({
      name: 'TwoFactorConfirmation_user_fkey',
      columns: [TwoFactorConfirmation.userId],
      foreignColumns: [User.id],
    }),
  }),
)`;

// ============================================================================
// Config mode (sizuku.config.ts)
// ============================================================================

// ============================================================================
// CLI binary: error handling
// ============================================================================

describe("CLI binary: error handling", () => {
  it("outputs help text with no arguments", async () => {
    const result = await runCli([]);
    expect(result.stdout).toBe(HELP_TEXT);
    expect(result.stderr).toBe("");
  });

  it("outputs help text with --help", async () => {
    const result = await runCli(["--help"]);
    expect(result.stdout).toBe(HELP_TEXT);
    expect(result.stderr).toBe("");
  });

  it("outputs help text with -h", async () => {
    const result = await runCli(["-h"]);
    expect(result.stdout).toBe(HELP_TEXT);
    expect(result.stderr).toBe("");
  });

  it("outputs help when input starts with dash", async () => {
    const result = await runCli(["-o", "output.dbml"]);
    expect(result.stderr).toBe(HELP_TEXT);
    expect(result.stdout).toBe("");
  });

  it("outputs error when -o flag is missing", async () => {
    const result = await runCli(["schema.ts"]);
    expect(result.stderr).toBe("Missing -o flag. Usage: sizuku <input> -o <output>");
  });

  it("outputs error when output path is missing after -o", async () => {
    const result = await runCli(["schema.ts", "-o"]);
    expect(result.stderr).toBe("Missing output file path after -o");
  });

  it("outputs error for unsupported output format .txt", async () => {
    const result = await runCli(["schema.ts", "-o", "output.txt"]);
    expect(result.stderr).toBe(
      "Unsupported output format: output.txt. Supported: .dbml, .png, .md, .ts",
    );
  });

  it("outputs error for unsupported output format .json", async () => {
    const result = await runCli(["schema.ts", "-o", "output.json"]);
    expect(result.stderr).toBe(
      "Unsupported output format: output.json. Supported: .dbml, .png, .md, .ts",
    );
  });

  it("outputs error for unsupported output format .svg", async () => {
    const result = await runCli(["schema.ts", "-o", "diagram.svg"]);
    expect(result.stderr).toBe(
      "Unsupported output format: diagram.svg. Supported: .dbml, .png, .md, .ts",
    );
  });

  it("outputs error when input file does not exist", async () => {
    const result = await runCli(["/tmp/nonexistent-file-12345.ts", "-o", "/tmp/out.dbml"]);
    expect(result.stderr).toBe(
      "Failed to read input: ENOENT: no such file or directory, open '/tmp/nonexistent-file-12345.ts'",
    );
  });
});

// ============================================================================
// CLI binary: DBML generation
// ============================================================================

describe("CLI binary: DBML generation", () => {
  let tmpdir: string;

  beforeEach(() => {
    tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "sizuku-cli-dbml-"));
  });

  afterEach(() => {
    fs.rmSync(tmpdir, { recursive: true, force: true });
  });

  it("generates DBML from EC schema with tables, columns, and refs", async () => {
    const schemaPath = path.join(tmpdir, "schema.ts");
    const outputPath = path.join(tmpdir, "output", "schema.dbml");
    fs.writeFileSync(schemaPath, mysqlEcSchema, "utf-8");

    const result = await runCli([schemaPath, "-o", outputPath]);

    expect(result.stdout).toBe(`💧 Generated DBML at: ${outputPath}`);
    expect(result.stderr).toBe("");

    const content = fs.readFileSync(outputPath, "utf-8");

    expect(content.includes("Table customer {")).toBe(true);
    expect(content.includes("Table purchase {")).toBe(true);
    expect(content.includes("  id varchar [pk]")).toBe(true);
    expect(content.includes("  name varchar")).toBe(true);
    expect(content.includes("  email varchar")).toBe(true);
    expect(content.includes("  customerId varchar")).toBe(true);
    expect(content.includes("  amount decimal")).toBe(true);
    expect(content.includes("  purchasedAt timestamp")).toBe(true);
    expect(
      content.includes("Ref purchase_customerId_customer_id_fk: purchase.customerId > customer.id"),
    ).toBe(true);
  });

  it("creates output directory automatically", async () => {
    const schemaPath = path.join(tmpdir, "schema.ts");
    const outputPath = path.join(tmpdir, "deep", "nested", "dir", "schema.dbml");
    fs.writeFileSync(schemaPath, mysqlEcSchema, "utf-8");

    const result = await runCli([schemaPath, "-o", outputPath]);

    expect(result.stdout).toBe(`💧 Generated DBML at: ${outputPath}`);
    expect(fs.existsSync(outputPath)).toBe(true);
  });
});

// ============================================================================
// CLI binary: DBML with auth schema (inline tmpfile, no fixture dependency)
// ============================================================================

describe("CLI binary: DBML with auth schema", () => {
  let tmpdir: string;

  beforeEach(() => {
    tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "sizuku-cli-auth-"));
    fs.writeFileSync(path.join(tmpdir, "schema.ts"), authSchema, "utf-8");
  });

  afterEach(() => {
    fs.rmSync(tmpdir, { recursive: true, force: true });
  });

  it("generates DBML with 3 tables and 2 foreign keys", async () => {
    const schemaPath = path.join(tmpdir, "schema.ts");
    const outputPath = path.join(tmpdir, "auth.dbml");
    const result = await runCli([schemaPath, "-o", outputPath]);

    expect(result.stdout).toBe(`💧 Generated DBML at: ${outputPath}`);

    const content = fs.readFileSync(outputPath, "utf-8");

    // All 3 tables
    expect(content.includes("Table User {")).toBe(true);
    expect(content.includes("Table Account {")).toBe(true);
    expect(content.includes("Table TwoFactorConfirmation {")).toBe(true);

    // User columns with notes
    expect(content.includes("id text [pk, note: 'Unique user ID']")).toBe(true);
    expect(content.includes("name text [note: 'Display name']")).toBe(true);
    expect(content.includes("email text [note: 'Email address']")).toBe(true);
    expect(content.includes("role text [note: 'Role of the user (ADMIN or USER)']")).toBe(true);
    expect(content.includes("isTwoFactorEnabled integer [note: 'Whether 2FA is enabled']")).toBe(
      true,
    );

    // Account columns
    expect(content.includes("userId text [note: 'Reference to the user ID']")).toBe(true);

    // Foreign key refs
    expect(content.includes("Ref Account_userId_User_id_fk: Account.userId > User.id")).toBe(true);
    expect(
      content.includes(
        "Ref TwoFactorConfirmation_userId_User_id_fk: TwoFactorConfirmation.userId > User.id",
      ),
    ).toBe(true);

    // Exact counts
    const refLines = content.split("\n").filter((line) => line.startsWith("Ref "));
    expect(refLines.length).toBe(2);

    const tableLines = content.split("\n").filter((line) => line.startsWith("Table "));
    expect(tableLines.length).toBe(3);
  });
});

// ============================================================================
// CLI binary: Mermaid ER generation
// ============================================================================

describe("CLI binary: Mermaid ER generation", () => {
  let tmpdir: string;

  beforeEach(() => {
    tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "sizuku-cli-mermaid-"));
  });

  afterEach(() => {
    fs.rmSync(tmpdir, { recursive: true, force: true });
  });

  it("generates Mermaid ER from EC schema with correct structure", async () => {
    const schemaPath = path.join(tmpdir, "schema.ts");
    const outputPath = path.join(tmpdir, "output", "ER.md");
    fs.writeFileSync(schemaPath, mysqlEcSchema, "utf-8");

    const result = await runCli([schemaPath, "-o", outputPath]);

    expect(result.stdout).toBe(`💧 Generated Mermaid ER at: ${outputPath}`);

    const content = fs.readFileSync(outputPath, "utf-8");

    expect(content.startsWith("```mermaid\nerDiagram")).toBe(true);
    expect(content.endsWith("```")).toBe(true);
    expect(content.includes('customer ||--}| purchase : "(id) - (customerId)"')).toBe(true);
    expect(content.includes("    customer {")).toBe(true);
    expect(content.includes("    purchase {")).toBe(true);
    expect(content.includes("        varchar id PK")).toBe(true);
    expect(content.includes("        varchar customerId FK")).toBe(true);
  });

  it("generates Mermaid ER from auth schema with relations and descriptions", async () => {
    const schemaPath = path.join(tmpdir, "schema.ts");
    const outputPath = path.join(tmpdir, "ER.md");
    fs.writeFileSync(schemaPath, authSchema, "utf-8");

    const result = await runCli([schemaPath, "-o", outputPath]);

    expect(result.stdout).toBe(`💧 Generated Mermaid ER at: ${outputPath}`);

    const content = fs.readFileSync(outputPath, "utf-8");

    expect(content.startsWith("```mermaid\nerDiagram")).toBe(true);
    expect(content.endsWith("```")).toBe(true);
    expect(content.includes('User ||--}| Account : "(id) - (userId)"')).toBe(true);
    expect(content.includes('User ||--}| TwoFactorConfirmation : "(id) - (userId)"')).toBe(true);
    expect(content.includes("    User {")).toBe(true);
    expect(content.includes("    Account {")).toBe(true);
    expect(content.includes('        text id PK "Unique user ID"')).toBe(true);
    expect(content.includes('        text name "Display name"')).toBe(true);
    expect(content.includes('        text role "Role of the user (ADMIN or USER)"')).toBe(true);

    const relationLines = content.split("\n").filter((line) => line.includes("||--}|"));
    expect(relationLines.length).toBe(2);
  });
});

// ============================================================================
// CLI binary: PNG generation
// ============================================================================

describe("CLI binary: PNG generation", () => {
  let tmpdir: string;

  beforeEach(() => {
    tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "sizuku-cli-png-"));
  });

  afterEach(() => {
    fs.rmSync(tmpdir, { recursive: true, force: true });
  });

  it("generates valid PNG from EC schema with PNG magic bytes", async () => {
    const schemaPath = path.join(tmpdir, "schema.ts");
    const outputPath = path.join(tmpdir, "output", "er.png");
    fs.writeFileSync(schemaPath, mysqlEcSchema, "utf-8");

    const result = await runCli([schemaPath, "-o", outputPath]);

    expect(result.stdout).toBe(`💧 Generated PNG at: ${outputPath}`);
    expect(result.stderr).toBe("");
    expect(fs.existsSync(outputPath)).toBe(true);

    const buffer = fs.readFileSync(outputPath);
    expect(buffer[0]).toBe(0x89);
    expect(buffer[1]).toBe(0x50);
    expect(buffer[2]).toBe(0x4e);
    expect(buffer[3]).toBe(0x47);
    expect(buffer[4]).toBe(0x0d);
    expect(buffer[5]).toBe(0x0a);
    expect(buffer[6]).toBe(0x1a);
    expect(buffer[7]).toBe(0x0a);
    expect(buffer.length > 1000).toBe(true);
  });

  it("generates valid PNG from auth schema (3 tables)", async () => {
    const schemaPath = path.join(tmpdir, "schema.ts");
    const outputPath = path.join(tmpdir, "auth-er.png");
    fs.writeFileSync(schemaPath, authSchema, "utf-8");

    const result = await runCli([schemaPath, "-o", outputPath]);

    expect(result.stdout).toBe(`💧 Generated PNG at: ${outputPath}`);

    const buffer = fs.readFileSync(outputPath);
    expect(buffer[0]).toBe(0x89);
    expect(buffer[1]).toBe(0x50);
    expect(buffer[2]).toBe(0x4e);
    expect(buffer[3]).toBe(0x47);
    expect(buffer.length > 3000).toBe(true);
  });
});

// ============================================================================
// CLI binary: stdout/stderr separation
// ============================================================================

describe("CLI binary: stdout/stderr separation", () => {
  let tmpdir: string;

  beforeEach(() => {
    tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "sizuku-cli-io-"));
  });

  afterEach(() => {
    fs.rmSync(tmpdir, { recursive: true, force: true });
  });

  it("success: stdout has message, stderr is empty", async () => {
    const schemaPath = path.join(tmpdir, "schema.ts");
    const outputPath = path.join(tmpdir, "out.dbml");
    fs.writeFileSync(schemaPath, mysqlEcSchema, "utf-8");

    const result = await runCli([schemaPath, "-o", outputPath]);

    expect(result.stdout).toBe(`💧 Generated DBML at: ${outputPath}`);
    expect(result.stderr).toBe("");
  });

  it("error: stderr has message, stdout is empty", async () => {
    const result = await runCli(["/tmp/nonexistent.ts", "-o", "/tmp/out.dbml"]);

    expect(result.stdout).toBe("");
    expect(result.stderr).toBe(
      "Failed to read input: ENOENT: no such file or directory, open '/tmp/nonexistent.ts'",
    );
  });

  it("validation error: stderr has message, stdout is empty", async () => {
    const result = await runCli(["schema.ts", "-o", "output.csv"]);

    expect(result.stdout).toBe("");
    expect(result.stderr).toBe(
      "Unsupported output format: output.csv. Supported: .dbml, .png, .md, .ts",
    );
  });
});

// ============================================================================
// CLI binary: validation schema generation (--zod, --valibot, etc.)
// ============================================================================

describe("CLI binary: validation schema generation", () => {
  let tmpdir: string;

  beforeEach(() => {
    tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "sizuku-cli-schema-"));
    fs.writeFileSync(path.join(tmpdir, "schema.ts"), mysqlEcSchema, "utf-8");
  });

  afterEach(() => {
    fs.rmSync(tmpdir, { recursive: true, force: true });
  });

  it("generates Zod schema with --zod", async () => {
    const schemaPath = path.join(tmpdir, "schema.ts");
    const outputPath = path.join(tmpdir, "out", "zod.ts");

    const result = await runCli([schemaPath, "-o", outputPath, "--zod"]);

    expect(result.stdout).toBe(`💧 Generated Zod schema at: ${outputPath}`);
    expect(result.stderr).toBe("");
    expect(fs.existsSync(outputPath)).toBe(true);

    const content = fs.readFileSync(outputPath, "utf-8");
    expect(content.includes("import")).toBe(true);
    expect(content.includes("CustomerSchema")).toBe(true);
    expect(content.includes("PurchaseSchema")).toBe(true);
    expect(content.includes("export type Customer")).toBe(true);
    expect(content.includes("export type Purchase")).toBe(true);
  });

  it("generates Valibot schema with --valibot", async () => {
    const schemaPath = path.join(tmpdir, "schema.ts");
    const outputPath = path.join(tmpdir, "out", "valibot.ts");

    const result = await runCli([schemaPath, "-o", outputPath, "--valibot"]);

    expect(result.stdout).toBe(`💧 Generated Valibot schema at: ${outputPath}`);
    expect(fs.existsSync(outputPath)).toBe(true);

    const content = fs.readFileSync(outputPath, "utf-8");
    expect(content.includes("CustomerSchema")).toBe(true);
    expect(content.includes("PurchaseSchema")).toBe(true);
  });

  it("generates ArkType schema with --arktype", async () => {
    const schemaPath = path.join(tmpdir, "schema.ts");
    const outputPath = path.join(tmpdir, "out", "arktype.ts");

    const result = await runCli([schemaPath, "-o", outputPath, "--arktype"]);

    expect(result.stdout).toBe(`💧 Generated ArkType schema at: ${outputPath}`);
    expect(fs.existsSync(outputPath)).toBe(true);

    const content = fs.readFileSync(outputPath, "utf-8");
    expect(content.includes("CustomerSchema")).toBe(true);
  });

  it("generates Effect schema with --effect", async () => {
    const schemaPath = path.join(tmpdir, "schema.ts");
    const outputPath = path.join(tmpdir, "out", "effect.ts");

    const result = await runCli([schemaPath, "-o", outputPath, "--effect"]);

    expect(result.stdout).toBe(`💧 Generated Effect schema at: ${outputPath}`);
    expect(fs.existsSync(outputPath)).toBe(true);

    const content = fs.readFileSync(outputPath, "utf-8");
    expect(content.includes("CustomerSchema")).toBe(true);
  });

  it("generates Zod schema without types using --no-export-types", async () => {
    const schemaPath = path.join(tmpdir, "schema.ts");
    const outputPath = path.join(tmpdir, "out", "zod-no-types.ts");

    const result = await runCli([schemaPath, "-o", outputPath, "--zod", "--no-export-types"]);

    expect(result.stdout).toBe(`💧 Generated Zod schema at: ${outputPath}`);

    const content = fs.readFileSync(outputPath, "utf-8");
    expect(content.includes("CustomerSchema")).toBe(true);
    expect(content.includes("export type Customer")).toBe(false);
  });

  it("generates Zod schema without comments using --no-with-comment", async () => {
    const schemaPath = path.join(tmpdir, "schema.ts");
    const outputPath = path.join(tmpdir, "out", "zod-no-comment.ts");

    const result = await runCli([schemaPath, "-o", outputPath, "--zod", "--no-with-comment"]);

    expect(result.stdout).toBe(`💧 Generated Zod schema at: ${outputPath}`);
    expect(fs.existsSync(outputPath)).toBe(true);
  });

  it("generates Zod schema without relations using --no-with-relation", async () => {
    const schemaPath = path.join(tmpdir, "schema.ts");
    const outputPath = path.join(tmpdir, "out", "zod-no-rel.ts");

    const result = await runCli([schemaPath, "-o", outputPath, "--zod", "--no-with-relation"]);

    expect(result.stdout).toBe(`💧 Generated Zod schema at: ${outputPath}`);

    const content = fs.readFileSync(outputPath, "utf-8");
    expect(content.includes("CustomerSchema")).toBe(true);
    expect(content.includes("RelationsSchema")).toBe(false);
  });

  it("returns error for .ts output without schema flag", async () => {
    const schemaPath = path.join(tmpdir, "schema.ts");
    const outputPath = path.join(tmpdir, "out", "output.ts");

    const result = await runCli([schemaPath, "-o", outputPath]);

    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("Specify --zod, --valibot, --arktype, or --effect for .ts output");
  });

  it("generates distinct output per library (zod vs valibot vs arktype vs effect)", async () => {
    const schemaPath = path.join(tmpdir, "schema.ts");
    const zodOut = path.join(tmpdir, "out", "zod.ts");
    const valibotOut = path.join(tmpdir, "out", "valibot.ts");
    const arktypeOut = path.join(tmpdir, "out", "arktype.ts");
    const effectOut = path.join(tmpdir, "out", "effect.ts");

    await runCli([schemaPath, "-o", zodOut, "--zod"]);
    await runCli([schemaPath, "-o", valibotOut, "--valibot"]);
    await runCli([schemaPath, "-o", arktypeOut, "--arktype"]);
    await runCli([schemaPath, "-o", effectOut, "--effect"]);

    const zodContent = fs.readFileSync(zodOut, "utf-8");
    const valibotContent = fs.readFileSync(valibotOut, "utf-8");
    const arktypeContent = fs.readFileSync(arktypeOut, "utf-8");
    const effectContent = fs.readFileSync(effectOut, "utf-8");

    // All files exist and are non-empty
    expect(zodContent.length > 0).toBe(true);
    expect(valibotContent.length > 0).toBe(true);
    expect(arktypeContent.length > 0).toBe(true);
    expect(effectContent.length > 0).toBe(true);

    // Each library has distinct imports
    expect(zodContent.includes("from 'zod'")).toBe(true);
    expect(valibotContent.includes("from 'valibot'")).toBe(true);
    expect(arktypeContent.includes("from 'arktype'")).toBe(true);
    expect(effectContent.includes("from 'effect'")).toBe(true);

    // No cross-contamination
    expect(zodContent.includes("from 'valibot'")).toBe(false);
    expect(zodContent.includes("from 'arktype'")).toBe(false);
    expect(zodContent.includes("from 'effect'")).toBe(false);
    expect(valibotContent.includes("from 'zod'")).toBe(false);
    expect(arktypeContent.includes("from 'zod'")).toBe(false);
    expect(effectContent.includes("from 'zod'")).toBe(false);

    // All produce CustomerSchema
    expect(zodContent.includes("CustomerSchema")).toBe(true);
    expect(valibotContent.includes("CustomerSchema")).toBe(true);
    expect(arktypeContent.includes("CustomerSchema")).toBe(true);
    expect(effectContent.includes("CustomerSchema")).toBe(true);

    // All files are different from each other
    expect(zodContent).not.toBe(valibotContent);
    expect(zodContent).not.toBe(arktypeContent);
    expect(zodContent).not.toBe(effectContent);
    expect(valibotContent).not.toBe(arktypeContent);
    expect(valibotContent).not.toBe(effectContent);
    expect(arktypeContent).not.toBe(effectContent);
  });

  it("--no-export-types produces different output than default", async () => {
    const schemaPath = path.join(tmpdir, "schema.ts");
    const withTypes = path.join(tmpdir, "out", "with-types.ts");
    const noTypes = path.join(tmpdir, "out", "no-types.ts");

    await runCli([schemaPath, "-o", withTypes, "--zod"]);
    await runCli([schemaPath, "-o", noTypes, "--zod", "--no-export-types"]);

    const withContent = fs.readFileSync(withTypes, "utf-8");
    const noContent = fs.readFileSync(noTypes, "utf-8");

    expect(withContent.includes("export type Customer")).toBe(true);
    expect(noContent.includes("export type Customer")).toBe(false);
    expect(withContent).not.toBe(noContent);
  });

  it("--no-with-relation produces different output than default for schema with relations()", async () => {
    const schemaWithRelations = `import { mysqlTable, varchar } from 'drizzle-orm/mysql-core'
import { relations } from 'drizzle-orm'

export const user = mysqlTable('user', {
  /// @z.string().uuid()
  id: varchar('id', { length: 36 }).primaryKey(),
  /// @z.string()
  name: varchar('name', { length: 50 }).notNull(),
})

export const post = mysqlTable('post', {
  /// @z.string().uuid()
  id: varchar('id', { length: 36 }).primaryKey(),
  /// @z.string().uuid()
  userId: varchar('user_id', { length: 36 }).notNull().references(() => user.id),
})

export const userRelations = relations(user, ({ many }) => ({
  posts: many(post),
}))

export const postRelations = relations(post, ({ one }) => ({
  user: one(user, {
    fields: [post.userId],
    references: [user.id],
  }),
}))`;
    const relSchemaPath = path.join(tmpdir, "schema-rel.ts");
    fs.writeFileSync(relSchemaPath, schemaWithRelations, "utf-8");

    const withRel = path.join(tmpdir, "out", "with-rel.ts");
    const noRel = path.join(tmpdir, "out", "no-rel.ts");

    await runCli([relSchemaPath, "-o", withRel, "--zod"]);
    await runCli([relSchemaPath, "-o", noRel, "--zod", "--no-with-relation"]);

    const withContent = fs.readFileSync(withRel, "utf-8");
    const noContent = fs.readFileSync(noRel, "utf-8");

    expect(withContent.includes("RelationsSchema")).toBe(true);
    expect(noContent.includes("RelationsSchema")).toBe(false);
    expect(withContent).not.toBe(noContent);
  });
});
