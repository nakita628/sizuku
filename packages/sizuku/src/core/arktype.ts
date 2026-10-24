import { Effect } from "effect";
import { emit } from "../emit/index.js";
import { arktype } from "../generator/index.js";
import { requireAnnotations } from "./annotations.js";

/** Writes the Arktype schemas of a Drizzle schema to `output`, formatted; a column without an annotation fails. */
export function sizukuArktype(
  code: string[],
  output: string,
  comment?: boolean,
  type?: boolean,
  relation?: boolean,
) {
  return Effect.gen(function* () {
    yield* requireAnnotations(code, "arktype");
    yield* emit(arktype(code, comment, type, relation), output);
  });
}
