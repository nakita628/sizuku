import type { Database } from "./database.js";

/** What every request works on: the schema file, the directory relative paths start from, and the database. */
export type Studio = {
  readonly schemaPath: string;
  readonly cwd: string;
  readonly database: Database;
};

const current: { studio: Studio | null } = { studio: null };

/** Set once when the server starts; the handlers are generated as module-level functions and read it from here. */
export function configureStudio(studio: Studio) {
  current.studio = studio;
}

export function getStudio() {
  if (current.studio === null) throw new Error("sizuku studio is not configured");
  return current.studio;
}
