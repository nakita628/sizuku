import { emitRaw } from "../emit/index.js";
import { dbml } from "../generator/index.js";

/** Writes the DBML of a Drizzle schema to `output`. */
export function sizukuDbml(code: string[], output: string) {
  return emitRaw(dbml(code), output);
}
