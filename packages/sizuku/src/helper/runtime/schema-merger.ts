import type {
  CommentInfo,
  MergedColumnInfo,
  MergedRelationInfo,
  MergedSchema,
  MergedTableInfo,
  RuntimeSchemaInfo,
} from "./types.js";

export function mergeSchemaWithComments(
  runtimeInfo: RuntimeSchemaInfo,
  comments: CommentInfo,
): MergedSchema {
  const mergedTables: MergedTableInfo[] = runtimeInfo.tables.map((table) => {
    const mergedColumns: MergedColumnInfo[] = table.columns.map((column) => ({
      ...column,
      annotations: comments.columnComments.get(`${table.tableName}.${column.name}`) || [],
    }));
    return {
      ...table,
      columns: mergedColumns,
      annotations: comments.tableComments.get(table.tableName) || [],
    };
  });

  const mergedRelations: MergedRelationInfo[] = runtimeInfo.relations.map((relation) => ({
    ...relation,
    annotations: [],
  }));

  return {
    dialect: runtimeInfo.dialect,
    tables: mergedTables,
    relations: mergedRelations,
    enums: runtimeInfo.enums,
  };
}

export function createMergedSchemaFromRuntime(runtimeInfo: RuntimeSchemaInfo): MergedSchema {
  const mergedTables: MergedTableInfo[] = runtimeInfo.tables.map((table) => ({
    ...table,
    columns: table.columns.map((column) => ({
      ...column,
      annotations: [],
    })),
    annotations: [],
  }));

  const mergedRelations: MergedRelationInfo[] = runtimeInfo.relations.map((relation) => ({
    ...relation,
    annotations: [],
  }));

  return {
    dialect: runtimeInfo.dialect,
    tables: mergedTables,
    relations: mergedRelations,
    enums: runtimeInfo.enums,
  };
}

export function findTable(schema: MergedSchema, tableName: string) {
  return schema.tables.find((t) => t.tableName === tableName);
}

export function findColumn(schema: MergedSchema, tableName: string, columnName: string) {
  const table = findTable(schema, tableName);
  return table?.columns.find((c) => c.name === columnName);
}

export function getTableRelations(schema: MergedSchema, tableName: string) {
  return schema.relations.filter((r) => r.sourceTable === tableName);
}

export function getForeignKeysTo(schema: MergedSchema, tableName: string) {
  return schema.tables.flatMap((table) =>
    table.foreignKeys
      .filter((fk) => fk.foreignTable === tableName)
      .map((fk) => ({ sourceTable: table.tableName, fk })),
  );
}
