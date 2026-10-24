import fs from "node:fs";
import type { RouteHandler } from "@hono/zod-openapi";
import { Effect, Match } from "effect";
import { streamSSE } from "hono/streaming";
import type { getSchemaEventsRoute, getSchemaRoute, putSchemaRoute } from "../routes";
import { WATCH_INTERVAL_MS } from "../constants/index.js";
import { internalError } from "../domain/respond.js";
import { getStudio } from "../services/studio.js";
import * as SchemaUseCase from "../usecases/schema.js";

/** `GET /schema` handler. The schema file as it is on disk. */
export const getSchemaRouteHandler: RouteHandler<typeof getSchemaRoute> = (c) =>
  Effect.runPromise(
    Effect.matchEffect(SchemaUseCase.readSchema(), {
      onSuccess: (value) => Effect.succeed(c.json(value, 200)),
      onFailure: (error) =>
        Match.value(error).pipe(
          Match.tag("FileReadError", ({ path, cause }) =>
            internalError(c, "cannot read the schema", `${path}: ${cause}`),
          ),
          Match.exhaustive,
        ),
    }),
  );

/** `PUT /schema` handler. Writes the schema file. */
export const putSchemaRouteHandler: RouteHandler<typeof putSchemaRoute> = (c) =>
  Effect.runPromise(
    Effect.matchEffect(SchemaUseCase.writeSchema({ source: c.req.valid("json").source }), {
      onSuccess: (value) => Effect.succeed(c.json(value, 200)),
      onFailure: (error) =>
        Match.value(error).pipe(
          Match.tag("FileWriteError", ({ path, cause }) =>
            internalError(c, "cannot write the schema", `${path}: ${cause}`),
          ),
          Match.exhaustive,
        ),
    }),
  );

/**
 * `GET /schema/events` handler. A `change` event whenever the schema file changes on disk, so
 * an edit made in another editor reaches the page. The file is polled: `fs.watch` misses writes
 * through bind mounts and editors that replace the file.
 */
export const getSchemaEventsRouteHandler: RouteHandler<typeof getSchemaEventsRoute> = (c) =>
  streamSSE(c, async (stream) => {
    const file = getStudio().schemaPath;
    const listener = (current: fs.Stats, previous: fs.Stats) => {
      if (current.mtimeMs !== previous.mtimeMs)
        void stream.writeSSE({ event: "change", data: "{}" });
    };
    fs.watchFile(file, { interval: WATCH_INTERVAL_MS }, listener);
    await stream.writeSSE({ event: "ready", data: "{}" });
    await new Promise<void>((resolve) => stream.onAbort(resolve));
    fs.unwatchFile(file, listener);
  }) as never;
