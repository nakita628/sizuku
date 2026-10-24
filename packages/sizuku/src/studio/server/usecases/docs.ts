import { Effect } from "effect";
import * as DocsDomain from "../domain/docs.js";
import * as ParseDomain from "../domain/parse.js";
import { readText } from "../services/file.js";
import { getStudio } from "../services/studio.js";

/** The docs of the saved schema; a file that does not parse has none, and says why. */
export function readDocs() {
  return Effect.gen(function* () {
    const source = yield* readText(getStudio().schemaPath);
    const parseError = ParseDomain.makeParseError({ source });
    if (parseError !== null) return { tables: [], enums: [], parseError };
    return { ...DocsDomain.makeDocs({ source }), parseError: null };
  });
}
