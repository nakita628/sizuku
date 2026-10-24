import type { RouteHandler } from "@hono/zod-openapi";
import type { Context } from "hono";
import { Effect, Match } from "effect";
import type {
  getLanguageRoute,
  postLanguageCompleteDetailRoute,
  postLanguageCompleteRoute,
  postLanguageDiagnosticsRoute,
  postLanguageHoverRoute,
  postLanguageSignatureRoute,
} from "../routes";
import * as ProblemDomain from "../domain/problem.js";
import type { LanguageUnavailableError } from "../errors/index.js";
import * as LanguageUseCase from "../usecases/language.js";

/** No TypeScript to ask: the editor goes on without completion, and the reason says why. */
function unavailable(c: Context, error: LanguageUnavailableError) {
  return Match.value(error).pipe(
    Match.tag("LanguageUnavailableError", ({ reason }) =>
      Effect.succeed(
        c.json(
          ProblemDomain.makeServiceUnavailableProblem({ instance: c.req.path, detail: reason }),
          503,
          ProblemDomain.PROBLEM_HEADERS,
        ),
      ),
    ),
    Match.exhaustive,
  );
}

/** `GET /language` handler. The project's TypeScript version, or why there is none. */
export const getLanguageRouteHandler: RouteHandler<typeof getLanguageRoute> = (c) =>
  Effect.runPromise(
    LanguageUseCase.readLanguageStatus().pipe(Effect.map((value) => c.json(value, 200))),
  );

/** `POST /language/complete` handler. The completions at the cursor. */
export const postLanguageCompleteRouteHandler: RouteHandler<typeof postLanguageCompleteRoute> = (
  c,
) => {
  const data = c.req.valid("json");
  return Effect.runPromise(
    Effect.matchEffect(
      LanguageUseCase.complete({
        document: data.document ?? "schema",
        source: data.source,
        offset: data.offset,
      }),
      {
        onSuccess: (value) => Effect.succeed(c.json(value, 200)),
        onFailure: (error) => unavailable(c, error),
      },
    ),
  );
};

/** `POST /language/complete/detail` handler. The type and documentation of one completion. */
export const postLanguageCompleteDetailRouteHandler: RouteHandler<
  typeof postLanguageCompleteDetailRoute
> = (c) => {
  const data = c.req.valid("json");
  return Effect.runPromise(
    Effect.matchEffect(
      LanguageUseCase.completeDetail({
        document: data.document ?? "schema",
        source: data.source,
        offset: data.offset,
        name: data.name,
      }),
      {
        onSuccess: (value) => Effect.succeed(c.json(value, 200)),
        onFailure: (error) => unavailable(c, error),
      },
    ),
  );
};

/** `POST /language/hover` handler. The type of the symbol at the cursor. */
export const postLanguageHoverRouteHandler: RouteHandler<typeof postLanguageHoverRoute> = (c) => {
  const data = c.req.valid("json");
  return Effect.runPromise(
    Effect.matchEffect(
      LanguageUseCase.hover({
        document: data.document ?? "schema",
        source: data.source,
        offset: data.offset,
      }),
      {
        onSuccess: (value) => Effect.succeed(c.json(value, 200)),
        onFailure: (error) => unavailable(c, error),
      },
    ),
  );
};

/** `POST /language/signature` handler. The signatures of the call the cursor is in. */
export const postLanguageSignatureRouteHandler: RouteHandler<typeof postLanguageSignatureRoute> = (
  c,
) => {
  const data = c.req.valid("json");
  return Effect.runPromise(
    Effect.matchEffect(
      LanguageUseCase.signature({
        document: data.document ?? "schema",
        source: data.source,
        offset: data.offset,
      }),
      {
        onSuccess: (value) => Effect.succeed(c.json(value, 200)),
        onFailure: (error) => unavailable(c, error),
      },
    ),
  );
};

/** `POST /language/diagnostics` handler. The type errors of the source. */
export const postLanguageDiagnosticsRouteHandler: RouteHandler<
  typeof postLanguageDiagnosticsRoute
> = (c) => {
  const data = c.req.valid("json");
  return Effect.runPromise(
    Effect.matchEffect(
      LanguageUseCase.diagnostics({ document: data.document ?? "schema", source: data.source }),
      {
        onSuccess: (value) => Effect.succeed(c.json(value, 200)),
        onFailure: (error) => unavailable(c, error),
      },
    ),
  );
};
