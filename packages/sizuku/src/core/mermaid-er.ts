import path from "node:path";
import { mkdir, writeFile } from "../fsp/index.js";
import { mermaidER } from "../generator/index.js";

export async function sizukuMermaidER(code: string[], output: string) {
  const content = mermaidER(code);

  const mkdirResult = await mkdir(path.dirname(output));
  if (!mkdirResult.ok) return { ok: false, error: mkdirResult.error } as const;
  const writeFileResult = await writeFile(output, content);
  if (!writeFileResult.ok) return { ok: false, error: writeFileResult.error } as const;
  return { ok: true, value: undefined } as const;
}
