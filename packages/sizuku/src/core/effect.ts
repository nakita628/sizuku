import path from "node:path";
import { effect, emit } from "../generator/index.js";

export function sizukuEffect(
  code: string[],
  output: string,
  comment?: boolean,
  type?: boolean,
  relation?: boolean,
) {
  return emit(effect(code, comment, type, relation), path.dirname(output), output);
}
