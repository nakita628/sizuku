import path from "node:path";
import { emit, zod } from "../generator/index.js";

export function sizukuZod(
  code: string[],
  output: string,
  comment?: boolean,
  type?: boolean,
  version?: "v4" | "mini" | "@hono/zod-openapi",
  relation?: boolean,
) {
  return emit(zod(code, comment, type, version, relation), path.dirname(output), output);
}
