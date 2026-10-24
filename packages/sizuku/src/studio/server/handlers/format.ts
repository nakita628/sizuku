import type { RouteHandler } from "@hono/zod-openapi";
import { Effect, Match } from "effect";
import type { postFormatRoute } from "../routes";
import * as ProblemDomain from "../domain/problem.js";
import { internalError } from "../domain/respond.js";
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
                ProblemDomain.makeValidationProblem({
                  instance: c.req.path,
                  detail: "The formatter could not format the source.",
                  errors: [{ field: "source", message }],
                }),
                422,
                ProblemDomain.PROBLEM_HEADERS,
              ),
            ),
          ),
          Match.tag("FileReadError", ({ path, cause }) =>
            internalError(c, "cannot read the formatter config", `${path}: ${cause}`),
          ),
          Match.exhaustive,
        ),
    }),
  );
};
