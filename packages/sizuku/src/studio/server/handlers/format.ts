import type { RouteHandler } from "@hono/zod-openapi";
import { Effect, Match } from "effect";
import type { getFormatSettingsRoute, postFormatRoute, putFormatSettingsRoute } from "../routes";
import * as ProblemDomain from "../domain/problem.js";
import { internalError } from "../domain/respond.js";
import * as FormatUseCase from "../usecases/format.js";

/** `POST /format` handler. The formatted source; a syntax error is a 422. */
export const postFormatRouteHandler: RouteHandler<typeof postFormatRoute> = (c) =>
  Effect.runPromise(
    Effect.matchEffect(FormatUseCase.formatText(c.req.valid("json")), {
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

/** `GET /format/settings` handler. The options in effect and the config they come from. */
export const getFormatSettingsRouteHandler: RouteHandler<typeof getFormatSettingsRoute> = (c) =>
  Effect.runPromise(
    Effect.matchEffect(FormatUseCase.readFormatSettings(), {
      onSuccess: (value) => Effect.succeed(c.json(value, 200)),
      onFailure: (error) =>
        Match.value(error).pipe(
          Match.tag("FormatError", ({ message }) =>
            internalError(c, "cannot read the formatter config", message),
          ),
          Match.tag("FileReadError", ({ path, cause }) =>
            internalError(c, "cannot read the formatter config", `${path}: ${cause}`),
          ),
          Match.exhaustive,
        ),
    }),
  );

/** `PUT /format/settings` handler. Writes the options into `.oxfmtrc.json`. */
export const putFormatSettingsRouteHandler: RouteHandler<typeof putFormatSettingsRoute> = (c) =>
  Effect.runPromise(
    Effect.matchEffect(FormatUseCase.writeFormatSettings(c.req.valid("json")), {
      onSuccess: (value) => Effect.succeed(c.json(value, 200)),
      onFailure: (error) =>
        Match.value(error).pipe(
          Match.tag("FormatError", ({ message }) =>
            Effect.succeed(
              c.json(
                ProblemDomain.makeValidationProblem({
                  instance: c.req.path,
                  detail: "The existing formatter config could not be read.",
                  errors: [{ field: "options", message }],
                }),
                422,
                ProblemDomain.PROBLEM_HEADERS,
              ),
            ),
          ),
          Match.tag("FileReadError", ({ path, cause }) =>
            internalError(c, "cannot read the formatter config", `${path}: ${cause}`),
          ),
          Match.tag("FileWriteError", ({ path, cause }) =>
            internalError(c, "cannot write the formatter config", `${path}: ${cause}`),
          ),
          Match.exhaustive,
        ),
    }),
  );
