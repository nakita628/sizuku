import { extractRelationSchemas, extractSchemas } from "../helper/index.js";
import { fieldDefinitions, makeCapitalized, makeRelationFields } from "../utils/index.js";

export function effect(code: string[], comment?: boolean, type?: boolean, relation?: boolean) {
  const c = comment ?? false;
  const t = type ?? false;

  const baseLines = extractSchemas(code, "effect").map((schema) => {
    const cap = makeCapitalized(schema.name);
    const head = `export const ${cap}Schema = Schema.Struct({${fieldDefinitions(schema, c)}})`;
    return t ? `${head}\n\nexport type ${cap}Encoded = typeof ${cap}Schema.Encoded\n` : `${head}\n`;
  });

  const relationLines = relation
    ? extractRelationSchemas(code, "effect").map((schema) => {
        const relSchema = makeCapitalized(`${schema.name}Schema`);
        const baseSchema = `${makeCapitalized(schema.baseName)}Schema`;
        const obj = `\nexport const ${relSchema} = Schema.Struct({...${baseSchema}.fields,${makeRelationFields(schema.fields)}})`;
        if (!t) return obj;
        const cap = makeCapitalized(schema.name);
        return `${obj}\n\nexport type ${cap}Encoded = typeof ${cap}Schema.Encoded\n`;
      })
    : [];

  return [`import { Schema } from 'effect'`, "", ...baseLines, ...relationLines].join("\n");
}
