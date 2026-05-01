import type { MergedSchema } from "../../../helper/runtime/types.js";

const ER_HEADER = ["```mermaid", "erDiagram"] as const;
const ER_FOOTER = ["```"] as const;

const RELATIONSHIPS = {
  "zero-one": "|o",
  one: "||",
  "zero-many": "}o",
  many: "}|",
} as const;

export function makeRelationLine(relation: {
  readonly fromModel: string;
  readonly toModel: string;
  readonly fromField: string;
  readonly toField: string;
  readonly isRequired: boolean;
}) {
  const fromSymbol = RELATIONSHIPS.one;
  const toSymbol = relation.isRequired ? RELATIONSHIPS.many : RELATIONSHIPS["zero-many"];
  return `    ${relation.fromModel} ${fromSymbol}--${toSymbol} ${relation.toModel} : "(${relation.fromField}) - (${relation.toField})"`;
}

export function removeDuplicateRelations(relations: readonly string[]) {
  return [...new Set(relations)];
}

export function erContent(
  relations: readonly {
    readonly fromModel: string;
    readonly toModel: string;
    readonly fromField: string;
    readonly toField: string;
    readonly isRequired: boolean;
  }[],
  tables: readonly {
    readonly name: string;
    readonly fields: readonly {
      readonly type: string;
      readonly name: string;
      readonly keyType: "PK" | "FK" | null;
      readonly description: string | null;
    }[];
  }[],
) {
  // Generate relation lines
  const relationLines = removeDuplicateRelations(relations.map(makeRelationLine));

  // Generate table definitions
  const tableDefinitions = tables.flatMap((table) => [
    `    ${table.name} {`,
    ...table.fields.map((field) => {
      const keyPart = field.keyType ? ` ${field.keyType}` : "";
      const descPart = field.description ? ` "${field.description}"` : "";
      return `        ${field.type} ${field.name}${keyPart}${descPart}`;
    }),
    "    }",
  ]);

  const content = [...ER_HEADER, ...relationLines, ...tableDefinitions, ...ER_FOOTER];

  return content.join("\n");
}

export function simplifyType(sqlType: string) {
  const lower = sqlType.toLowerCase();
  if (lower.includes("int") || lower.includes("serial")) return "int";
  if (lower.includes("varchar") || lower.includes("text") || lower.includes("char"))
    return "string";
  if (lower.includes("uuid")) return "uuid";
  if (lower.includes("bool")) return "boolean";
  if (lower.includes("timestamp") || lower.includes("date") || lower.includes("time"))
    return "datetime";
  if (lower.includes("json")) return "json";
  if (lower.includes("float") || lower.includes("double") || lower.includes("decimal"))
    return "float";
  return sqlType;
}

// Auto-detects relations from foreign keys and relations() without requiring @relation
export function erContentFromMergedSchema(schema: MergedSchema) {
  // Build relation lines from foreign keys
  const relationLines: string[] = [];
  const seenRelations = new Set<string>();

  for (const table of schema.tables) {
    for (const fk of table.foreignKeys) {
      const fromModel = fk.foreignTable;
      const toModel = table.tableName;
      const fromField = fk.foreignColumns.join(", ");
      const toField = fk.sourceColumns.join(", ");

      const key = `${fromModel}.${fromField}->${toModel}.${toField}`;
      if (seenRelations.has(key)) continue;
      seenRelations.add(key);

      // Determine if FK column is not null
      const fkColumn = table.columns.find((c) => fk.sourceColumns.includes(c.name));
      const isRequired = fkColumn?.isNotNull ?? false;

      const fromSymbol = RELATIONSHIPS.one;
      const toSymbol = isRequired ? RELATIONSHIPS.many : RELATIONSHIPS["zero-many"];
      const connector = "--";

      relationLines.push(
        `    ${fromModel} ${fromSymbol}${connector}${toSymbol} ${toModel} : "(${fromField}) - (${toField})"`,
      );
    }
  }

  // Also add relations from relations() function
  for (const relation of schema.relations) {
    if (relation.type === "one" && relation.sourceColumns && relation.foreignColumns) {
      const fromModel = relation.referencedTable;
      const toModel = relation.sourceTable;
      const fromField = relation.foreignColumns.join(", ");
      const toField = relation.sourceColumns.join(", ");

      const key = `${fromModel}.${fromField}->${toModel}.${toField}`;
      if (seenRelations.has(key)) continue;
      seenRelations.add(key);

      const fromSymbol = RELATIONSHIPS.one;
      const toSymbol = RELATIONSHIPS.many;
      const connector = "--";

      relationLines.push(
        `    ${fromModel} ${fromSymbol}${connector}${toSymbol} ${toModel} : "(${fromField}) - (${toField})"`,
      );
    }
  }

  // Generate table definitions
  const tableDefinitions: string[] = [];

  for (const table of schema.tables) {
    tableDefinitions.push(`    ${table.tableName} {`);

    for (const column of table.columns) {
      const type = simplifyType(column.sqlType);
      const keyPart = column.isPrimaryKey
        ? " PK"
        : table.foreignKeys.some((fk) => fk.sourceColumns.includes(column.name))
          ? " FK"
          : "";

      // Get description from annotations
      const descAnnotation = column.annotations.find((a) => a.type === "description");
      const descPart = descAnnotation ? ` "${descAnnotation.value}"` : "";

      tableDefinitions.push(`        ${type} ${column.name}${keyPart}${descPart}`);
    }

    tableDefinitions.push("    }");
  }

  const content = [...ER_HEADER, ...relationLines, ...tableDefinitions, ...ER_FOOTER];

  return content.join("\n");
}
