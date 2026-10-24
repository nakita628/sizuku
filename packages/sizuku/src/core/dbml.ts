import { dirname } from "node:path";
import { mkdir, writeFile } from "../fsp/index.js";
import { dbml } from "../generator/index.js";

export async function sizukuDbml(code: string[], output: string) {
  const content = dbml(code);
  const mkdirResult = await mkdir(dirname(output));
  if (!mkdirResult.ok) {
    return { ok: false, error: `❌ Failed to create directory: ${mkdirResult.error}` } as const;
  }
  const writeResult = await writeFile(output, content);
  if (!writeResult.ok) {
    return { ok: false, error: `❌ Failed to write DBML: ${writeResult.error}` } as const;
  }
  return { ok: true, value: undefined } as const;
}
