import type { RouteHandler } from "@hono/zod-openapi";
import { Effect, Match } from "effect";
import type { postFormatRoute } from "../routes";
import * as FormatUseCase from "../usecases/format.js";

/** `POST /format` handler. The formatted source; a syntax error, or a config oxfmt cannot read, is a 422. */
export const postFormatRouteHandler: RouteHandler<typeof postFormatRoute> = (c) => {
  const data = c.req.valid("json");
  return Effect.runPromise(
    Effect.matchEffect(FormatUseCase.formatText({ source: data.source }), {
      onSuccess: (value) => Effect.succeed(c.json(value, 200)),
      onFailure: (error) =>
        Match.value(error).pipe(
          Match.tag("FormatError", ({ message }) =>
            Effect.succeed(
              c.json(
                {
                  type: "/problems/validation-failed" as const,
                  title: "Validation Failed" as const,
                  status: 422 as const,
                  detail: "The formatter could not format the source.",
                  instance: c.req.path,
                  errors: [{ field: "source", message }],
                },
                422,
                { "Content-Type": "application/problem+json" },
              ),
            ),
          ),
          Match.tag("FileReadError", ({ path, cause }) =>
            Effect.logError("cannot read the formatter config", path, cause).pipe(
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
};
