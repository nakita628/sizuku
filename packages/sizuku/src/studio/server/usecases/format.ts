import { Effect } from "effect";
import * as FormatService from "../services/format.js";
import type { FormatOptions } from "../services/format.js";
import { getStudio } from "../services/studio.js";

/** Formats the source with the options given, or the saved settings when none are. */
export function formatText(input: { readonly source: string; readonly options?: FormatOptions }) {
  return Effect.gen(function* () {
    const { schemaPath } = getStudio();
    const options = input.options ?? (yield* FormatService.readSettings({ schemaPath })).options;
    return { source: yield* FormatService.formatSource({ source: input.source, options }) };
  });
}

export function readFormatSettings() {
  return FormatService.readSettings({ schemaPath: getStudio().schemaPath });
}

export function writeFormatSettings(input: { readonly options: FormatOptions }) {
  const { schemaPath, cwd } = getStudio();
  return FormatService.writeSettings({ schemaPath, cwd, options: input.options });
}
