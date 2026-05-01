import path from "node:path";
import { extractRelationSchemas, extractSchemas } from "../../helper/extract-schemas.js";
import {
  fieldDefinitions,
  inferArktype,
  makeCapitalized,
  makeRelationFields,
  resolveArktypeUndeclared,
} from "../../utils/index.js";
import { emit } from "../emit.js";

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
  const inner = fieldDefinitions(schema, comment);
  const undeclared = resolveArktypeUndeclared(schema.objectType);
  const arktypeSchema = `export const ${makeCapitalized(schema.name)}Schema = type({${undeclared}${inner}})`;
  return type ? `${arktypeSchema}\n\n${inferArktype(schema.name)}\n` : `${arktypeSchema}\n`;
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
  return withType ? `${obj}\n\n${inferArktype(schema.name)}\n` : obj;
}

export async function sizukuArktype(
  code: string[],
  output: string,
  comment?: boolean,
  type?: boolean,
  relation?: boolean,
) {
  const baseLines = extractSchemas(code, "arktype").map((s) =>
    arktypeCode(s, comment ?? false, type ?? false),
  );
  const relationLines = relation
    ? extractRelationSchemas(code, "arktype").map((s) => makeRelationArktypeCode(s, type ?? false))
    : [];

  const generatedCode = [`import { type } from 'arktype'`, "", ...baseLines, ...relationLines].join(
    "\n",
  );

  return emit(generatedCode, path.dirname(output), output);
}
