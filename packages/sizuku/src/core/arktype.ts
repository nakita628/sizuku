import path from "node:path";
import { arktype, emit } from "../generator/index.js";

export function sizukuArktype(
  code: string[],
  output: string,
  comment?: boolean,
  type?: boolean,
  relation?: boolean,
) {
  return emit(arktype(code, comment, type, relation), path.dirname(output), output);
}
