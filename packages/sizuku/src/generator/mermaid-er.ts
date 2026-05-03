import { extractRelationsFromSchema, parseTableInfo } from "../helper/index.js";

export function mermaidER(code: string[]) {
  const tables = parseTableInfo(code);
  const relations = extractRelationsFromSchema(code);

  const relationLines = [
    ...new Set(
      relations.map(
        (r) =>
          `    ${r.fromModel} ||--${r.isRequired ? "}|" : "}o"} ${r.toModel} : "(${r.fromField}) - (${r.toField})"`,
      ),
    ),
  ];

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
