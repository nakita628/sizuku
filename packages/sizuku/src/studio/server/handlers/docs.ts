import type { RouteHandler } from "@hono/zod-openapi";
import { Effect, Match } from "effect";
import type { getDocsRoute } from "../routes";
import { internalError } from "../domain/respond.js";
import * as DocsUseCase from "../usecases/docs.js";

/** `GET /docs` handler. The documentation of the saved schema. */
export const getDocsRouteHandler: RouteHandler<typeof getDocsRoute> = (c) =>
  Effect.runPromise(
    Effect.matchEffect(DocsUseCase.readDocs(), {
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
