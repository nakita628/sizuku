import path from "node:path";
import { emit, valibot } from "../generator/index.js";

export function sizukuValibot(
  code: string[],
  output: string,
  comment?: boolean,
  type?: boolean,
  relation?: boolean,
) {
  return emit(valibot(code, comment, type, relation), path.dirname(output), output);
}
