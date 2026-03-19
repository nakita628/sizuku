import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sizuku as main } from "./cli/index.js";

// Test run
// pnpm vitest run ./src/index.test.ts

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
