import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { parseSync } from "oxc-parser";
import { erPng, erSvg } from "../generator/index.js";
import { stripImports } from "../utils/index.js";
import { STUDIO_PAGE } from "./page.js";

// The largest schema the editor will send; anything bigger is not a schema.
const MAX_BODY = 5 * 1024 * 1024;

function isTheme(value: unknown): value is "light" | "dark" {
  return value === "light" || value === "dark";
}

// The schema drawn as the CLI would draw it, or the first syntax error that
// stopped it, with the line it is on.
export function renderSource(source: string, theme: "light" | "dark") {
  const { errors } = parseSync("schema.ts", source, { lang: "ts", sourceType: "module" });
  if (errors.length > 0) {
    const [first] = errors;
    const offset = first.labels[0]?.start ?? 0;
    const line = source.slice(0, offset).split("\n").length;
    return { ok: false, error: `${first.message} (line ${line})` } as const;
  }
  try {
    return { ok: true, value: erSvg(stripImports(source), theme) } as const;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) } as const;
  }
}

function readBody(req: http.IncomingMessage) {
  return new Promise<string | null>((resolve) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        resolve(null);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", () => resolve(null));
  });
}

function sendJson(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function parseJson(text: string | null) {
  if (text === null) return null;
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// The studio's HTTP handler: the page, the schema file it edits, and the
// drawing of whatever the editor currently holds.
export function studioHandler(file: string) {
  return async (req: http.IncomingMessage, res: http.ServerResponse) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const route = `${req.method} ${url.pathname}`;

    if (route === "GET /") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(STUDIO_PAGE);
      return;
    }
    if (route === "GET /api/schema") {
      try {
        sendJson(res, 200, { file: path.basename(file), source: fs.readFileSync(file, "utf-8") });
      } catch (e) {
        sendJson(res, 500, { error: e instanceof Error ? e.message : String(e) });
      }
      return;
    }
    if (route === "PUT /api/schema") {
      const body = parseJson(await readBody(req));
      if (typeof body?.source !== "string") {
        sendJson(res, 400, { error: "source must be a string" });
        return;
      }
      try {
        fs.writeFileSync(file, body.source, "utf-8");
        sendJson(res, 200, { ok: true });
      } catch (e) {
        sendJson(res, 500, { error: e instanceof Error ? e.message : String(e) });
      }
      return;
    }
    if (route === "POST /api/render") {
      const body = parseJson(await readBody(req));
      if (typeof body?.source !== "string") {
        sendJson(res, 400, { error: "source must be a string" });
        return;
      }
      const result = renderSource(body.source, isTheme(body.theme) ? body.theme : "light");
      sendJson(res, 200, result.ok ? { svg: result.value } : { error: result.error });
      return;
    }
    if (route === "POST /api/png") {
      const body = parseJson(await readBody(req));
      if (typeof body?.source !== "string") {
        sendJson(res, 400, { error: "source must be a string" });
        return;
      }
      try {
        const png = erPng(stripImports(body.source), isTheme(body.theme) ? body.theme : "light");
        res.writeHead(200, { "content-type": "image/png" });
        res.end(Buffer.from(png));
      } catch (e) {
        sendJson(res, 500, { error: e instanceof Error ? e.message : String(e) });
      }
      return;
    }
    if (route === "GET /api/events") {
      // Tells the page when the file changes on disk, so an edit made in
      // another editor shows up here.
      res.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
      });
      res.write(": connected\n\n");
      const listener = () => res.write("event: change\ndata: {}\n\n");
      fs.watchFile(file, { interval: 500 }, listener);
      req.on("close", () => fs.unwatchFile(file, listener));
      return;
    }
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not found");
  };
}

export function startStudio(file: string, port: number) {
  return new Promise<{ ok: true; value: string } | { ok: false; error: string }>((resolve) => {
    if (!fs.existsSync(file)) {
      resolve({ ok: false, error: `Failed to read input: ${file} does not exist` });
      return;
    }
    const server = http.createServer((req, res) => {
      studioHandler(file)(req, res).catch((e: unknown) => {
        sendJson(res, 500, { error: e instanceof Error ? e.message : String(e) });
      });
    });
    server.once("error", (e) =>
      resolve({ ok: false, error: `Failed to start studio: ${e.message}` }),
    );
    // Loopback only: the studio writes to the schema file.
    server.listen(port, "127.0.0.1", () => {
      resolve({
        ok: true,
        value: `💧 sizuku studio is editing ${file} at http://127.0.0.1:${port}`,
      });
    });
  });
}
