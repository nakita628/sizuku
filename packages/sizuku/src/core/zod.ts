import { Effect } from "effect";
import { emit } from "../emit/index.js";
import { zod } from "../generator/index.js";
import { requireAnnotations } from "./annotations.js";

/** Writes the Zod schemas of a Drizzle schema to `output`, formatted; a column without an annotation fails. */
export function sizukuZod(
  code: string[],
  output: string,
  comment?: boolean,
  type?: boolean,
  version?: "v4" | "mini" | "@hono/zod-openapi",
  relation?: boolean,
) {
  return Effect.gen(function* () {
    yield* requireAnnotations(code, "zod");
    yield* emit(zod(code, comment, type, version, relation), output);
  });
}
