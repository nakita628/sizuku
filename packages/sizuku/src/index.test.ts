import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sizuku as main } from "./cli/index.js";

// Test run
// pnpm vitest run ./src/index.test.ts

// ============================================================================
// CLI binary path
// ============================================================================

const CLI_PATH = path.resolve(__dirname, "../dist/index.mjs");
const AUTH_SCHEMA_PATH = path.resolve(__dirname, "../../../fixtures/auth/db/schema.ts");

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
// Fixtures
// ============================================================================

const mysqlEcSchema = `import { mysqlTable, varchar, int, decimal, timestamp } from 'drizzle-orm/mysql-core'
import { relations } from 'drizzle-orm'

export const customer = mysqlTable('customer', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
})

export const purchase = mysqlTable('purchase', {
  id: int('id').primaryKey().autoincrement(),
  customerId: varchar('customer_id', { length: 36 }).notNull().references(() => customer.id),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  purchasedAt: timestamp('purchased_at').notNull(),
})`;

// ============================================================================
// Config mode (sizuku.config.ts)
// ============================================================================

describe("main", () => {
  const origCwd = process.cwd();
  let tmpdir: string;

  beforeEach(() => {
    vi.resetModules();
    tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "sizuku-main-"));
    process.chdir(tmpdir);

    // Create test schema file
    const schemaDir = path.join(tmpdir, "db");
    fs.mkdirSync(schemaDir, { recursive: true });
    const schemaFile = path.join(schemaDir, "schema.ts");
    const schemaContent = `import { mysqlTable, varchar } from 'drizzle-orm/mysql-core'

export const user = mysqlTable('user', {
  /// Primary key
  /// @z.uuid()
  /// @v.pipe(v.string(), v.uuid())
  id: varchar('id', { length: 36 }).primaryKey(),
  /// Display name
  /// @z.string().min(1).max(50)
  /// @v.pipe(v.string(), v.minLength(1), v.maxLength(50))
  name: varchar('name', { length: 50 }).notNull(),
})`;
    fs.writeFileSync(schemaFile, schemaContent, "utf-8");
  });

  afterEach(() => {
    process.chdir(origCwd);
    fs.rmSync(tmpdir, { recursive: true, force: true });
  });

  it("main success", async () => {
    // Create config file
    const configFile = path.join(tmpdir, "sizuku.config.ts");
    const configContent = `export default {
  input: 'db/schema.ts',
  zod: {
    output: 'zod/index.ts',
    comment: true,
    type: true,
    relation: true,
  },
  valibot: {
    output: 'valibot/index.ts',
    comment: true,
    type: true,
    relation: true,
  },
  mermaid: {
    output: 'mermaid-er/ER.md',
  },
}`;
    fs.writeFileSync(configFile, configContent, "utf-8");

    // Verify files exist
    expect(fs.existsSync(configFile)).toBe(true);
    expect(fs.existsSync(path.join(tmpdir, "db/schema.ts"))).toBe(true);
    expect(process.cwd()).toBe(tmpdir);

    const result = await main();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(
        [
          "💧 Generated Zod schema at: zod/index.ts",
          "💧 Generated Valibot schema at: valibot/index.ts",
          "💧 Generated Mermaid ER at: mermaid-er/ER.md",
        ].join("\n"),
      );
    }
  });

  it("main error", async () => {
    // No config file, should fail
    const result = await main();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(`❌ Config not found: ${path.join(tmpdir, "sizuku.config.ts")}`);
    }
  });
});

// ============================================================================
// CLI binary: error handling
// ============================================================================

describe("CLI binary: error handling", () => {
  it("outputs error when no arguments provided (--help equivalent)", async () => {
    const result = await runCli(["--help"]);
    expect(result.stderr).toBe("Missing input file path");
  });

  it("outputs error when input starts with dash", async () => {
    const result = await runCli(["-o", "output.dbml"]);
    expect(result.stderr).toBe("Missing input file path");
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
    expect(result.stderr).toBe("Unsupported output format: output.txt. Supported: .dbml, .png, .md");
  });

  it("outputs error for unsupported output format .json", async () => {
    const result = await runCli(["schema.ts", "-o", "output.json"]);
    expect(result.stderr).toBe(
      "Unsupported output format: output.json. Supported: .dbml, .png, .md",
    );
  });

  it("outputs error for unsupported output format .svg", async () => {
    const result = await runCli(["schema.ts", "-o", "diagram.svg"]);
    expect(result.stderr).toBe(
      "Unsupported output format: diagram.svg. Supported: .dbml, .png, .md",
    );
  });

  it("outputs error when input file does not exist", async () => {
    const result = await runCli(["/tmp/nonexistent-file-12345.ts", "-o", "/tmp/out.dbml"]);
    expect(result.stderr.startsWith("Failed to read input:")).toBe(true);
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

    // Table blocks
    expect(content.includes("Table customer {")).toBe(true);
    expect(content.includes("Table purchase {")).toBe(true);

    // customer columns
    expect(content.includes("  id varchar [pk]")).toBe(true);
    expect(content.includes("  name varchar")).toBe(true);
    expect(content.includes("  email varchar")).toBe(true);

    // purchase columns
    expect(content.includes("  customerId varchar")).toBe(true);
    expect(content.includes("  amount decimal")).toBe(true);
    expect(content.includes("  purchasedAt timestamp")).toBe(true);

    // Foreign key ref
    expect(
      content.includes("Ref purchase_customerId_customer_id_fk: purchase.customerId > customer.id"),
    ).toBe(true);
  });

  it("creates output directory automatically when it does not exist", async () => {
    const schemaPath = path.join(tmpdir, "schema.ts");
    const outputPath = path.join(tmpdir, "deep", "nested", "dir", "schema.dbml");
    fs.writeFileSync(schemaPath, mysqlEcSchema, "utf-8");

    const result = await runCli([schemaPath, "-o", outputPath]);

    expect(result.stdout).toBe(`💧 Generated DBML at: ${outputPath}`);
    expect(fs.existsSync(outputPath)).toBe(true);
  });
});

// ============================================================================
// CLI binary: DBML with auth fixture (real-world schema)
// ============================================================================

describe("CLI binary: DBML with auth fixture", () => {
  let tmpdir: string;

  beforeEach(() => {
    tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "sizuku-cli-auth-"));
  });

  afterEach(() => {
    fs.rmSync(tmpdir, { recursive: true, force: true });
  });

  it("generates DBML from auth fixture with all 6 tables and 2 foreign keys", async () => {
    const outputPath = path.join(tmpdir, "auth.dbml");
    const result = await runCli([AUTH_SCHEMA_PATH, "-o", outputPath]);

    expect(result.stdout).toBe(`💧 Generated DBML at: ${outputPath}`);

    const content = fs.readFileSync(outputPath, "utf-8");

    // All 6 tables
    expect(content.includes("Table User {")).toBe(true);
    expect(content.includes("Table Account {")).toBe(true);
    expect(content.includes("Table VerificationToken {")).toBe(true);
    expect(content.includes("Table PasswordResetToken {")).toBe(true);
    expect(content.includes("Table TwoFactorToken {")).toBe(true);
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
    expect(
      content.includes("provider text [note: 'Name of the provider (e.g., google, github)']"),
    ).toBe(true);

    // Foreign key refs
    expect(content.includes("Ref Account_userId_User_id_fk: Account.userId > User.id")).toBe(true);
    expect(
      content.includes(
        "Ref TwoFactorConfirmation_userId_User_id_fk: TwoFactorConfirmation.userId > User.id",
      ),
    ).toBe(true);

    // Exact number of Ref lines (2)
    const refLines = content.split("\n").filter((line) => line.startsWith("Ref "));
    expect(refLines.length).toBe(2);

    // Exact number of Table blocks (6)
    const tableLines = content.split("\n").filter((line) => line.startsWith("Table "));
    expect(tableLines.length).toBe(6);
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

    // Mermaid block structure
    expect(content.startsWith("```mermaid\nerDiagram")).toBe(true);
    expect(content.endsWith("```")).toBe(true);

    // Relation line
    expect(content.includes('customer ||--}| purchase : "(id) - (customerId)"')).toBe(true);

    // Table definitions
    expect(content.includes("    customer {")).toBe(true);
    expect(content.includes("    purchase {")).toBe(true);

    // Field details with types and key markers
    expect(content.includes("        varchar id PK")).toBe(true);
    expect(content.includes("        varchar name")).toBe(true);
    expect(content.includes("        varchar email")).toBe(true);
    expect(content.includes("        varchar customerId FK")).toBe(true);
    expect(content.includes("        decimal amount")).toBe(true);
    expect(content.includes("        timestamp purchasedAt")).toBe(true);
  });

  it("generates Mermaid ER from auth fixture with correct relations and descriptions", async () => {
    const outputPath = path.join(tmpdir, "ER.md");
    const result = await runCli([AUTH_SCHEMA_PATH, "-o", outputPath]);

    expect(result.stdout).toBe(`💧 Generated Mermaid ER at: ${outputPath}`);

    const content = fs.readFileSync(outputPath, "utf-8");

    // Mermaid block
    expect(content.startsWith("```mermaid\nerDiagram")).toBe(true);
    expect(content.endsWith("```")).toBe(true);

    // Relations
    expect(content.includes('User ||--}| Account : "(id) - (userId)"')).toBe(true);
    expect(content.includes('User ||--}| TwoFactorConfirmation : "(id) - (userId)"')).toBe(true);

    // Tables
    expect(content.includes("    User {")).toBe(true);
    expect(content.includes("    Account {")).toBe(true);
    expect(content.includes("    VerificationToken {")).toBe(true);
    expect(content.includes("    TwoFactorConfirmation {")).toBe(true);

    // User fields with descriptions
    expect(content.includes('        text id PK "Unique user ID"')).toBe(true);
    expect(content.includes('        text name "Display name"')).toBe(true);
    expect(content.includes('        text email "Email address"')).toBe(true);
    expect(content.includes('        text role "Role of the user (ADMIN or USER)"')).toBe(true);
    expect(content.includes('        int isTwoFactorEnabled "Whether 2FA is enabled"')).toBe(true);

    // Account fields
    expect(content.includes('        text userId "Reference to the user ID"')).toBe(true);

    // Exact relation count (2)
    const relationLines = content.split("\n").filter((line) => line.includes("||--}|"));
    expect(relationLines.length).toBe(2);

    // Exact table block count (6)
    const tableOpenLines = content
      .split("\n")
      .filter((line) => line.trim().endsWith("{") && !line.includes("mermaid"));
    expect(tableOpenLines.length).toBe(6);
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

    // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
    expect(buffer[0]).toBe(0x89);
    expect(buffer[1]).toBe(0x50);
    expect(buffer[2]).toBe(0x4e);
    expect(buffer[3]).toBe(0x47);
    expect(buffer[4]).toBe(0x0d);
    expect(buffer[5]).toBe(0x0a);
    expect(buffer[6]).toBe(0x1a);
    expect(buffer[7]).toBe(0x0a);

    // PNG should be a reasonable size (at least 1KB for 2 tables)
    expect(buffer.length > 1000).toBe(true);
  });

  it("generates valid PNG from auth fixture (6 tables)", async () => {
    const outputPath = path.join(tmpdir, "auth-er.png");

    const result = await runCli([AUTH_SCHEMA_PATH, "-o", outputPath]);

    expect(result.stdout).toBe(`💧 Generated PNG at: ${outputPath}`);

    const buffer = fs.readFileSync(outputPath);
    // PNG magic bytes
    expect(buffer[0]).toBe(0x89);
    expect(buffer[1]).toBe(0x50);
    expect(buffer[2]).toBe(0x4e);
    expect(buffer[3]).toBe(0x47);

    // 6 tables should produce a larger PNG
    expect(buffer.length > 5000).toBe(true);
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
    expect(result.stderr.length > 0).toBe(true);
  });

  it("validation error: stderr has message, stdout is empty", async () => {
    const result = await runCli(["schema.ts", "-o", "output.csv"]);

    expect(result.stdout).toBe("");
    expect(result.stderr).toBe(
      "Unsupported output format: output.csv. Supported: .dbml, .png, .md",
    );
  });
});
