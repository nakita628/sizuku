type Annotation = {
  readonly type: "zod" | "valibot" | "arktype" | "effect" | "description" | "relation" | "custom";
  readonly key: string;
  readonly value: string;
};

export function mergeSchemaWithComments<
  Col extends { name: string },
  Tbl extends { tableName: string; columns: readonly Col[] },
  Rel,
  Enm,
  D,
>(
  runtimeInfo: {
    readonly dialect: D;
    readonly tables: readonly Tbl[];
    readonly relations: readonly Rel[];
    readonly enums: readonly Enm[];
  },
  comments: {
    readonly tableComments: ReadonlyMap<string, readonly Annotation[]>;
    readonly columnComments: ReadonlyMap<string, readonly Annotation[]>;
  },
) {
  const empty: readonly Annotation[] = [];
  return {
    dialect: runtimeInfo.dialect,
    tables: runtimeInfo.tables.map((table) => ({
      ...table,
      columns: table.columns.map((column) => ({
        ...column,
        annotations: comments.columnComments.get(`${table.tableName}.${column.name}`) || empty,
      })),
      annotations: comments.tableComments.get(table.tableName) || empty,
    })),
    relations: runtimeInfo.relations.map((relation) => ({
      ...relation,
      annotations: empty,
    })),
    enums: runtimeInfo.enums,
  };
}

export function createMergedSchemaFromRuntime<
  Col,
  Tbl extends { columns: readonly Col[] },
  Rel,
  Enm,
  D,
>(runtimeInfo: {
  readonly dialect: D;
  readonly tables: readonly Tbl[];
  readonly relations: readonly Rel[];
  readonly enums: readonly Enm[];
}) {
  const annotations: readonly Annotation[] = [];
  return {
    dialect: runtimeInfo.dialect,
    tables: runtimeInfo.tables.map((table) => ({
      ...table,
      columns: table.columns.map((column) => ({ ...column, annotations })),
      annotations,
    })),
    relations: runtimeInfo.relations.map((relation) => ({ ...relation, annotations })),
    enums: runtimeInfo.enums,
  };
}

export function findTable<T extends { tableName: string }>(
  schema: { readonly tables: readonly T[] },
  tableName: string,
) {
  return schema.tables.find((t) => t.tableName === tableName);
}

export function findColumn<
  C extends { name: string },
  T extends { tableName: string; columns: readonly C[] },
>(schema: { readonly tables: readonly T[] }, tableName: string, columnName: string) {
  return findTable(schema, tableName)?.columns.find((c) => c.name === columnName);
}

export function getTableRelations<R extends { sourceTable: string }>(
  schema: { readonly relations: readonly R[] },
  tableName: string,
) {
  return schema.relations.filter((r) => r.sourceTable === tableName);
}

export function getForeignKeysTo<
  F extends { foreignTable: string },
  T extends { tableName: string; foreignKeys: readonly F[] },
>(schema: { readonly tables: readonly T[] }, tableName: string) {
  return schema.tables.flatMap((table) =>
    table.foreignKeys
      .filter((fk) => fk.foreignTable === tableName)
      .map((fk) => ({ sourceTable: table.tableName, fk })),
  );
}
