import { emit } from "../emit/index.js";
import { valibot } from "../generator/index.js";

/** Writes the Valibot schemas of a Drizzle schema to `output`, formatted. */
export function sizukuValibot(
  code: string[],
  output: string,
  comment?: boolean,
  type?: boolean,
  relation?: boolean,
) {
  return emit(valibot(code, comment, type, relation), output);
}
