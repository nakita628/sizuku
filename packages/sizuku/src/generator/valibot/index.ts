import path from "node:path";
import { extractRelationSchemas, extractSchemas } from "../../helper/extract-schemas.js";
import {
  fieldDefinitions,
  inferOutput,
  makeCapitalized,
  makeRelationFields,
  makeValibotObject,
  resolveWrapperType,
} from "../../utils/index.js";
import { emit } from "../emit.js";

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
  const inner = fieldDefinitions(schema, comment);
  const objectCode = makeValibotObject(inner, resolveWrapperType(schema.objectType));
  const valibotSchema = `export const ${makeCapitalized(schema.name)}Schema = ${objectCode}`;
  return type ? `${valibotSchema}\n\n${inferOutput(schema.name)}\n` : `${valibotSchema}\n`;
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
  return withType ? `${obj}\n\n${inferOutput(schema.name)}\n` : obj;
}

export async function sizukuValibot(
  code: string[],
  output: string,
  comment?: boolean,
  type?: boolean,
  relation?: boolean,
) {
  const baseLines = extractSchemas(code, "valibot").map((s) =>
    valibotCode(s, comment ?? false, type ?? false),
  );
  const relationLines = relation
    ? extractRelationSchemas(code, "valibot").map((s) => relationValibotCode(s, type ?? false))
    : [];

  const generatedCode = ["import * as v from 'valibot'", "", ...baseLines, ...relationLines].join(
    "\n",
  );

  return emit(generatedCode, path.dirname(output), output);
}
