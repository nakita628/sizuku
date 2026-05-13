import {
  extractRelationsFromAnnotations,
  extractRelationsFromSchema,
  parseTableInfo,
} from "../helper/index.js";

// Builds a Mermaid erDiagram from the schema code. Relations come from two
// sources: inferred via AST (`.references()` / `foreignKey()` / `relations()`)
// and explicit `/// @relation Model.field Model.field type` annotations.
// Explicit annotations override inferred lines for the same
// fromModel.fromField -> toModel.toField key, so the user-declared cardinality
// (e.g. `zero-one-to-many-optional`) wins over the boolean `isRequired`
// approximation.
export function mermaidER(code: string[]) {
  const tables = parseTableInfo(code);
  const inferred = extractRelationsFromSchema(code);
  const annotated = extractRelationsFromAnnotations(code);

  const key = (r: { fromModel: string; fromField: string; toModel: string; toField: string }) =>
    `${r.fromModel}.${r.fromField}->${r.toModel}.${r.toField}`;

  // Map preserves insertion order. Inferred relations seed the order; matching
  // annotations overwrite the symbol in-place. New annotation-only relations
  // append at the end.
  const merged = new Map<
    string,
    {
      fromModel: string;
      fromField: string;
      toModel: string;
      toField: string;
      symbol: string;
    }
  >();
  for (const r of inferred) {
    merged.set(key(r), {
      fromModel: r.fromModel,
      fromField: r.fromField,
      toModel: r.toModel,
      toField: r.toField,
      symbol: r.isRequired ? "||--}|" : "||--}o",
    });
  }
  for (const r of annotated) {
    merged.set(key(r), r);
  }

  const relationLines = [...merged.values()].map(
    (r) => `    ${r.fromModel} ${r.symbol} ${r.toModel} : "(${r.fromField}) - (${r.toField})"`,
  );

  const tableDefinitions = tables.flatMap((table) => [
    `    ${table.name} {`,
    ...table.fields.map((field) => {
      const keyPart = field.keyType ? ` ${field.keyType}` : "";
      const descPart = field.description ? ` "${field.description}"` : "";
      return `        ${field.type} ${field.name}${keyPart}${descPart}`;
    }),
    "    }",
  ]);

  return ["```mermaid", "erDiagram", ...relationLines, ...tableDefinitions, "```"].join("\n");
}
