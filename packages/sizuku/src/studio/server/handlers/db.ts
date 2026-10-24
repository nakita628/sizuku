import type { RouteHandler } from "@hono/zod-openapi";
import type { Context } from "hono";
import { Effect, Match } from "effect";
import type {
  deleteDbRowsTableNameRoute,
  getDbCountsRoute,
  getDbRoute,
  getDbRowsTableNameRoute,
  patchDbRowsTableNameRoute,
  postDbRowsTableNameRoute,
  postDbSqlRoute,
} from "../routes";
import * as ProblemDomain from "../domain/problem.js";
import { internalError } from "../domain/respond.js";
import type {
  DatabaseError,
  DatabaseUnavailableError,
  FileReadError,
  InvalidInputError,
  UnknownTableError,
} from "../errors/index.js";
import * as DbUseCase from "../usecases/db.js";

function unavailable(c: Context, detail: string) {
  return Effect.succeed(
    c.json(
      ProblemDomain.makeServiceUnavailableProblem({ instance: c.req.path, detail }),
      503,
      ProblemDomain.PROBLEM_HEADERS,
    ),
  );
}

/** The failures of a request on one table's rows, as problems. */
function rowsFailure(
  c: Context,
  error:
    | UnknownTableError
    | InvalidInputError
    | DatabaseUnavailableError
    | DatabaseError
    | FileReadError,
) {
  return Match.value(error).pipe(
    Match.tag("UnknownTableError", ({ table }) =>
      Effect.succeed(
        c.json(
          ProblemDomain.makeNotFoundProblem({
            instance: c.req.path,
            detail: `Unknown table "${table}".`,
          }),
          404,
          ProblemDomain.PROBLEM_HEADERS,
        ),
      ),
    ),
    Match.tag("InvalidInputError", ({ field, message }) =>
      Effect.succeed(
        c.json(
          ProblemDomain.makeValidationProblem({
            instance: c.req.path,
            detail: message,
            errors: [{ field, message }],
          }),
          422,
          ProblemDomain.PROBLEM_HEADERS,
        ),
      ),
    ),
    Match.tag("DatabaseUnavailableError", ({ reason }) => unavailable(c, reason)),
    Match.tag("DatabaseError", ({ cause }) => unavailable(c, cause)),
    Match.tag("FileReadError", ({ path, cause }) =>
      internalError(c, "cannot read the schema", `${path}: ${cause}`),
    ),
    Match.exhaustive,
  );
}

/** `GET /db` handler. The connection, and the tables of the saved schema. */
export const getDbRouteHandler: RouteHandler<typeof getDbRoute> = (c) =>
  Effect.runPromise(
    Effect.matchEffect(DbUseCase.readStatus(), {
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

/** `GET /db/counts` handler. Row counts by table. */
export const getDbCountsRouteHandler: RouteHandler<typeof getDbCountsRoute> = (c) =>
  Effect.runPromise(
    Effect.matchEffect(DbUseCase.readCounts(), {
      onSuccess: (value) => Effect.succeed(c.json(value, 200)),
      onFailure: (error) =>
        Match.value(error).pipe(
          Match.tag("DatabaseUnavailableError", ({ reason }) => unavailable(c, reason)),
          Match.tag("FileReadError", ({ path, cause }) =>
            internalError(c, "cannot read the schema", `${path}: ${cause}`),
          ),
          Match.exhaustive,
        ),
    }),
  );

/** `GET /db/rows/{tableName}` handler. One page of rows. */
export const getDbRowsTableNameRouteHandler: RouteHandler<typeof getDbRowsTableNameRoute> = (c) => {
  const { tableName } = c.req.valid("param");
  const { skip, take } = c.req.valid("query");
  return Effect.runPromise(
    Effect.matchEffect(DbUseCase.readRows({ table: tableName, skip, take }), {
      onSuccess: (value) => Effect.succeed(c.json(value, 200)),
      onFailure: (error) => rowsFailure(c, error),
    }),
  );
};

/** `POST /db/rows/{tableName}` handler. Inserts a row. */
export const postDbRowsTableNameRouteHandler: RouteHandler<typeof postDbRowsTableNameRoute> = (c) =>
  Effect.runPromise(
    Effect.matchEffect(
      DbUseCase.insertRow({
        table: c.req.valid("param").tableName,
        values: c.req.valid("json").values,
      }),
      {
        onSuccess: (value) => Effect.succeed(c.json(value, 200)),
        onFailure: (error) => rowsFailure(c, error),
      },
    ),
  );

/** `PATCH /db/rows/{tableName}` handler. Updates the row `where` names. */
export const patchDbRowsTableNameRouteHandler: RouteHandler<typeof patchDbRowsTableNameRoute> = (
  c,
) =>
  Effect.runPromise(
    Effect.matchEffect(
      DbUseCase.updateRow({ table: c.req.valid("param").tableName, ...c.req.valid("json") }),
      {
        onSuccess: (value) => Effect.succeed(c.json(value, 200)),
        onFailure: (error) => rowsFailure(c, error),
      },
    ),
  );

/** `DELETE /db/rows/{tableName}` handler. Deletes the row `where` names. */
export const deleteDbRowsTableNameRouteHandler: RouteHandler<typeof deleteDbRowsTableNameRoute> = (
  c,
) =>
  Effect.runPromise(
    Effect.matchEffect(
      DbUseCase.deleteRow({ table: c.req.valid("param").tableName, ...c.req.valid("json") }),
      {
        onSuccess: (value) => Effect.succeed(c.json(value, 200)),
        onFailure: (error) => rowsFailure(c, error),
      },
    ),
  );

/** `POST /db/sql` handler. Runs one statement; one the database rejects is a 503 with its message. */
export const postDbSqlRouteHandler: RouteHandler<typeof postDbSqlRoute> = (c) =>
  Effect.runPromise(
    Effect.matchEffect(DbUseCase.runSql(c.req.valid("json")), {
      onSuccess: (value) => Effect.succeed(c.json(value, 200)),
      onFailure: (error) =>
        Match.value(error).pipe(
          Match.tag("DatabaseUnavailableError", ({ reason }) => unavailable(c, reason)),
          Match.tag("DatabaseError", ({ cause }) => unavailable(c, cause)),
          Match.exhaustive,
        ),
    }),
  );
