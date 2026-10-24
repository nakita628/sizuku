import type { RouteHandler } from "@hono/zod-openapi";
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
import * as DbUseCase from "../usecases/db.js";

/** `GET /db` handler. The connection, and the tables of the saved schema. */
export const getDbRouteHandler: RouteHandler<typeof getDbRoute> = (c) => {
  return Effect.runPromise(
    Effect.matchEffect(DbUseCase.readStatus(), {
      onSuccess: (value) => Effect.succeed(c.json(value, 200)),
      onFailure: (error) =>
        Match.value(error).pipe(
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

/** `GET /db/counts` handler. Row counts by table. */
export const getDbCountsRouteHandler: RouteHandler<typeof getDbCountsRoute> = (c) => {
  return Effect.runPromise(
    Effect.matchEffect(DbUseCase.readCounts(), {
      onSuccess: (value) => Effect.succeed(c.json(value, 200)),
      onFailure: (error) =>
        Match.value(error).pipe(
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

/** `GET /db/rows/{tableName}` handler. One page of rows. */
export const getDbRowsTableNameRouteHandler: RouteHandler<typeof getDbRowsTableNameRoute> = (c) => {
  const data = { ...c.req.valid("param"), ...c.req.valid("query") };
  return Effect.runPromise(
    Effect.matchEffect(
      DbUseCase.readRows({ table: data.tableName, skip: data.skip, take: data.take }),
      {
        onSuccess: (value) => Effect.succeed(c.json(value, 200)),
        onFailure: (error) =>
          Match.value(error).pipe(
            Match.tag("UnknownTableError", ({ table }) =>
              Effect.succeed(
                c.json(
                  {
                    type: "/problems/not-found" as const,
                    title: "Not Found" as const,
                    status: 404 as const,
                    detail: `Unknown table "${table}".`,
                    instance: c.req.path,
                  },
                  404,
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
            Match.tag("DatabaseError", ({ cause }) =>
              Effect.succeed(
                c.json(
                  {
                    type: "/problems/service-unavailable" as const,
                    title: "Service Unavailable" as const,
                    status: 503 as const,
                    detail: cause,
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
      },
    ),
  );
};

/** `POST /db/rows/{tableName}` handler. Inserts a row. */
export const postDbRowsTableNameRouteHandler: RouteHandler<typeof postDbRowsTableNameRoute> = (
  c,
) => {
  const data = { ...c.req.valid("param"), ...c.req.valid("json") };
  return Effect.runPromise(
    Effect.matchEffect(DbUseCase.insertRow({ table: data.tableName, values: data.values }), {
      onSuccess: (value) => Effect.succeed(c.json(value, 200)),
      onFailure: (error) =>
        Match.value(error).pipe(
          Match.tag("UnknownTableError", ({ table }) =>
            Effect.succeed(
              c.json(
                {
                  type: "/problems/not-found" as const,
                  title: "Not Found" as const,
                  status: 404 as const,
                  detail: `Unknown table "${table}".`,
                  instance: c.req.path,
                },
                404,
                { "Content-Type": "application/problem+json" },
              ),
            ),
          ),
          Match.tag("InvalidInputError", ({ field, message }) =>
            Effect.succeed(
              c.json(
                {
                  type: "/problems/validation-failed" as const,
                  title: "Validation Failed" as const,
                  status: 422 as const,
                  detail: message,
                  instance: c.req.path,
                  errors: [{ field: field, message: message }],
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
          Match.tag("DatabaseError", ({ cause }) =>
            Effect.succeed(
              c.json(
                {
                  type: "/problems/service-unavailable" as const,
                  title: "Service Unavailable" as const,
                  status: 503 as const,
                  detail: cause,
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

/** `PATCH /db/rows/{tableName}` handler. Updates the row `where` names. */
export const patchDbRowsTableNameRouteHandler: RouteHandler<typeof patchDbRowsTableNameRoute> = (
  c,
) => {
  const data = { ...c.req.valid("param"), ...c.req.valid("json") };
  return Effect.runPromise(
    Effect.matchEffect(
      DbUseCase.updateRow({ table: data.tableName, where: data.where, values: data.values }),
      {
        onSuccess: (value) => Effect.succeed(c.json(value, 200)),
        onFailure: (error) =>
          Match.value(error).pipe(
            Match.tag("UnknownTableError", ({ table }) =>
              Effect.succeed(
                c.json(
                  {
                    type: "/problems/not-found" as const,
                    title: "Not Found" as const,
                    status: 404 as const,
                    detail: `Unknown table "${table}".`,
                    instance: c.req.path,
                  },
                  404,
                  { "Content-Type": "application/problem+json" },
                ),
              ),
            ),
            Match.tag("InvalidInputError", ({ field, message }) =>
              Effect.succeed(
                c.json(
                  {
                    type: "/problems/validation-failed" as const,
                    title: "Validation Failed" as const,
                    status: 422 as const,
                    detail: message,
                    instance: c.req.path,
                    errors: [{ field: field, message: message }],
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
            Match.tag("DatabaseError", ({ cause }) =>
              Effect.succeed(
                c.json(
                  {
                    type: "/problems/service-unavailable" as const,
                    title: "Service Unavailable" as const,
                    status: 503 as const,
                    detail: cause,
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
      },
    ),
  );
};

/** `DELETE /db/rows/{tableName}` handler. Deletes the row `where` names. */
export const deleteDbRowsTableNameRouteHandler: RouteHandler<typeof deleteDbRowsTableNameRoute> = (
  c,
) => {
  const data = { ...c.req.valid("param"), ...c.req.valid("json") };
  return Effect.runPromise(
    Effect.matchEffect(DbUseCase.deleteRow({ table: data.tableName, where: data.where }), {
      onSuccess: (value) => Effect.succeed(c.json(value, 200)),
      onFailure: (error) =>
        Match.value(error).pipe(
          Match.tag("UnknownTableError", ({ table }) =>
            Effect.succeed(
              c.json(
                {
                  type: "/problems/not-found" as const,
                  title: "Not Found" as const,
                  status: 404 as const,
                  detail: `Unknown table "${table}".`,
                  instance: c.req.path,
                },
                404,
                { "Content-Type": "application/problem+json" },
              ),
            ),
          ),
          Match.tag("InvalidInputError", ({ field, message }) =>
            Effect.succeed(
              c.json(
                {
                  type: "/problems/validation-failed" as const,
                  title: "Validation Failed" as const,
                  status: 422 as const,
                  detail: message,
                  instance: c.req.path,
                  errors: [{ field: field, message: message }],
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
          Match.tag("DatabaseError", ({ cause }) =>
            Effect.succeed(
              c.json(
                {
                  type: "/problems/service-unavailable" as const,
                  title: "Service Unavailable" as const,
                  status: 503 as const,
                  detail: cause,
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

/** `POST /db/sql` handler. Runs one statement; one the database rejects is a 503 with its message. */
export const postDbSqlRouteHandler: RouteHandler<typeof postDbSqlRoute> = (c) => {
  const data = c.req.valid("json");
  return Effect.runPromise(
    Effect.matchEffect(DbUseCase.runSql({ sql: data.sql }), {
      onSuccess: (value) => Effect.succeed(c.json(value, 200)),
      onFailure: (error) =>
        Match.value(error).pipe(
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
          Match.tag("DatabaseError", ({ cause }) =>
            Effect.succeed(
              c.json(
                {
                  type: "/problems/service-unavailable" as const,
                  title: "Service Unavailable" as const,
                  status: 503 as const,
                  detail: cause,
                  instance: c.req.path,
                },
                503,
                { "Content-Type": "application/problem+json" },
              ),
            ),
          ),
          Match.exhaustive,
        ),
    }),
  );
};
