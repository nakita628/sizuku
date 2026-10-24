import type { RouteHandler } from "@hono/zod-openapi";
import { Effect, Match } from "effect";
import type { postDiagramPngRoute, postDiagramSvgRoute } from "../routes";
import * as ProblemDomain from "../domain/problem.js";
import { internalError } from "../domain/respond.js";
import * as DiagramUseCase from "../usecases/diagram.js";

/** `POST /diagram/svg` handler. A source that does not parse answers 200 with its error. */
export const postDiagramSvgRouteHandler: RouteHandler<typeof postDiagramSvgRoute> = (c) => {
  const data = c.req.valid("json");
  return Effect.runPromise(
    Effect.matchEffect(
      DiagramUseCase.drawSvg({ source: data.source, theme: data.theme ?? "light" }),
      {
        onSuccess: (value) => Effect.succeed(c.json(value, 200)),
        onFailure: (error) =>
          Match.value(error).pipe(
            Match.tag("RenderError", ({ message }) => internalError(c, "cannot draw", message)),
            Match.exhaustive,
          ),
      },
    ),
  );
};

/** `POST /diagram/png` handler. A source that does not parse is a 422 pointing at the line. */
export const postDiagramPngRouteHandler: RouteHandler<typeof postDiagramPngRoute> = (c) => {
  const data = c.req.valid("json");
  return Effect.runPromise(
    Effect.matchEffect(
      DiagramUseCase.drawPng({ source: data.source, theme: data.theme ?? "light" }),
      {
        onSuccess: (value) => Effect.succeed(c.json(value, 200)),
        onFailure: (error) =>
          Match.value(error).pipe(
            Match.tag("SchemaParseError", ({ message, line, column }) =>
              Effect.succeed(
                c.json(
                  ProblemDomain.makeValidationProblem({
                    instance: c.req.path,
                    detail: "The schema does not parse.",
                    errors: [
                      { field: "source", message: `${message} (line ${line}, column ${column})` },
                    ],
                  }),
                  422,
                  ProblemDomain.PROBLEM_HEADERS,
                ),
              ),
            ),
            Match.tag("RenderError", ({ message }) => internalError(c, "cannot draw", message)),
            Match.exhaustive,
          ),
      },
    ),
  );
};
