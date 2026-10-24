import fs from "node:fs";
import module from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Effect } from "effect";
import type ts from "typescript";
import * as QueryDomain from "../domain/query.js";
import type { Dialect } from "../domain/sql.js";
import { QueryError } from "../errors/index.js";
import type { Driver } from "./database.js";

/** How long a query may run before the studio stops waiting for it. */
const QUERY_TIMEOUT_MS = 30_000;

const hooks: { typescript: typeof ts | null; registered: boolean } = {
  typescript: null,
  registered: false,
};

function isProjectTypeScript(url: string) {
  return (
    url.startsWith("file:") &&
    /\.(c|m)?tsx?$/u.test(new URL(url).pathname) &&
    !url.includes("/node_modules/")
  );
}

function transpile(source: string, fileName: string) {
  const typescript = hooks.typescript;
  if (typescript === null) return source;
  return typescript.transpileModule(source, {
    fileName,
    compilerOptions: {
      module: typescript.ModuleKind.ESNext,
      target: typescript.ScriptTarget.ES2022,
      // Imports used only as types are dropped, as a bundler would.
      verbatimModuleSyntax: false,
    },
  }).outputText;
}

/** The `.ts` file a relative import that Node could not find means, if there is one. */
function findTypeScript(specifier: string, parent: string) {
  const candidates = [
    `${specifier}.ts`,
    `${specifier}/index.ts`,
    specifier.replace(/\.(c|m)?js$/u, ".$1ts"),
  ];
  for (const candidate of candidates) {
    const url = new URL(candidate, parent);
    if (fs.existsSync(fileURLToPath(url))) return url.href;
  }
  return null;
}

/**
 * Lets Node load the project's TypeScript as a bundler would: `.ts` files are transpiled with
 * the project's own TypeScript, and an import without an extension (or with `.js` for a `.ts`
 * file) finds the `.ts`. A file imported by a versioned schema URL carries the version on, so a
 * saved change to any file of the schema is picked up by the next query.
 */
function registerHooks(typescript: typeof ts) {
  hooks.typescript = typescript;
  if (hooks.registered) return;
  hooks.registered = true;
  module.registerHooks({
    resolve(specifier, context, nextResolve) {
      const parent = context.parentURL ?? "";
      const relative = specifier.startsWith("./") || specifier.startsWith("../");
      const resolved = (() => {
        try {
          return nextResolve(specifier, context);
        } catch (error) {
          const found =
            relative && isProjectTypeScript(parent) ? findTypeScript(specifier, parent) : null;
          if (found === null) throw error;
          return { url: found, shortCircuit: true };
        }
      })();
      const version = parent.startsWith("file:")
        ? new URL(parent).searchParams.get("sizuku")
        : null;
      if (version !== null && isProjectTypeScript(resolved.url)) {
        const url = new URL(resolved.url);
        url.searchParams.set("sizuku", version);
        return { ...resolved, url: url.href, shortCircuit: true };
      }
      return resolved;
    },
    load(url, context, nextLoad) {
      if (!isProjectTypeScript(url)) return nextLoad(url, context);
      const file = fileURLToPath(url);
      return {
        format: "module",
        source: transpile(fs.readFileSync(file, "utf-8"), file),
        shortCircuit: true,
      };
    },
  });
}

/**
 * Where a query module is written to be imported: the nearest `node_modules/.cache` above the
 * schema, so its imports of drizzle-orm resolve to the project's and file watchers leave it be.
 */
function queryDir(schemaPath: string) {
  const start = path.dirname(path.resolve(schemaPath));
  let dir = start;
  while (true) {
    const modules = path.join(dir, "node_modules");
    if (fs.existsSync(modules)) return path.join(modules, ".cache", "sizuku");
    const parent = path.dirname(dir);
    if (parent === dir) return path.join(start, ".sizuku");
    dir = parent;
  }
}

/**
 * What a query threw, with the causes it wraps: Drizzle reports a rejected statement as
 * `Failed query: ...` and keeps the database's own words in `cause`.
 */
function errorMessage(thrown: unknown): string {
  if (!(thrown instanceof Error)) return String(thrown);
  const cause = thrown.cause === undefined ? null : errorMessage(thrown.cause);
  return cause === null || thrown.message.includes(cause)
    ? thrown.message
    : `${thrown.message}\n${cause}`;
}

type Executed = {
  readonly sql: string;
  readonly params: readonly unknown[];
  readonly rowCount: number;
  readonly durationMs: number;
};

/**
 * The callback Drizzle's proxy driver for the dialect calls with each statement, answered from
 * the studio's connection in the shape that driver expects. Every statement is logged.
 */
function makeCallback(driver: Driver, executed: Executed[]) {
  return async (sql: string, params: unknown[], method: string) => {
    const started = performance.now();
    const result = await Effect.runPromise(
      driver
        .queryArrays({
          sql,
          params: params.map((param) =>
            driver.dialect === "sqlite" && typeof param === "boolean" ? (param ? 1 : 0) : param,
          ),
        })
        .pipe(Effect.mapError((error) => new Error(error.cause))),
    );
    executed.push({
      sql,
      params: params.map((param) => QueryDomain.makeJsonValue(param)),
      rowCount: result.rowCount,
      durationMs: Math.round((performance.now() - started) * 100) / 100,
    });
    if (driver.dialect === "sqlite") {
      if (method === "get") return { rows: result.rows[0] };
      return { rows: method === "run" ? [] : result.rows };
    }
    if (method !== "execute") return { rows: result.rows };
    if (driver.dialect === "mysql") {
      return { rows: [{ affectedRows: result.rowCount, insertId: result.insertId ?? 0 }] };
    }
    return {
      rows: result.rows.map((row) =>
        Object.fromEntries(result.columns.map((column, i) => [column, row[i]])),
      ),
    };
  };
}

/**
 * Runs a query against the database through Drizzle: the code is the body of an async function
 * with `db` (Drizzle over the studio's connection, with the schema), the schema's exports and
 * drizzle-orm's operators in scope; its last expression is its result. What the database was
 * asked is returned with it, also when the query throws.
 */
export function runQuery(input: {
  readonly code: string;
  readonly schemaPath: string;
  readonly names: readonly string[];
  readonly driver: Driver;
  readonly dialect: Dialect;
  readonly typescript: typeof ts;
}) {
  return Effect.gen(function* () {
    const { body, error } = QueryDomain.makeQueryBody({ code: input.code });
    if (error !== null) return yield* new QueryError(error);
    registerHooks(input.typescript);
    const schemaUrl = pathToFileURL(path.resolve(input.schemaPath));
    schemaUrl.searchParams.set("sizuku", String(fs.statSync(input.schemaPath).mtimeMs));
    const source = transpile(
      QueryDomain.makeRuntimeModule({
        dialect: input.dialect,
        schemaUrl: schemaUrl.href,
        names: input.names,
        body,
      }),
      "query.ts",
    );
    const dir = queryDir(input.schemaPath);
    const file = path.join(dir, `query-${crypto.randomUUID()}.mjs`);
    const executed: Executed[] = [];
    const started = performance.now();
    const outcome = yield* Effect.promise(async () => {
      try {
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(file, source);
        const loaded = (await import(/* @vite-ignore */ pathToFileURL(file).href)) as {
          readonly default: (callback: unknown) => Promise<unknown>;
        };
        const timeout = new Promise<never>((_, reject) => {
          setTimeout(
            () =>
              reject(new Error(`The query did not finish in ${QUERY_TIMEOUT_MS / 1000} seconds.`)),
            QUERY_TIMEOUT_MS,
          ).unref();
        });
        const value = await Promise.race([
          loaded.default(makeCallback(input.driver, executed)),
          timeout,
        ]);
        return { result: QueryDomain.makeJsonValue(value), error: null };
      } catch (thrown) {
        return { result: null, error: errorMessage(thrown) };
      } finally {
        fs.rmSync(file, { force: true });
      }
    });
    return {
      ...outcome,
      statements: executed,
      durationMs: Math.round((performance.now() - started) * 100) / 100,
    };
  });
}
