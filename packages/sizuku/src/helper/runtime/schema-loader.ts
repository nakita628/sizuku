import {
  type AnyColumn,
  createMany,
  createOne,
  getTableColumns,
  getTableName,
  is,
  One,
  Relations,
} from "drizzle-orm";
import { getTableConfig as getMySqlTableConfig, MySqlTable } from "drizzle-orm/mysql-core";
import {
  getTableConfig as getPgTableConfig,
  isPgEnum,
  type PgEnum,
  PgTable,
} from "drizzle-orm/pg-core";
import { getTableConfig as getSQLiteTableConfig, SQLiteTable } from "drizzle-orm/sqlite-core";

function detectDialect(table: unknown) {
  if (is(table, PgTable)) return "pg" as const;
  if (is(table, MySqlTable)) return "mysql" as const;
  if (is(table, SQLiteTable)) return "sqlite" as const;
  return null;
}

function getTableInternals(table: PgTable | MySqlTable | SQLiteTable) {
  if (is(table, PgTable)) {
    const cfg = getPgTableConfig(table);
    return { schema: cfg.schema, foreignKeys: cfg.foreignKeys };
  }
  if (is(table, MySqlTable)) {
    const cfg = getMySqlTableConfig(table);
    return { schema: cfg.schema, foreignKeys: cfg.foreignKeys };
  }
  const cfg = getSQLiteTableConfig(table);
  return { schema: undefined, foreignKeys: cfg.foreignKeys };
}

function isAutoIncrement(column: AnyColumn, dialect: "pg" | "mysql" | "sqlite") {
  const sqlType = column.getSQLType().toLowerCase();
  const flag = "autoIncrement" in column && column.autoIncrement === true;

  if (dialect === "pg") {
    return sqlType === "serial" || sqlType === "smallserial" || sqlType === "bigserial";
  }
  if (dialect === "mysql") {
    return sqlType === "serial" || flag;
  }
  // sqlite
  return sqlType === "integer" && (column.primary || flag);
}

function extractColumnInfo(column: AnyColumn, dialect: "pg" | "mysql" | "sqlite") {
  return {
    name: column.name,
    sqlType: column.getSQLType(),
    isPrimaryKey: column.primary,
    isNotNull: column.notNull,
    isUnique: column.isUnique,
    hasDefault: column.default !== undefined,
    defaultValue: column.default,
    isAutoIncrement: isAutoIncrement(column, dialect),
  };
}

function extractTableInfo(
  table: PgTable | MySqlTable | SQLiteTable,
  key: string,
  dialect: "pg" | "mysql" | "sqlite",
) {
  const tableName = getTableName(table);
  const { schema, foreignKeys } = getTableInternals(table);
  const columns = Object.values(getTableColumns(table)).map((column) =>
    extractColumnInfo(column, dialect),
  );

  return {
    name: key,
    tableName,
    schema,
    dialect,
    columns,
    foreignKeys: foreignKeys.map((fk) => {
      const ref = fk.reference();
      return {
        sourceTable: tableName,
        sourceColumns: ref.columns.map((col) => col.name),
        foreignTable: getTableName(ref.foreignTable),
        foreignColumns: ref.foreignColumns.map((col) => col.name),
        onDelete: fk.onDelete,
        onUpdate: fk.onUpdate,
      };
    }),
  };
}

function extractRelationInfo(relationsObj: Relations) {
  const sourceTableName = getTableName(relationsObj.table);

  const config = relationsObj.config({
    one: createOne(relationsObj.table),
    many: createMany(relationsObj.table),
  });

  return Object.values(config).map((relation) => {
    const referencedTableName = getTableName(relation.referencedTable);
    const base = {
      type: is(relation, One) ? ("one" as const) : ("many" as const),
      sourceTable: sourceTableName,
      referencedTable: referencedTableName,
      relationName: relation.relationName,
    };

    if (!(is(relation, One) && relation.config)) return base;

    const fields = relation.config.fields;
    const references = relation.config.references;
    return {
      ...base,
      ...(fields && fields.length > 0 ? { sourceColumns: fields.map((col) => col.name) } : {}),
      ...(references && references.length > 0
        ? { foreignColumns: references.map((col) => col.name) }
        : {}),
    };
  });
}

function extractEnumInfo(enumObj: PgEnum<[string, ...string[]]>) {
  return {
    name: enumObj.enumName,
    values: [...enumObj.enumValues],
  };
}

export function loadSchemaFromModule(schemaModule: Record<string, unknown>) {
  const entries = Object.entries(schemaModule);

  const detectedDialect = entries.reduce<"pg" | "mysql" | "sqlite" | null>((found, [, value]) => {
    if (found) return found;
    if (isPgEnum(value)) return "pg";
    return detectDialect(value);
  }, null);

  const enums = entries
    .map(([, value]) => value)
    .filter(isPgEnum)
    .map(extractEnumInfo);

  const tables = entries.flatMap(([key, value]) => {
    if (isPgEnum(value)) return [];
    const dialect = detectDialect(value);
    if (!dialect) return [];
    if (is(value, PgTable) || is(value, MySqlTable) || is(value, SQLiteTable)) {
      return [extractTableInfo(value, key, dialect)];
    }
    return [];
  });

  const relations = entries.flatMap(([, value]) =>
    is(value, Relations) ? extractRelationInfo(value) : [],
  );

  return {
    dialect: detectedDialect ?? "pg",
    tables,
    relations,
    enums,
  };
}

export async function loadSchemaFromPath(schemaPath: string) {
  const schemaModule = await import(schemaPath);
  return loadSchemaFromModule(schemaModule);
}
