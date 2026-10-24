import fs from "node:fs";
import path from "node:path";
import { serve } from "@hono/node-server";
import type { ServerType } from "@hono/node-server";
import { Effect } from "effect";
import { createStudioApp } from "./app.js";
import { STUDIO_HOSTNAME } from "./constants/index.js";
import { FileReadError, ServerListenError } from "./errors/index.js";
import { connectDatabase } from "./services/database.js";
import { configureStudio } from "./services/studio.js";

/** Listens on loopback until the scope closes; a port already in use fails with ServerListenError. */
function listen(input: {
  readonly fetch: (request: Request) => Response | Promise<Response>;
  readonly port: number;
}) {
  return Effect.acquireRelease(
    Effect.callback<ServerType, ServerListenError>((resume) => {
      const server = serve({ fetch: input.fetch, port: input.port, hostname: STUDIO_HOSTNAME });
      server.once("listening", () => resume(Effect.succeed(server)));
      server.once("error", (error: NodeJS.ErrnoException) =>
        resume(
          Effect.fail(
            new ServerListenError({
              port: input.port,
              code: error.code ?? null,
              message: error.message,
            }),
          ),
        ),
      );
    }),
    (server) => Effect.sync(() => server.close()),
  );
}

/** Connects the database, then serves the studio until the scope closes. */
export function startStudioServer(options: {
  readonly schemaPath: string;
  readonly port: number;
  readonly staticDir: string;
  readonly databaseUrl: string | null;
  readonly cwd: string;
}) {
  return Effect.gen(function* () {
    if (!fs.existsSync(options.schemaPath)) {
      return yield* new FileReadError({ path: options.schemaPath, cause: "does not exist" });
    }
    const database = yield* connectDatabase({ url: options.databaseUrl, cwd: options.cwd });
    yield* Effect.addFinalizer(() => database.driver?.close ?? Effect.void);
    configureStudio({ schemaPath: path.resolve(options.schemaPath), cwd: options.cwd, database });
    const app = createStudioApp(options.staticDir);
    yield* listen({ fetch: app.fetch, port: options.port });
    return { url: `http://${STUDIO_HOSTNAME}:${options.port}`, database: database.status };
  });
}
