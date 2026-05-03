import { extractRelationSchemas, extractSchemas } from "../helper/index.js";
import {
  fieldDefinitions,
  makeCapitalized,
  makeRelationFields,
  resolveWrapperType,
} from "../utils/index.js";

export function valibot(code: string[], comment?: boolean, type?: boolean, relation?: boolean) {
  const c = comment ?? false;
  const t = type ?? false;

  const baseLines = extractSchemas(code, "valibot").map((schema) => {
    const cap = makeCapitalized(schema.name);
    const wrapper = resolveWrapperType(schema.objectType);
    const head = `export const ${cap}Schema = v.${wrapper}({${fieldDefinitions(schema, c)}})`;
    return t ? `${head}\n\nexport type ${cap} = v.InferOutput<typeof ${cap}Schema>\n` : `${head}\n`;
  });

  const relationLines = relation
    ? extractRelationSchemas(code, "valibot").map((schema) => {
        const relSchema = makeCapitalized(`${schema.name}Schema`);
        const baseSchema = `${makeCapitalized(schema.baseName)}Schema`;
        const wrapper = resolveWrapperType(schema.objectType);
        const obj = `\nexport const ${relSchema} = v.${wrapper}({...${baseSchema}.entries,${makeRelationFields(schema.fields)}})`;
        if (!t) return obj;
        const cap = makeCapitalized(schema.name);
        return `${obj}\n\nexport type ${cap} = v.InferOutput<typeof ${cap}Schema>\n`;
      })
    : [];

  return ["import * as v from 'valibot'", "", ...baseLines, ...relationLines].join("\n");
}
