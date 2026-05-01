export function makeRelationLine(relation: {
  readonly fromModel: string;
  readonly toModel: string;
  readonly fromField: string;
  readonly toField: string;
  readonly isRequired: boolean;
}) {
  const toSymbol = relation.isRequired ? "}|" : "}o";
  return `    ${relation.fromModel} ||--${toSymbol} ${relation.toModel} : "(${relation.fromField}) - (${relation.toField})"`;
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

  return ["```mermaid", "erDiagram", ...relationLines, ...tableDefinitions, "```"].join("\n");
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
export function erContentFromMergedSchema(schema: {
  readonly tables: readonly {
    readonly tableName: string;
    readonly columns: readonly {
      readonly name: string;
      readonly sqlType: string;
      readonly isPrimaryKey: boolean;
      readonly isNotNull: boolean;
      readonly annotations: readonly { readonly type: string; readonly value: string }[];
    }[];
    readonly foreignKeys: readonly {
      readonly sourceColumns: readonly string[];
      readonly foreignTable: string;
      readonly foreignColumns: readonly string[];
    }[];
  }[];
  readonly relations: readonly {
    readonly type: "one" | "many";
    readonly sourceTable: string;
    readonly referencedTable: string;
    readonly sourceColumns?: readonly string[];
    readonly foreignColumns?: readonly string[];
  }[];
}) {
  const fkRelationLines = schema.tables.flatMap((table) =>
    table.foreignKeys.map((fk) => {
      const fromModel = fk.foreignTable;
      const toModel = table.tableName;
      const fromField = fk.foreignColumns.join(", ");
      const toField = fk.sourceColumns.join(", ");
      const key = `${fromModel}.${fromField}->${toModel}.${toField}`;
      const fkColumn = table.columns.find((c) => fk.sourceColumns.includes(c.name));
      const isRequired = fkColumn?.isNotNull ?? false;
      const toSymbol = isRequired ? "}|" : "}o";
      return {
        key,
        line: `    ${fromModel} ||--${toSymbol} ${toModel} : "(${fromField}) - (${toField})"`,
      };
    }),
  );

  const oneRelationLines = schema.relations.flatMap((relation) => {
    if (relation.type !== "one" || !relation.sourceColumns || !relation.foreignColumns) return [];
    const fromModel = relation.referencedTable;
    const toModel = relation.sourceTable;
    const fromField = relation.foreignColumns.join(", ");
    const toField = relation.sourceColumns.join(", ");
    return [
      {
        key: `${fromModel}.${fromField}->${toModel}.${toField}`,
        line: `    ${fromModel} ||--}| ${toModel} : "(${fromField}) - (${toField})"`,
      },
    ];
  });

  const allKeyed = [...fkRelationLines, ...oneRelationLines];
  const relationLines = allKeyed
    .filter((entry, i) => allKeyed.findIndex((x) => x.key === entry.key) === i)
    .map(({ line }) => line);

  const tableDefinitions = schema.tables.flatMap((table) => [
    `    ${table.tableName} {`,
    ...table.columns.map((column) => {
      const type = simplifyType(column.sqlType);
      const keyPart = column.isPrimaryKey
        ? " PK"
        : table.foreignKeys.some((fk) => fk.sourceColumns.includes(column.name))
          ? " FK"
          : "";
      const descAnnotation = column.annotations.find((a) => a.type === "description");
      const descPart = descAnnotation ? ` "${descAnnotation.value}"` : "";
      return `        ${type} ${column.name}${keyPart}${descPart}`;
    }),
    "    }",
  ]);

  return ["```mermaid", "erDiagram", ...relationLines, ...tableDefinitions, "```"].join("\n");
}
