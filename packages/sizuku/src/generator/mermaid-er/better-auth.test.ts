import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { stripImports } from "../../cli/index.js";
import { sizukuMermaidER } from "./index.js";

// Test run
// pnpm vitest run ./src/generator/mermaid-er/better-auth.test.ts

const FIXTURES_DIR = path.resolve("fixtures/better-auth");
const TMP_DIR = "tmp/better-auth-mermaid";

function readFixtureCode(pattern: string): string[] {
  const content = fs.readFileSync(path.join(FIXTURES_DIR, pattern, "db/schema.ts"), "utf-8");
  return stripImports(content);
}

function readFixtureExpected(pattern: string): string {
  return fs.readFileSync(path.join(FIXTURES_DIR, pattern, "mermaid-er/ER.md"), "utf-8");
}

describe("better-auth mermaid-er", () => {
  afterEach(() => {
    if (fs.existsSync(TMP_DIR)) {
      fs.rmSync(TMP_DIR, { recursive: true });
    }
  });

  it("core: user, session, account, verification", async () => {
    const code = readFixtureCode("core");
    const output = `${TMP_DIR}/core.md`;
    await sizukuMermaidER(code, output);
    const result = await fsp.readFile(output, "utf-8");
    const expected = readFixtureExpected("core");
    expect(result).toBe(expected);
  });

  it("two-factor: core + twoFactor table", async () => {
    const code = readFixtureCode("two-factor");
    const output = `${TMP_DIR}/two-factor.md`;
    await sizukuMermaidER(code, output);
    const result = await fsp.readFile(output, "utf-8");
    const expected = readFixtureExpected("two-factor");
    expect(result).toBe(expected);
  });

  it("admin: core + user(role, banned, banReason, banExpires), session(impersonatedBy)", async () => {
    const code = readFixtureCode("admin");
    const output = `${TMP_DIR}/admin.md`;
    await sizukuMermaidER(code, output);
    const result = await fsp.readFile(output, "utf-8");
    const expected = readFixtureExpected("admin");
    expect(result).toBe(expected);
  });

  it("organization: core + organization, member, invitation", async () => {
    const code = readFixtureCode("organization");
    const output = `${TMP_DIR}/organization.md`;
    await sizukuMermaidER(code, output);
    const result = await fsp.readFile(output, "utf-8");
    const expected = readFixtureExpected("organization");
    expect(result).toBe(expected);
  });

  it("jwt: core + jwks table", async () => {
    const code = readFixtureCode("jwt");
    const output = `${TMP_DIR}/jwt.md`;
    await sizukuMermaidER(code, output);
    const result = await fsp.readFile(output, "utf-8");
    const expected = readFixtureExpected("jwt");
    expect(result).toBe(expected);
  });

  it("anonymous: core + user(isAnonymous)", async () => {
    const code = readFixtureCode("anonymous");
    const output = `${TMP_DIR}/anonymous.md`;
    await sizukuMermaidER(code, output);
    const result = await fsp.readFile(output, "utf-8");
    const expected = readFixtureExpected("anonymous");
    expect(result).toBe(expected);
  });

  it("phone-number: core + user(phoneNumber, phoneNumberVerified)", async () => {
    const code = readFixtureCode("phone-number");
    const output = `${TMP_DIR}/phone-number.md`;
    await sizukuMermaidER(code, output);
    const result = await fsp.readFile(output, "utf-8");
    const expected = readFixtureExpected("phone-number");
    expect(result).toBe(expected);
  });

  it("username: core + user(username, displayUsername)", async () => {
    const code = readFixtureCode("username");
    const output = `${TMP_DIR}/username.md`;
    await sizukuMermaidER(code, output);
    const result = await fsp.readFile(output, "utf-8");
    const expected = readFixtureExpected("username");
    expect(result).toBe(expected);
  });

  it("device-authorization: core + deviceCode table", async () => {
    const code = readFixtureCode("device-authorization");
    const output = `${TMP_DIR}/device-authorization.md`;
    await sizukuMermaidER(code, output);
    const result = await fsp.readFile(output, "utf-8");
    const expected = readFixtureExpected("device-authorization");
    expect(result).toBe(expected);
  });

  it("full: all plugins combined", async () => {
    const code = readFixtureCode("full");
    const output = `${TMP_DIR}/full.md`;
    await sizukuMermaidER(code, output);
    const result = await fsp.readFile(output, "utf-8");
    const expected = readFixtureExpected("full");
    expect(result).toBe(expected);
  });
});
