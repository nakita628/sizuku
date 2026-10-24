import { emit } from "../emit/index.js";
import { arktype } from "../generator/index.js";

/** Writes the Arktype schemas of a Drizzle schema to `output`, formatted. */
export function sizukuArktype(
  code: string[],
  output: string,
  comment?: boolean,
  type?: boolean,
  relation?: boolean,
) {
  return emit(arktype(code, comment, type, relation), output);
}
