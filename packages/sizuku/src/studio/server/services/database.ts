import { createRequire } from "node:module";
import path from "node:path";
import type { SQLInputValue } from "node:sqlite";
import { pathToFileURL } from "node:url";
import { Effect } from "effect";
import * as SqlDomain from "../domain/sql.js";
import type { Dialect, Statement } from "../domain/sql.js";
import { DatabaseError, DatabaseUnavailableError } from "../errors/index.js";

type Result = {
  readonly columns: readonly string[];
  readonly rows: readonly Readonly<Record<string, unknown>>[];
  readonly rowCount: number;
};

/** An open connection: every statement is an Effect that fails with the driver's message. */
export type Driver = {
  readonly dialect: Dialect;
  readonly query: (statement: Statement) => Effect.Effect<Result, DatabaseError>;
  readonly close: Effect.Effect<void>;
};

/** The connection the studio was started with, or why there is none. */
export type Database = {
  readonly driver: Driver | null;
  readonly status: {
    readonly connected: boolean;
    readonly dialect: Dialect | null;
    readonly url: string | null;
    readonly error: string | null;
  };
};

function message(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function queryError(error: unknown) {
  return new DatabaseError({ cause: message(error) });
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rowsOf(value: unknown) {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

/** The package as the user's project resolves it: the studio ships no database drivers of its own. */
function importFromProject(specifier: string, cwd: string) {
  return Effect.tryPromise({
    try: async (): Promise<unknown> => {
      const resolved = createRequire(path.join(cwd, "package.json")).resolve(specifier);
      const namespace: unknown = await import(pathToFileURL(resolved).href);
      return isRecord(namespace) && "default" in namespace ? namespace.default : namespace;
    },
    catch: (error) =>
      new DatabaseUnavailableError({
        reason: `Cannot load "${specifier}" from ${cwd}: ${message(error)}\n   Install it in your project (npm install ${specifier}) so sizuku studio can connect.`,
      }),
  });
}

function openSqlite(url: string, cwd: string) {
  return Effect.gen(function* () {
    const sqlite = yield* Effect.tryPromise({
      try: () => import("node:sqlite"),
      catch: () =>
        new DatabaseUnavailableError({
          reason: "SQLite needs the built-in node:sqlite module (Node.js 22.13 or newer).",
        }),
    });
    const file = SqlDomain.makeSqlitePath({ url });
    const db = yield* Effect.try({
      try: () => new sqlite.DatabaseSync(file === ":memory:" ? file : path.resolve(cwd, file)),
      catch: (error) => new DatabaseUnavailableError({ reason: message(error) }),
    });
    const driver: Driver = {
      dialect: "sqlite",
      query: (statement) =>
        Effect.try({
          try: () => {
            const prepared = db.prepare(statement.sql);
            const columns = prepared.columns().map((column) => column.name);
            // A statement with no result columns is a write: run it for the count it changed.
            if (columns.length === 0) {
              const info = prepared.run(...(statement.params as SQLInputValue[]));
              return { columns, rows: [], rowCount: Number(info.changes) };
            }
            const rows = rowsOf(prepared.all(...(statement.params as SQLInputValue[])));
            return { columns, rows, rowCount: rows.length };
          },
          catch: queryError,
        }),
      close: Effect.sync(() => db.close()),
    };
    return driver;
  });
}

type PgClient = {
  readonly connect: () => Promise<void>;
  readonly end: () => Promise<void>;
  readonly query: (sql: string, params: readonly unknown[]) => Promise<unknown>;
};

function openPostgres(url: string, cwd: string) {
  return Effect.gen(function* () {
    const pg = yield* importFromProject("pg", cwd);
    const Client = isRecord(pg) ? pg.Client : undefined;
    if (typeof Client !== "function") {
      return yield* new DatabaseUnavailableError({
        reason: 'The "pg" package does not export Client.',
      });
    }
    const client = yield* Effect.tryPromise({
      try: async () => {
        const opened = new (Client as new (options: { connectionString: string }) => PgClient)({
          connectionString: url,
        });
        await opened.connect();
        return opened;
      },
      catch: (error) => new DatabaseUnavailableError({ reason: message(error) }),
    });
    const driver: Driver = {
      dialect: "postgresql",
      query: (statement) =>
        Effect.tryPromise({
          try: async () => {
            const result = await client.query(statement.sql, statement.params);
            const rows = isRecord(result) ? rowsOf(result.rows) : [];
            const fields = isRecord(result) && Array.isArray(result.fields) ? result.fields : [];
            const columns = fields.filter(isRecord).map((field) => String(field.name));
            const rowCount =
              isRecord(result) && typeof result.rowCount === "number"
                ? result.rowCount
                : rows.length;
            return { columns, rows, rowCount };
          },
          catch: queryError,
        }),
      close: Effect.promise(() => client.end().catch(() => undefined)),
    };
    return driver;
  });
}

type MysqlConnection = {
  readonly query: (sql: string, params: readonly unknown[]) => Promise<readonly [unknown, unknown]>;
  readonly end: () => Promise<void>;
};

function openMysql(url: string, cwd: string) {
  return Effect.gen(function* () {
    const mysql = yield* importFromProject("mysql2/promise", cwd);
    const createConnection = isRecord(mysql) ? mysql.createConnection : undefined;
    if (typeof createConnection !== "function") {
      return yield* new DatabaseUnavailableError({
        reason: 'The "mysql2/promise" package does not export createConnection.',
      });
    }
    const connection = yield* Effect.tryPromise({
      try: () => (createConnection as (uri: string) => Promise<MysqlConnection>)(url),
      catch: (error) => new DatabaseUnavailableError({ reason: message(error) }),
    });
    const driver: Driver = {
      dialect: "mysql",
      query: (statement) =>
        Effect.tryPromise({
          try: async () => {
            const [result, fields] = await connection.query(statement.sql, statement.params);
            if (Array.isArray(result)) {
              const rows = rowsOf(result);
              const columns = Array.isArray(fields)
                ? fields.filter(isRecord).map((field) => String(field.name))
                : Object.keys(rows[0] ?? {});
              return { columns, rows, rowCount: rows.length };
            }
            const affected =
              isRecord(result) && typeof result.affectedRows === "number" ? result.affectedRows : 0;
            return { columns: [], rows: [], rowCount: affected };
          },
          catch: queryError,
        }),
      close: Effect.promise(() => connection.end().catch(() => undefined)),
    };
    return driver;
  });
}

export function openDriver(input: { readonly url: string; readonly cwd: string }) {
  const dialect = SqlDomain.makeDialect({ url: input.url });
  if (dialect === "sqlite") return openSqlite(input.url, input.cwd);
  if (dialect === "postgresql") return openPostgres(input.url, input.cwd);
  if (dialect === "mysql") return openMysql(input.url, input.cwd);
  return Effect.fail(
    new DatabaseUnavailableError({
      reason: `Unsupported database URL. Use file:./dev.db (SQLite), postgres://... or mysql://...`,
    }),
  );
}

/** Connects to `url` when there is one. A failure is kept as the status, not raised: the studio still edits the schema without a database. */
export function connectDatabase(input: { readonly url: string | null; readonly cwd: string }) {
  const { url } = input;
  if (url === null) {
    return Effect.succeed<Database>({
      driver: null,
      status: { connected: false, dialect: null, url: null, error: null },
    });
  }
  const redacted = SqlDomain.makeRedactedUrl({ url });
  return openDriver({ url, cwd: input.cwd }).pipe(
    Effect.match({
      onSuccess: (driver): Database => ({
        driver,
        status: { connected: true, dialect: driver.dialect, url: redacted, error: null },
      }),
      onFailure: (error): Database => ({
        driver: null,
        status: {
          connected: false,
          dialect: SqlDomain.makeDialect({ url }),
          url: redacted,
          error: error.reason,
        },
      }),
    }),
  );
}
