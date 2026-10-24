import { Effect } from "effect";
import * as FormatService from "../services/format.js";
import { getStudio } from "../services/studio.js";

/**
 * Formats the source as `oxfmt` would in the project: with its `.oxfmtrc.json` when it has one,
 * and oxfmt's defaults when it does not. The studio has no settings of its own for this.
 */
export function formatText(input: { readonly source: string }) {
  return Effect.gen(function* () {
    const { options } = yield* FormatService.readSettings({ schemaPath: getStudio().schemaPath });
    return { source: yield* FormatService.formatSource({ source: input.source, options }) };
  });
}
