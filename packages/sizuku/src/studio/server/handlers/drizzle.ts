import type { RouteHandler } from "@hono/zod-openapi";
import { Effect, Match } from "effect";
import type { postDrizzleRoute } from "../routes";
import * as QueryUseCase from "../usecases/query.js";

/** `POST /drizzle` handler. Runs Drizzle code; what it throws comes back in the result, while code or a schema that does not parse is a 422 and a missing database or TypeScript a 503. */
export const postDrizzleRouteHandler: RouteHandler<typeof postDrizzleRoute> = (c) => {
  const data = c.req.valid("json");
  return Effect.runPromise(
    Effect.matchEffect(QueryUseCase.runQuery({ code: data.code }), {
      onSuccess: (value) => Effect.succeed(c.json(value, 200)),
      onFailure: (error) =>
        Match.value(error).pipe(
          Match.tag("QueryError", ({ message, line, column }) =>
            Effect.succeed(
              c.json(
                {
                  type: "/problems/validation-failed" as const,
                  title: "Validation Failed" as const,
                  status: 422 as const,
                  detail: "The query does not parse.",
                  instance: c.req.path,
                  errors: [
                    { field: "code", message: `${message} (line ${line}, column ${column})` },
                  ],
                },
                422,
                { "Content-Type": "application/problem+json" },
              ),
            ),
          ),
          Match.tag("SchemaParseError", ({ message, line }) =>
            Effect.succeed(
              c.json(
                {
                  type: "/problems/validation-failed" as const,
                  title: "Validation Failed" as const,
                  status: 422 as const,
                  detail: "The saved schema does not parse.",
                  instance: c.req.path,
                  errors: [{ field: "schema", message: `${message} (line ${line})` }],
                },
                422,
                { "Content-Type": "application/problem+json" },
              ),
            ),
          ),
          Match.tag("DatabaseUnavailableError", ({ reason }) =>
            Effect.succeed(
              c.json(
                {
                  type: "/problems/service-unavailable" as const,
                  title: "Service Unavailable" as const,
                  status: 503 as const,
                  detail: reason,
                  instance: c.req.path,
                },
                503,
                { "Content-Type": "application/problem+json" },
              ),
            ),
          ),
          Match.tag("LanguageUnavailableError", ({ reason }) =>
            Effect.succeed(
              c.json(
                {
                  type: "/problems/service-unavailable" as const,
                  title: "Service Unavailable" as const,
                  status: 503 as const,
                  detail: reason,
                  instance: c.req.path,
                },
                503,
                { "Content-Type": "application/problem+json" },
              ),
            ),
          ),
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
};
