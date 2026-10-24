import type { Database } from "./database.js";
import { createLanguage } from "./typescript.js";
import type { Language } from "./typescript.js";

/** What every request works on: the schema file, the directory relative paths start from, and the database. */
export type Studio = {
  readonly schemaPath: string;
  readonly cwd: string;
  readonly database: Database;
};

const current: { studio: Studio | null; language: Language | null } = {
  studio: null,
  language: null,
};

/** Set once when the server starts; the handlers are generated as module-level functions and read it from here. */
export function configureStudio(studio: Studio) {
  current.studio = studio;
  // The editor's TypeScript belongs to the schema; it is loaded on its first use.
  current.language = createLanguage({
    schemaPath: studio.schemaPath,
    dialect: studio.database.status.dialect,
  });
}

export function getLanguage() {
  if (current.language === null) throw new Error("sizuku studio is not configured");
  return current.language;
}

export function getStudio() {
  if (current.studio === null) throw new Error("sizuku studio is not configured");
  return current.studio;
}
