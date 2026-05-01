import path from "node:path";
import { fmt } from "../../format/index.js";
import { mkdir, writeFile } from "../../fsp/index.js";
import { extractRelationSchemas, extractSchemas } from "../../helper/extract-schemas.js";
import {
  fieldDefinitions,
  inferEffect,
  makeCapitalized,
  makeRelationFields,
} from "../../utils/index.js";

function effect(
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
  const inner = fieldDefinitions(schema, comment);
  return `export const ${makeCapitalized(schema.name)}Schema = Schema.Struct({${inner}})`;
}

export function effectCode(
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
  const effectSchema = effect(schema, comment);
  if (type) {
    const effectInfer = inferEffect(schema.name);
    return `${effectSchema}\n\n${effectInfer}\n`;
  }
  return `${effectSchema}\n`;
}

export function makeRelationEffectCode(
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
  const obj = `\nexport const ${makeCapitalized(relName)} = Schema.Struct({...${baseSchema}.fields,${fields}})`;
  if (withType) return `${obj}\n\n${inferEffect(schema.name)}\n`;
  return `${obj}`;
}

export async function sizukuEffect(
  code: string[],
  output: string,
  comment?: boolean,
  type?: boolean,
  relation?: boolean,
) {
  const importLine = `import { Schema } from 'effect'`;

  const baseSchemas = extractSchemas(code, "effect");
  const relationSchemas = extractRelationSchemas(code, "effect");

  const effectGeneratedCode = [
    importLine,
    "",
    ...baseSchemas.map((schema) => effectCode(schema, comment ?? false, type ?? false)),
    ...(relation
      ? relationSchemas.map((schema) => makeRelationEffectCode(schema, type ?? false))
      : []),
  ].join("\n");

  const mkdirResult = await mkdir(path.dirname(output));
  if (!mkdirResult.ok) {
    return { ok: false, error: mkdirResult.error } as const;
  }
  const formatResult = await fmt(effectGeneratedCode);
  if (!formatResult.ok) {
    return { ok: false, error: formatResult.error } as const;
  }
  const writeFileResult = await writeFile(output, formatResult.value);
  if (!writeFileResult.ok) {
    return { ok: false, error: writeFileResult.error } as const;
  }
  return { ok: true, value: undefined } as const;
}
