import { describe, expect, it } from "vite-plus/test";
import { fmt } from ".";

// Test run
// pnpm vitest run ./src/format/index.test.ts

describe("fmt", () => {
  it.concurrent("returns formatted code", async () => {
    const code = "const takibi = 'hono-takibi';";
    const result = await fmt(code);
    expect(result).toBe(`const takibi = 'hono-takibi'\n`);
  });

  it.concurrent("throws error for invalid code", async () => {
    await expect(fmt("const = ;")).rejects.toThrow();
  });
});
