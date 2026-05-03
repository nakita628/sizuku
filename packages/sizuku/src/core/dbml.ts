import { dirname } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { run } from "@softwaretechnik/dbml-renderer";
import { mkdir, writeFile, writeFileBinary } from "../fsp/index.js";
import { dbml } from "../generator/index.js";

export async function sizukuDbml(code: string[], output: string) {
  const content = dbml(code);
  const mkdirResult = await mkdir(dirname(output));
  if (!mkdirResult.ok) {
    return { ok: false, error: `❌ Failed to create directory: ${mkdirResult.error}` } as const;
  }
  if (output.endsWith(".png")) {
    const svg = run(content, "svg");
    const pngBuffer = new Resvg(svg, { font: { loadSystemFonts: true } }).render().asPng();
    const writeResult = await writeFileBinary(output, pngBuffer);
    if (!writeResult.ok) {
      return { ok: false, error: `❌ Failed to write PNG: ${writeResult.error}` } as const;
    }
    return { ok: true, value: undefined } as const;
  }
  const writeResult = await writeFile(output, content);
  if (!writeResult.ok) {
    return { ok: false, error: `❌ Failed to write DBML: ${writeResult.error}` } as const;
  }
  return { ok: true, value: undefined } as const;
}
