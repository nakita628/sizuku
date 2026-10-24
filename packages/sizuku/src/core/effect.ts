import { emit } from "../emit/index.js";
import { effect } from "../generator/index.js";

/** Writes the Effect schemas of a Drizzle schema to `output`, formatted. */
export function sizukuEffect(
  code: string[],
  output: string,
  comment?: boolean,
  type?: boolean,
  relation?: boolean,
) {
  return emit(effect(code, comment, type, relation), output);
}
