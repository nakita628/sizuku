import { emitRaw } from "../emit/index.js";
import { erPng, erSvg } from "../generator/index.js";

/** Writes the ER diagram of a Drizzle schema to `output`: a PNG for `.png`, an SVG otherwise. */
export function sizukuER(code: string[], output: string, theme?: "light" | "dark") {
  return emitRaw(output.endsWith(".png") ? erPng(code, theme) : erSvg(code, theme), output);
}
