import type { Context } from "hono";
import { Effect } from "effect";
import * as ProblemDomain from "./problem.js";

/** Logs an unexpected failure and answers 500 without exposing it. */
export function internalError(c: Context, label: string, cause: unknown) {
  return Effect.logError(label, cause).pipe(
    Effect.as(
      c.json(
        ProblemDomain.makeInternalServerProblem({ instance: c.req.path }),
        500,
        ProblemDomain.PROBLEM_HEADERS,
      ),
    ),
  );
}
