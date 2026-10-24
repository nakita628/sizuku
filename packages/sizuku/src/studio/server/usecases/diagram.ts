import { Effect } from "effect";
import { erPng, erSvg } from "../../../generator/index.js";
import { stripImports } from "../../../utils/index.js";
import * as ParseDomain from "../domain/parse.js";
import { RenderError, SchemaParseError } from "../errors/index.js";

type Theme = "light" | "dark";

function render<A>(draw: () => A) {
  return Effect.try({
    try: draw,
    catch: (error) =>
      new RenderError({ message: error instanceof Error ? error.message : String(error) }),
  });
}

/** The ER diagram as SVG, or the syntax error that stopped it (the page keeps the last drawing). */
export function drawSvg(input: { readonly source: string; readonly theme: Theme }) {
  return Effect.gen(function* () {
    const parseError = ParseDomain.makeParseError({ source: input.source });
    if (parseError !== null) return { svg: null, parseError };
    const svg = yield* render(() => erSvg(stripImports(input.source), input.theme));
    return { svg, parseError: null };
  });
}

/** The ER diagram as a base64 PNG; a source that does not parse fails. */
export function drawPng(input: { readonly source: string; readonly theme: Theme }) {
  return Effect.gen(function* () {
    const parseError = ParseDomain.makeParseError({ source: input.source });
    if (parseError !== null) return yield* new SchemaParseError(parseError);
    const png = yield* render(() => erPng(stripImports(input.source), input.theme));
    return { base64: Buffer.from(png).toString("base64") };
  });
}
