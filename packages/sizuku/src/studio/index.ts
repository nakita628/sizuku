import path from "node:path";
import { fileURLToPath } from "node:url";
import { Console, Effect } from "effect";
import { DEFAULT_PORT } from "./server/constants/index.js";
import { startStudioServer } from "./server/start.js";

export { DEFAULT_PORT };

/** Where the built client sits: next to the bundle in dist/, or dist/studio when run from src/. */
function staticDir() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.basename(here) === "dist"
    ? path.join(here, "studio")
    : path.resolve(here, "../../dist/studio");
}

/** What the terminal says once the studio listens: the file, the address and the database. */
export function studioBanner(options: {
  readonly file: string;
  readonly url: string;
  readonly database: {
    readonly connected: boolean;
    readonly url: string | null;
    readonly error: string | null;
  };
}) {
  const db = options.database.connected
    ? `\n   Database: ${options.database.url}`
    : options.database.error !== null
      ? `\n   Database not connected: ${options.database.error}`
      : "";
  return `💧 sizuku studio is editing ${options.file} at ${options.url}${db}`;
}

/**
 * Serves the studio until the fiber is interrupted (Ctrl+C): the database connection and the
 * server are released then, as the scope closes.
 */
export function runStudio(options: {
  readonly file: string;
  readonly port: number;
  readonly url: string | null;
}) {
  return Effect.gen(function* () {
    const started = yield* startStudioServer({
      schemaPath: options.file,
      port: options.port,
      staticDir: staticDir(),
      databaseUrl: options.url,
      cwd: process.cwd(),
    });
    yield* Console.log(studioBanner({ file: options.file, ...started }));
    return yield* Effect.never;
  }).pipe(Effect.scoped);
}
