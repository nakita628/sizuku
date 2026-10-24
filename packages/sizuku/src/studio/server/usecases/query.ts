import { Effect } from "effect";
import { NO_DATABASE_MESSAGE } from "../constants/index.js";
import * as ParseDomain from "../domain/parse.js";
import { DatabaseUnavailableError, SchemaParseError } from "../errors/index.js";
import { readText } from "../services/file.js";
import * as QueryService from "../services/query.js";
import { getLanguage, getStudio } from "../services/studio.js";
import { schemaExports } from "../services/typescript.js";

/** Runs Drizzle code against the connected database, with the saved schema. */
export function runQuery(input: { readonly code: string }) {
  return Effect.gen(function* () {
    const { schemaPath, database } = getStudio();
    const driver = database.driver;
    if (driver === null) {
      return yield* new DatabaseUnavailableError({
        reason: database.status.error ?? NO_DATABASE_MESSAGE,
      });
    }
    const typescript = yield* getLanguage().typescript;
    const schemaSource = yield* readText(schemaPath);
    const parseError = ParseDomain.makeParseError({ source: schemaSource });
    if (parseError !== null) return yield* new SchemaParseError(parseError);
    return yield* QueryService.runQuery({
      code: input.code,
      schemaPath,
      names: schemaExports(schemaSource),
      driver,
      dialect: driver.dialect,
      typescript,
    });
  });
}
