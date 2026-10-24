import { Effect } from "effect";
import { emit } from "../emit/index.js";
import { effect } from "../generator/index.js";
import { requireAnnotations } from "./annotations.js";

/** Writes the Effect schemas of a Drizzle schema to `output`, formatted; a column without an annotation fails. */
export function sizukuEffect(
  code: string[],
  output: string,
  comment?: boolean,
  type?: boolean,
  relation?: boolean,
) {
  return Effect.gen(function* () {
    yield* requireAnnotations(code, "effect");
    yield* emit(effect(code, comment, type, relation), output);
  });
}
