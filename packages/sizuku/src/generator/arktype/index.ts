import path from "node:path";
import { fmt } from "../../format/index.js";
import { mkdir, writeFile } from "../../fsp/index.js";
import { extractRelationSchemas, extractSchemas } from "../../helper/extract-schemas.js";
import {
  fieldDefinitions,
  inferArktype,
  makeCapitalized,
  makeRelationFields,
  resolveArktypeUndeclared,
} from "../../utils/index.js";

function arktype(
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
  const undeclared = resolveArktypeUndeclared(schema.objectType);
  return `export const ${makeCapitalized(schema.name)}Schema = type({${undeclared}${inner}})`;
}

export function arktypeCode(
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
  const arktypeSchema = arktype(schema, comment);
  if (type) {
    const arktypeInfer = inferArktype(schema.name);
    return `${arktypeSchema}\n\n${arktypeInfer}\n`;
  }
  return `${arktypeSchema}\n`;
}

export function makeRelationArktypeCode(
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
  const undeclared = resolveArktypeUndeclared(schema.objectType);
  const obj = `\nexport const ${makeCapitalized(relName)} = type({${undeclared}...${baseSchema}.t,${fields}})`;
  if (withType) return `${obj}\n\n${inferArktype(schema.name)}\n`;
  return `${obj}`;
}

export async function sizukuArktype(
  code: string[],
  output: string,
  comment?: boolean,
  type?: boolean,
  relation?: boolean,
) {
  const importLine = `import { type } from 'arktype'`;

  const baseSchemas = extractSchemas(code, "arktype");
  const relationSchemas = extractRelationSchemas(code, "arktype");

  const arktypeGeneratedCode = [
    importLine,
    "",
    ...baseSchemas.map((schema) => arktypeCode(schema, comment ?? false, type ?? false)),
    ...(relation
      ? relationSchemas.map((schema) => makeRelationArktypeCode(schema, type ?? false))
      : []),
  ].join("\n");

  const mkdirResult = await mkdir(path.dirname(output));
  if (!mkdirResult.ok) {
    return { ok: false, error: mkdirResult.error } as const;
  }
  const formatResult = await fmt(arktypeGeneratedCode);
  if (!formatResult.ok) {
    return { ok: false, error: formatResult.error } as const;
  }
  const writeFileResult = await writeFile(output, formatResult.value);
  if (!writeFileResult.ok) {
    return { ok: false, error: writeFileResult.error } as const;
  }
  return { ok: true, value: undefined } as const;
}
