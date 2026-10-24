import { dirname } from "node:path";
import { mkdir, writeFile, writeFileBinary } from "../fsp/index.js";
import { erPng, erSvg } from "../generator/index.js";

export async function sizukuER(code: string[], output: string, theme?: "light" | "dark") {
  const mkdirResult = await mkdir(dirname(output));
  if (!mkdirResult.ok) {
    return { ok: false, error: `❌ Failed to create directory: ${mkdirResult.error}` } as const;
  }
  if (output.endsWith(".png")) {
    const writeResult = await writeFileBinary(output, Buffer.from(erPng(code, theme)));
    if (!writeResult.ok) {
      return { ok: false, error: `❌ Failed to write PNG: ${writeResult.error}` } as const;
    }
    return { ok: true, value: undefined } as const;
  }
  const writeResult = await writeFile(output, erSvg(code, theme));
  if (!writeResult.ok) {
    return { ok: false, error: `❌ Failed to write SVG: ${writeResult.error}` } as const;
  }
  return { ok: true, value: undefined } as const;
}
