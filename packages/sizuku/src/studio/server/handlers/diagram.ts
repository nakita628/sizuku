import type { RouteHandler } from "@hono/zod-openapi";
import { Effect, Match } from "effect";
import type { postDiagramPngRoute, postDiagramSvgRoute } from "../routes";
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
            Match.tag("RenderError", ({ message }) =>
              Effect.logError("cannot draw", message).pipe(
                Effect.as(
                  c.json(
                    {
                      type: "/problems/internal-server-error",
                      title: "Internal Server Error",
                      status: 500,
                      detail: "An unexpected error occurred.",
                      instance: c.req.path,
                    } as const,
                    500,
                    { "Content-Type": "application/problem+json" },
                  ),
                ),
              ),
            ),
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
                  {
                    type: "/problems/validation-failed",
                    title: "Validation Failed",
                    status: 422,
                    detail: "The schema does not parse.",
                    instance: c.req.path,
                    errors: [
                      { field: "source", message: `${message} (line ${line}, column ${column})` },
                    ],
                  } as const,
                  422,
                  { "Content-Type": "application/problem+json" },
                ),
              ),
            ),
            Match.tag("RenderError", ({ message }) =>
              Effect.logError("cannot draw", message).pipe(
                Effect.as(
                  c.json(
                    {
                      type: "/problems/internal-server-error",
                      title: "Internal Server Error",
                      status: 500,
                      detail: "An unexpected error occurred.",
                      instance: c.req.path,
                    } as const,
                    500,
                    { "Content-Type": "application/problem+json" },
                  ),
                ),
              ),
            ),
            Match.exhaustive,
          ),
      },
    ),
  );
};
