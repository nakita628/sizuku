/** The studio listens on loopback only: the API writes to the schema file and the database. */
export const STUDIO_HOSTNAME = "127.0.0.1";

export const DEFAULT_PORT = 4983;

/** How often the schema file is polled for changes made by another editor. */
export const WATCH_INTERVAL_MS = 500;

export const FORBIDDEN_HOST_MESSAGE =
  "sizuku studio answers only on localhost: the API reads and writes your schema and database.";

export const NO_DATABASE_MESSAGE =
  "No database is connected. Pass --url to sizuku studio or set DATABASE_URL.";
