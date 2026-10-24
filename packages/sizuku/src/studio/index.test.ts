import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { renderSource, studioHandler } from "./index.js";

const schema = `import { sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
})
`;

describe("renderSource", () => {
  it("draws the schema as an SVG", () => {
    const result = renderSource(schema, "light");
    expect(result.ok && result.value.startsWith("<svg")).toBe(true);
  });

  it("reports a syntax error with its line", () => {
    const result = renderSource(
      "export const user = sqliteTable('user', {\n  id: text('id')..\n})",
      "light",
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/\(line 2\)$/);
  });
});

describe("studioHandler", () => {
  let dir: string;
  let file: string;
  let server: http.Server;
  let base: string;

  beforeEach(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "sizuku-studio-"));
    file = path.join(dir, "schema.ts");
    fs.writeFileSync(file, schema);
    server = http.createServer((req, res) => void studioHandler(file)(req, res));
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterEach(async () => {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("serves the editor page", async () => {
    const res = await fetch(`${base}/`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("sizuku studio");
  });

  it("reads the schema file", async () => {
    const body = await (await fetch(`${base}/api/schema`)).json();
    expect(body).toStrictEqual({ file: "schema.ts", source: schema });
  });

  it("writes the schema file", async () => {
    const next = schema.replace("id: text('id')", "uuid: text('uuid')");
    const res = await fetch(`${base}/api/schema`, {
      method: "PUT",
      body: JSON.stringify({ source: next }),
    });
    expect(res.status).toBe(200);
    expect(fs.readFileSync(file, "utf-8")).toBe(next);
  });

  it("renders what the editor holds, unsaved", async () => {
    const body = await (
      await fetch(`${base}/api/render`, {
        method: "POST",
        body: JSON.stringify({ source: schema, theme: "dark" }),
      })
    ).json();
    expect(body.svg).toContain("#0f1117");
    expect(fs.readFileSync(file, "utf-8")).toBe(schema);
  });

  it("exports a PNG", async () => {
    const res = await fetch(`${base}/api/png`, {
      method: "POST",
      body: JSON.stringify({ source: schema }),
    });
    expect(res.headers.get("content-type")).toBe("image/png");
    expect([...new Uint8Array(await res.arrayBuffer()).subarray(0, 4)]).toStrictEqual([
      0x89, 0x50, 0x4e, 0x47,
    ]);
  });

  it("rejects a body without source", async () => {
    const res = await fetch(`${base}/api/schema`, { method: "PUT", body: "{}" });
    expect(res.status).toBe(400);
  });
});
