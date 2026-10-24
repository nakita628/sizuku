import path from "node:path";
import { fileURLToPath } from "node:url";
import { Effect, Exit, Fiber } from "effect";
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

function describeFailure(error: { readonly _tag: string } & Record<string, unknown>) {
  if (error._tag === "ServerListenError") {
    return error.code === "EADDRINUSE"
      ? `Port ${String(error.port)} is in use. Pass --port to pick another.`
      : `Failed to start studio: ${String(error.message)}`;
  }
  if (error._tag === "FileReadError")
    return `Failed to read input: ${String(error.path)} ${String(error.cause)}`;
  return `Failed to start studio: ${error._tag}`;
}

/**
 * Starts the studio and resolves once it listens (or fails to). The server keeps running after
 * that, until Ctrl+C closes its scope: the database connection and the server are released then.
 */
export function startStudio(options: {
  readonly file: string;
  readonly port: number;
  readonly url: string | null;
}) {
  const ready = Promise.withResolvers<{ ok: true; value: string } | { ok: false; error: string }>();
  const program = Effect.scoped(
    startStudioServer({
      schemaPath: options.file,
      port: options.port,
      staticDir: staticDir(),
      databaseUrl: options.url,
      cwd: process.cwd(),
    }).pipe(
      Effect.tap(({ url, database }) =>
        Effect.sync(() => {
          const db = database.connected
            ? `\n   Database: ${database.url}`
            : database.error !== null
              ? `\n   Database not connected: ${database.error}`
              : "";
          ready.resolve({
            ok: true,
            value: `💧 sizuku studio is editing ${options.file} at ${url}${db}`,
          });
        }),
      ),
      Effect.andThen(Effect.never),
    ),
  );
  const fiber = Effect.runFork(program);
  fiber.addObserver((exit) => {
    if (Exit.isFailure(exit)) {
      const error = exit.cause.reasons.find((r) => r._tag === "Fail");
      ready.resolve({
        ok: false,
        error:
          error && error._tag === "Fail"
            ? describeFailure(error.error as never)
            : `Failed to start studio: ${String(exit.cause)}`,
      });
    }
  });
  process.once("SIGINT", () => {
    void Effect.runPromise(Fiber.interrupt(fiber)).then(() => process.exit(0));
  });
  return ready.promise;
}
