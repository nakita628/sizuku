import { Effect } from "effect";
import { NO_DATABASE_MESSAGE } from "../constants/index.js";
import * as ParseDomain from "../domain/parse.js";
import * as QueryDomain from "../domain/query.js";
import { DatabaseUnavailableError, SchemaParseError } from "../errors/index.js";
import { readText } from "../services/file.js";
import * as ParseService from "../services/parse.js";
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
    const parseError = ParseDomain.makeParseError({
      source: schemaSource,
      error: ParseService.findSyntaxError(schemaSource),
    });
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

/** The tables and columns Drizzle code touches, against the saved schema; none while either does not parse. */
export function touchedByQuery(input: { readonly code: string }) {
  return Effect.gen(function* () {
    const source = yield* readText(getStudio().schemaPath);
    const names = ParseService.readQueryNames(input.code);
    if (names === null || ParseService.findSyntaxError(source) !== null) return { tables: [] };
    return {
      tables: QueryDomain.makeQueryTouched({
        models: ParseService.readSchema(source).models,
        relationFields: ParseService.readRelationFields(source),
        ...names,
      }),
    };
  });
}
