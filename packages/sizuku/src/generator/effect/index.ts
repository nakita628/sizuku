import path from "node:path";
import { extractRelationSchemas, extractSchemas } from "../../helper/extract-schemas.js";
import {
  fieldDefinitions,
  inferEffect,
  makeCapitalized,
  makeRelationFields,
} from "../../utils/index.js";
import { emit } from "../emit.js";

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
  const inner = fieldDefinitions(schema, comment);
  const effectSchema = `export const ${makeCapitalized(schema.name)}Schema = Schema.Struct({${inner}})`;
  return type ? `${effectSchema}\n\n${inferEffect(schema.name)}\n` : `${effectSchema}\n`;
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
  return withType ? `${obj}\n\n${inferEffect(schema.name)}\n` : obj;
}

export async function sizukuEffect(
  code: string[],
  output: string,
  comment?: boolean,
  type?: boolean,
  relation?: boolean,
) {
  const baseLines = extractSchemas(code, "effect").map((s) =>
    effectCode(s, comment ?? false, type ?? false),
  );
  const relationLines = relation
    ? extractRelationSchemas(code, "effect").map((s) => makeRelationEffectCode(s, type ?? false))
    : [];

  const generatedCode = [
    `import { Schema } from 'effect'`,
    "",
    ...baseLines,
    ...relationLines,
  ].join("\n");

  return emit(generatedCode, path.dirname(output), output);
}
