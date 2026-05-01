import path from "node:path";
import { fmt } from "../../format/index.js";
import { mkdir, writeFile } from "../../fsp/index.js";
import { extractRelationSchemas, extractSchemas } from "../../helper/extract-schemas.js";
import {
  fieldDefinitions,
  infer,
  makeCapitalized,
  makeRelationFields,
  makeZodObject,
  resolveWrapperType,
} from "../../utils/index.js";

function zod(
  schema: {
    readonly name: string;
    readonly fields: {
      readonly name: string;
      readonly definition: string;
      readonly description?: string;
    }[];
    readonly objectType?: "strict" | "loose";
  },
  comment: boolean,
) {
  const wrapperType = resolveWrapperType(schema.objectType);
  const inner = fieldDefinitions(schema, comment);
  const objectCode = makeZodObject(inner, wrapperType);
  return `export const ${makeCapitalized(schema.name)}Schema = ${objectCode}`;
}

export function zodCode(
  schema: {
    readonly name: string;
    readonly fields: {
      readonly name: string;
      readonly definition: string;
      readonly description?: string;
    }[];
    readonly objectType?: "strict" | "loose";
  },
  comment: boolean,
  type: boolean,
) {
  const zodSchema = zod(schema, comment);
  if (type) {
    const zInfer = infer(schema.name);
    return `${zodSchema}\n\n${zInfer}\n`;
  }
  return `${zodSchema}\n`;
}

export function relationZodCode(
  schema: {
    readonly name: string;
    readonly baseName: string;
    readonly fields: {
      readonly name: string;
      readonly definition: string;
      readonly description?: string;
    }[];
    readonly objectType?: "strict" | "loose";
  },
  withType: boolean,
) {
  const relName = `${schema.name}Schema`;
  const baseSchema = `${makeCapitalized(schema.baseName)}Schema`;
  const fields = makeRelationFields(schema.fields);
  const objectType = resolveWrapperType(schema.objectType);
  const obj = `\nexport const ${makeCapitalized(relName)} = z.${objectType}({...${baseSchema}.shape,${fields}})`;
  if (withType) return `${obj}\n\n${infer(schema.name)}\n`;
  return `${obj}`;
}

export async function sizukuZod(
  code: string[],
  output: string,
  comment?: boolean,
  type?: boolean,
  zod?: "v4" | "mini" | "@hono/zod-openapi",
  relation?: boolean,
) {
  const importLine =
    zod === "mini"
      ? `import * as z from 'zod/mini'`
      : zod === "@hono/zod-openapi"
        ? `import { z } from '@hono/zod-openapi'`
        : `import * as z from 'zod'`;

  const baseSchemas = extractSchemas(code, "zod");
  const relationSchemas = extractRelationSchemas(code, "zod");

  const zodGeneratedCode = [
    importLine,
    "",
    ...baseSchemas.map((schema) => zodCode(schema, comment ?? false, type ?? false)),
    ...(relation ? relationSchemas.map((schema) => relationZodCode(schema, type ?? false)) : []),
  ].join("\n");

  const mkdirResult = await mkdir(path.dirname(output));
  if (!mkdirResult.ok) {
    return { ok: false, error: mkdirResult.error } as const;
  }
  const formatResult = await fmt(zodGeneratedCode);
  if (!formatResult.ok) {
    return { ok: false, error: formatResult.error } as const;
  }
  const writeFileResult = await writeFile(output, formatResult.value);
  if (!writeFileResult.ok) {
    return { ok: false, error: writeFileResult.error } as const;
  }
  return { ok: true, value: undefined } as const;
}
