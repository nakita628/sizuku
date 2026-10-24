import { Effect } from "effect";
import * as DocsDomain from "../domain/docs.js";
import * as ParseDomain from "../domain/parse.js";
import * as QueryDomain from "../domain/query.js";
import { readText } from "../services/file.js";
import * as ParseService from "../services/parse.js";
import { getStudio } from "../services/studio.js";

/** The docs of the saved schema; a file that does not parse has none, and says why. */
export function readDocs() {
  return Effect.gen(function* () {
    const source = yield* readText(getStudio().schemaPath);
    const parseError = ParseDomain.makeParseError({
      source,
      error: ParseService.findSyntaxError(source),
    });
    if (parseError !== null) return { tables: [], enums: [], parseError };
    const docs = DocsDomain.makeDocs({
      ...ParseService.readSchema(source),
      relationNames: ParseService.readRelationNames(source),
      dialect: QueryDomain.makeSchemaDialect({ source }) ?? "postgresql",
    });
    return { ...docs, parseError: null };
  });
}
