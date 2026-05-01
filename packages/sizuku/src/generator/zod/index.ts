import path from "node:path";
import { extractRelationSchemas, extractSchemas } from "../../helper/extract-schemas.js";
import {
  fieldDefinitions,
  infer,
  makeCapitalized,
  makeRelationFields,
  makeZodObject,
  resolveWrapperType,
} from "../../utils/index.js";
import { emit } from "../emit.js";

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
  const inner = fieldDefinitions(schema, comment);
  const objectCode = makeZodObject(inner, resolveWrapperType(schema.objectType));
  const zodSchema = `export const ${makeCapitalized(schema.name)}Schema = ${objectCode}`;
  return type ? `${zodSchema}\n\n${infer(schema.name)}\n` : `${zodSchema}\n`;
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
  return withType ? `${obj}\n\n${infer(schema.name)}\n` : obj;
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

  const baseLines = extractSchemas(code, "zod").map((s) =>
    zodCode(s, comment ?? false, type ?? false),
  );
  const relationLines = relation
    ? extractRelationSchemas(code, "zod").map((s) => relationZodCode(s, type ?? false))
    : [];

  const generatedCode = [importLine, "", ...baseLines, ...relationLines].join("\n");

  return emit(generatedCode, path.dirname(output), output);
}
