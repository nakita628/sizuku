import { Effect } from "effect";
import { emit } from "../emit/index.js";
import { valibot } from "../generator/index.js";
import { requireAnnotations } from "./annotations.js";

/** Writes the Valibot schemas of a Drizzle schema to `output`, formatted; a column without an annotation fails. */
export function sizukuValibot(
  code: string[],
  output: string,
  comment?: boolean,
  type?: boolean,
  relation?: boolean,
) {
  return Effect.gen(function* () {
    yield* requireAnnotations(code, "valibot");
    yield* emit(valibot(code, comment, type, relation), output);
  });
}
