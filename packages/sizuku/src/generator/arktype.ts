import { extractRelationSchemas, extractSchemas } from "../helper/index.js";
import { fieldDefinitions, makeCapitalized, makeRelationFields } from "../utils/index.js";

// ArkType uses `"+"` to control unknown property behavior:
// strict → reject unknown keys, loose → preserve them (default), undefined → omit
function undeclared(objectType: "strict" | "loose" | undefined) {
  if (objectType === "strict") return '"+":"reject",';
  if (objectType === "loose") return '"+":"ignore",';
  return "";
}

export function arktype(code: string[], comment?: boolean, type?: boolean, relation?: boolean) {
  const c = comment ?? false;
  const t = type ?? false;

  const baseLines = extractSchemas(code, "arktype").map((schema) => {
    const cap = makeCapitalized(schema.name);
    const head = `export const ${cap}Schema = type({${undeclared(schema.objectType)}${fieldDefinitions(schema, c)}})`;
    return t ? `${head}\n\nexport type ${cap} = typeof ${cap}Schema.infer\n` : `${head}\n`;
  });

  const relationLines = relation
    ? extractRelationSchemas(code, "arktype").map((schema) => {
        const relSchema = makeCapitalized(`${schema.name}Schema`);
        const baseSchema = `${makeCapitalized(schema.baseName)}Schema`;
        const obj = `\nexport const ${relSchema} = type({${undeclared(schema.objectType)}...${baseSchema}.t,${makeRelationFields(schema.fields)}})`;
        if (!t) return obj;
        const cap = makeCapitalized(schema.name);
        return `${obj}\n\nexport type ${cap} = typeof ${cap}Schema.infer\n`;
      })
    : [];

  return [`import { type } from 'arktype'`, "", ...baseLines, ...relationLines].join("\n");
}
