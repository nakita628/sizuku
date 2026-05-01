import path from "node:path";
import { mkdir, writeFile } from "../../fsp/index.js";
import type { MergedSchema } from "../../helper/runtime/types.js";
import { erContent, erContentFromMergedSchema } from "./generator/index.js";
import { extractRelationsFromSchema, parseTableInfo } from "./validator/index.js";

export async function sizukuMermaidER(code: string[], output: string) {
  const tables = parseTableInfo(code);
  const relations = extractRelationsFromSchema(code);
  const ERContent = erContent(relations, tables);

  const mkdirResult = await mkdir(path.dirname(output));
  if (!mkdirResult.ok) {
    return { ok: false, error: mkdirResult.error } as const;
  }
  const writeFileResult = await writeFile(output, ERContent);
  if (!writeFileResult.ok) {
    return { ok: false, error: writeFileResult.error } as const;
  }
  return { ok: true, value: undefined } as const;
}

export async function sizukuMermaidERFromMerged(schema: MergedSchema, output: string) {
  const ERContent = erContentFromMergedSchema(schema);

  const mkdirResult = await mkdir(path.dirname(output));
  if (!mkdirResult.ok) {
    return { ok: false, error: mkdirResult.error } as const;
  }
  const writeFileResult = await writeFile(output, ERContent);
  if (!writeFileResult.ok) {
    return { ok: false, error: writeFileResult.error } as const;
  }
  return { ok: true, value: undefined } as const;
}
