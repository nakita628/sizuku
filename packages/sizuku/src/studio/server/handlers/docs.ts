import type { RouteHandler } from "@hono/zod-openapi";
import { Effect, Match } from "effect";
import type { getDocsRoute } from "../routes";
import * as DocsUseCase from "../usecases/docs.js";

/** `GET /docs` handler. The documentation of the saved schema. */
export const getDocsRouteHandler: RouteHandler<typeof getDocsRoute> = (c) =>
  Effect.runPromise(
    Effect.matchEffect(DocsUseCase.readDocs(), {
      onSuccess: (value) => Effect.succeed(c.json(value, 200)),
      onFailure: (error) =>
        Match.value(error).pipe(
          Match.tag("FileReadError", ({ path, cause }) =>
            Effect.logError("cannot read the schema", path, cause).pipe(
              Effect.as(
                c.json(
                  {
                    type: "/problems/internal-server-error" as const,
                    title: "Internal Server Error" as const,
                    status: 500 as const,
                    detail: "An unexpected error occurred.",
                    instance: c.req.path,
                  },
                  500,
                  { "Content-Type": "application/problem+json" },
                ),
              ),
            ),
          ),
          Match.exhaustive,
        ),
    }),
  );
