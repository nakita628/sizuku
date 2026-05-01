import path from "node:path";
import { fmt } from "../../format/index.js";
import { mkdir, writeFile } from "../../fsp/index.js";
import { extractRelationSchemas, extractSchemas } from "../../helper/extract-schemas.js";
import {
  fieldDefinitions,
  inferOutput,
  makeCapitalized,
  makeRelationFields,
  makeValibotObject,
  resolveWrapperType,
} from "../../utils/index.js";

function valibot(
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
  const objectCode = makeValibotObject(inner, wrapperType);
  return `export const ${makeCapitalized(schema.name)}Schema = ${objectCode}`;
}

export function valibotCode(
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
  const valibotSchema = valibot(schema, comment);

  if (type) {
    const valibotInfer = inferOutput(schema.name);
    return `${valibotSchema}\n\n${valibotInfer}\n`;
  }
  return `${valibotSchema}\n`;
}

export function relationValibotCode(
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
  const obj = `\nexport const ${makeCapitalized(relName)} = v.${objectType}({...${baseSchema}.entries,${fields}})`;
  if (withType) return `${obj}\n\n${inferOutput(schema.name)}\n`;
  return `${obj}`;
}

export async function sizukuValibot(
  code: string[],
  output: string,
  comment?: boolean,
  type?: boolean,
  relation?: boolean,
) {
  const baseSchemas = extractSchemas(code, "valibot");
  const relationSchemas = extractRelationSchemas(code, "valibot");

  const valibotGeneratedCode = [
    "import * as v from 'valibot'",
    "",
    ...baseSchemas.map((schema) => valibotCode(schema, comment ?? false, type ?? false)),
    ...(relation
      ? relationSchemas.map((schema) => relationValibotCode(schema, type ?? false))
      : []),
  ].join("\n");

  const mkdirResult = await mkdir(path.dirname(output));
  if (!mkdirResult.ok) {
    return { ok: false, error: mkdirResult.error } as const;
  }
  const formatResult = await fmt(valibotGeneratedCode);
  if (!formatResult.ok) {
    return { ok: false, error: formatResult.error } as const;
  }
  const writeFileResult = await writeFile(output, formatResult.value);
  if (!writeFileResult.ok) {
    return { ok: false, error: writeFileResult.error } as const;
  }
  return { ok: true, value: undefined } as const;
}
