import { emitRaw } from "../emit/index.js";
import { mermaidER } from "../generator/index.js";

/** Writes the Mermaid ER diagram of a Drizzle schema to `output`. */
export function sizukuMermaidER(code: string[], output: string) {
  return emitRaw(mermaidER(code), output);
}
