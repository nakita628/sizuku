import type { RouteHandler } from "@hono/zod-openapi";
import type { Context } from "hono";
import { Effect, Match } from "effect";
import type { postDrizzleRoute } from "../routes";
import * as ProblemDomain from "../domain/problem.js";
import { internalError } from "../domain/respond.js";
import * as QueryUseCase from "../usecases/query.js";

function invalid(c: Context, field: string, detail: string, message: string) {
  return Effect.succeed(
    c.json(
      ProblemDomain.makeValidationProblem({
        instance: c.req.path,
        detail,
        errors: [{ field, message }],
      }),
      422,
      ProblemDomain.PROBLEM_HEADERS,
    ),
  );
}

function unavailable(c: Context, detail: string) {
  return Effect.succeed(
    c.json(
      ProblemDomain.makeServiceUnavailableProblem({ instance: c.req.path, detail }),
      503,
      ProblemDomain.PROBLEM_HEADERS,
    ),
  );
}

/**
 * `POST /drizzle` handler. Runs Drizzle code; what it throws comes back in the result, while
 * code or a schema that does not parse is a 422 and a missing database or TypeScript a 503.
 */
export const postDrizzleRouteHandler: RouteHandler<typeof postDrizzleRoute> = (c) => {
  const data = c.req.valid("json");
  return Effect.runPromise(
    Effect.matchEffect(QueryUseCase.runQuery({ code: data.code }), {
      onSuccess: (value) => Effect.succeed(c.json(value, 200)),
      onFailure: (error) =>
        Match.value(error).pipe(
          Match.tag("QueryError", ({ message, line, column }) =>
            invalid(
              c,
              "code",
              "The query does not parse.",
              `${message} (line ${line}, column ${column})`,
            ),
          ),
          Match.tag("SchemaParseError", ({ message, line }) =>
            invalid(c, "schema", "The saved schema does not parse.", `${message} (line ${line})`),
          ),
          Match.tag("DatabaseUnavailableError", ({ reason }) => unavailable(c, reason)),
          Match.tag("LanguageUnavailableError", ({ reason }) => unavailable(c, reason)),
          Match.tag("FileReadError", ({ path, cause }) =>
            internalError(c, "cannot read the schema", `${path}: ${cause}`),
          ),
          Match.exhaustive,
        ),
    }),
  );
};
