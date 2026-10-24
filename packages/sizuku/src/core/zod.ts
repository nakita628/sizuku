import { emit } from "../emit/index.js";
import { zod } from "../generator/index.js";

/** Writes the Zod schemas of a Drizzle schema to `output`, formatted. */
export function sizukuZod(
  code: string[],
  output: string,
  comment?: boolean,
  type?: boolean,
  version?: "v4" | "mini" | "@hono/zod-openapi",
  relation?: boolean,
) {
  return emit(zod(code, comment, type, version, relation), output);
}
