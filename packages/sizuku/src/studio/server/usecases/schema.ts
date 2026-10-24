import path from "node:path";
import { Effect } from "effect";
import * as ParseDomain from "../domain/parse.js";
import { readText, writeText } from "../services/file.js";
import { getStudio } from "../services/studio.js";

function snapshot(schemaPath: string, source: string) {
  return {
    path: schemaPath,
    file: path.basename(schemaPath),
    source,
    parseError: ParseDomain.makeParseError({ source }),
  };
}

/** The schema file as it is on disk. */
export function readSchema() {
  return Effect.gen(function* () {
    const { schemaPath } = getStudio();
    return snapshot(schemaPath, yield* readText(schemaPath));
  });
}

/** Writes the schema file; a source that does not parse is still saved, and its error reported. */
export function writeSchema(input: { readonly source: string }) {
  return Effect.gen(function* () {
    const { schemaPath } = getStudio();
    yield* writeText(schemaPath, input.source);
    return snapshot(schemaPath, input.source);
  });
}
