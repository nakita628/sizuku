import { dirname } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { run } from "@softwaretechnik/dbml-renderer";
import { mkdir, writeFile, writeFileBinary } from "../../fsp/index.js";
import { extractRelationsFromSchema, parseTableInfo } from "../mermaid-er/validator/index.js";
import { dbmlContent } from "./generator/index.js";

function generateContent(code: string[]) {
  const tables = parseTableInfo(code);
  const relations = extractRelationsFromSchema(code);
  return dbmlContent(relations, tables);
}

export async function sizukuDbmlFile(code: string[], output: string) {
  const content = generateContent(code);

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

export async function sizukuDbml(code: string[], output: string) {
  if (output.endsWith(".png")) {
    return sizukuPng(code, output);
  }
  return sizukuDbmlFile(code, output);
}

export async function sizukuPng(code: string[], output: string) {
  const content = generateContent(code);

  const svg = run(content, "svg");
  const resvg = new Resvg(svg, { font: { loadSystemFonts: true } });
  const pngBuffer = resvg.render().asPng();

  const mkdirResult = await mkdir(dirname(output));
  if (!mkdirResult.ok) {
    return { ok: false, error: `❌ Failed to create directory: ${mkdirResult.error}` } as const;
  }

  const writeResult = await writeFileBinary(output, pngBuffer);
  if (!writeResult.ok) {
    return { ok: false, error: `❌ Failed to write PNG: ${writeResult.error}` } as const;
  }

  return { ok: true, value: undefined } as const;
}
