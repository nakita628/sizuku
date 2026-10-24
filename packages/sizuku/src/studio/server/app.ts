import fs from "node:fs/promises";
import path from "node:path";
import { serveStatic } from "@hono/node-server/serve-static";
import { OpenAPIHono } from "@hono/zod-openapi";
import { Effect } from "effect";
import { createMiddleware } from "hono/factory";
import { FORBIDDEN_HOST_MESSAGE } from "./constants/index.js";
import * as ProblemDomain from "./domain/problem.js";
import api from "./index.js";

function isLoopbackHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

// The API is unauthenticated, so a page on another origin must not reach it even when its DNS
// name resolves to this machine.
const loopbackOnly = createMiddleware((c, next) =>
  isLoopbackHostname(new URL(c.req.url).hostname)
    ? next()
    : Promise.resolve(c.text(FORBIDDEN_HOST_MESSAGE, 403)),
);

type Issue = { readonly path: readonly PropertyKey[]; readonly message: string };

function isIssues(value: unknown): value is readonly Issue[] {
  return (
    Array.isArray(value) &&
    value.every((v) => typeof v === "object" && v !== null && "message" in v)
  );
}

/**
 * The issues of @hono/zod-openapi's own 400 answer: `{ success: false, error }`, where the
 * error is a serialised ZodError that carries its issues as JSON inside `message`.
 */
function zodIssues(value: unknown) {
  if (
    typeof value !== "object" ||
    value === null ||
    !("success" in value) ||
    value.success !== false
  ) {
    return null;
  }
  const error = "error" in value ? value.error : null;
  if (typeof error !== "object" || error === null) return null;
  if ("issues" in error && isIssues(error.issues)) return error.issues;
  if (!("message" in error) || typeof error.message !== "string") return null;
  try {
    const parsed: unknown = JSON.parse(error.message);
    return isIssues(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// The generated routes validate with @hono/zod-openapi's own answer, a 400 with the zod error;
// main.tsp promises a 422 problem, so that answer is rewritten on its way out.
const validationProblems = createMiddleware(async (c, next) => {
  await next();
  if (c.res.status !== 400) return;
  const issues = zodIssues(
    await c.res
      .clone()
      .json()
      .catch(() => null),
  );
  if (issues === null) return;
  c.res = c.json(
    ProblemDomain.makeValidationProblem({
      instance: c.req.path,
      detail: "The request failed validation. See `errors` for the offending fields.",
      errors: issues.map((issue) => ({
        field: issue.path.map(String).join("."),
        message: issue.message,
      })),
    }),
    422,
    ProblemDomain.PROBLEM_HEADERS,
  );
});

/** The API under /api, with its OpenAPI document at /api/openapi.json. */
export function createStudioApi() {
  const app = new OpenAPIHono();
  app.use("/api/*", loopbackOnly);
  app.use("/api/*", validationProblems);
  app.onError((error, c) => {
    Effect.runSync(Effect.logError("unhandled error", error));
    return c.json(
      ProblemDomain.makeInternalServerProblem({ instance: c.req.path }),
      500,
      ProblemDomain.PROBLEM_HEADERS,
    );
  });
  return app.route("/", api).doc("/api/openapi.json", {
    openapi: "3.1.0",
    info: { title: "Sizuku Studio API", version: "1.0.0" },
  });
}

export function missingAssetsMessage(staticDir: string) {
  return `sizuku studio assets were not found in ${staticDir}.\nReinstall sizuku, or run "pnpm build" when working from the repository.`;
}

/** The API plus the built client; every other path gets index.html, since the client routes on the path. */
export function createStudioApp(staticDir: string) {
  const app = createStudioApi();
  app.use("/*", serveStatic({ root: path.relative(process.cwd(), staticDir) || "." }));
  app.get("/*", async (c) => {
    if (c.req.path.startsWith("/api/")) return c.notFound();
    try {
      return c.html(await fs.readFile(path.join(staticDir, "index.html"), "utf-8"));
    } catch {
      return c.text(missingAssetsMessage(staticDir), 500);
    }
  });
  return app;
}
