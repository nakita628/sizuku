import { extractRelationSchemas, extractSchemas } from "../helper/index.js";
import {
  fieldDefinitions,
  makeCapitalized,
  makeRelationFields,
  resolveWrapperType,
} from "../utils/index.js";

export function zod(
  code: string[],
  comment?: boolean,
  type?: boolean,
  version?: "v4" | "mini" | "@hono/zod-openapi",
  relation?: boolean,
) {
  const c = comment ?? false;
  const t = type ?? false;
  const importLine =
    version === "mini"
      ? `import * as z from 'zod/mini'`
      : version === "@hono/zod-openapi"
        ? `import { z } from '@hono/zod-openapi'`
        : `import * as z from 'zod'`;

  const baseLines = extractSchemas(code, "zod").map((schema) => {
    const cap = makeCapitalized(schema.name);
    const wrapper = resolveWrapperType(schema.objectType);
    const head = `export const ${cap}Schema = z.${wrapper}({${fieldDefinitions(schema, c)}})`;
    return t ? `${head}\n\nexport type ${cap} = z.infer<typeof ${cap}Schema>\n` : `${head}\n`;
  });

  const relationLines = relation
    ? extractRelationSchemas(code, "zod").map((schema) => {
        const relSchema = makeCapitalized(`${schema.name}Schema`);
        const baseSchema = `${makeCapitalized(schema.baseName)}Schema`;
        const wrapper = resolveWrapperType(schema.objectType);
        const obj = `\nexport const ${relSchema} = z.${wrapper}({...${baseSchema}.shape,${makeRelationFields(schema.fields)}})`;
        if (!t) return obj;
        const cap = makeCapitalized(schema.name);
        return `${obj}\n\nexport type ${cap} = z.infer<typeof ${cap}Schema>\n`;
      })
    : [];

  return [importLine, "", ...baseLines, ...relationLines].join("\n");
}
