import type { AnyColumn } from "drizzle-orm";
import {
  createMany,
  createOne,
  getTableColumns,
  is,
  One,
  Relations,
  type Table,
} from "drizzle-orm";
import type { ForeignKey as MySqlForeignKey } from "drizzle-orm/mysql-core";
import { MySqlTable } from "drizzle-orm/mysql-core";
import type { ForeignKey as PgForeignKey } from "drizzle-orm/pg-core";
import { isPgEnum, type PgEnum, PgTable } from "drizzle-orm/pg-core";
import type { ForeignKey as SQLiteForeignKey } from "drizzle-orm/sqlite-core";
import { SQLiteTable } from "drizzle-orm/sqlite-core";
import {
  AnyInlineForeignKeys,
  MySqlInlineForeignKeys,
  PgInlineForeignKeys,
  Schema,
  SQLiteInlineForeignKeys,
  TableName,
} from "../../symbols.js";

type AnyForeignKey = PgForeignKey | MySqlForeignKey | SQLiteForeignKey;

interface AnyTable {
  readonly [TableName]: string;
  readonly [Schema]?: string;
  readonly [AnyInlineForeignKeys]?: AnyForeignKey[];
}

// drizzle boundary: all type assertions to access internals are confined to the helpers below.
function asAnyTable(value: unknown) {
  return value as unknown as AnyTable;
}

function asAnyColumn(value: unknown) {
  return value as AnyColumn;
}

function asTable(value: unknown) {
  return value as Table;
}

function getAutoIncrementFlag(column: AnyColumn) {
  return (column as unknown as { autoIncrement?: boolean }).autoIncrement === true;
}

function getInlineFks(table: AnyTable, dialect: "pg" | "mysql" | "sqlite") {
  const sym =
    dialect === "pg"
      ? PgInlineForeignKeys
      : dialect === "mysql"
        ? MySqlInlineForeignKeys
        : dialect === "sqlite"
          ? SQLiteInlineForeignKeys
          : AnyInlineForeignKeys;
  return ((table as unknown as Record<symbol, AnyForeignKey[] | undefined>)[sym] ??
    []) as readonly AnyForeignKey[];
}

function detectDialect(table: unknown) {
  if (is(table, PgTable)) return "pg" as const;
  if (is(table, MySqlTable)) return "mysql" as const;
  if (is(table, SQLiteTable)) return "sqlite" as const;
  return null;
}

function isAutoIncrement(column: AnyColumn, dialect: "pg" | "mysql" | "sqlite") {
  const sqlType = column.getSQLType().toLowerCase();

  if (dialect === "pg") {
    return sqlType === "serial" || sqlType === "smallserial" || sqlType === "bigserial";
  }
  if (dialect === "mysql") {
    return sqlType === "serial" || getAutoIncrementFlag(column);
  }
  if (dialect === "sqlite") {
    return sqlType === "integer" && (column.primary || getAutoIncrementFlag(column));
  }
  return false;
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

function extractForeignKeys(fks: readonly AnyForeignKey[], sourceTableName: string) {
  return fks.map((fk) => {
    const ref = fk.reference();
    return {
      sourceTable: sourceTableName,
      sourceColumns: ref.columns.map((col) => col.name),
      foreignTable: asAnyTable(ref.foreignTable)[TableName],
      foreignColumns: ref.foreignColumns.map((col) => col.name),
      onDelete: fk.onDelete,
      onUpdate: fk.onUpdate,
    };
  });
}

function extractTableInfo(table: unknown, key: string, dialect: "pg" | "mysql" | "sqlite") {
  const anyTable = asAnyTable(table);
  const tableName = anyTable[TableName];
  const columns = Object.values(getTableColumns(asTable(table))).map((column) =>
    extractColumnInfo(asAnyColumn(column), dialect),
  );
  const foreignKeys = extractForeignKeys(getInlineFks(anyTable, dialect), tableName);

  return {
    name: key,
    tableName,
    schema: anyTable[Schema],
    dialect,
    columns,
    foreignKeys,
  };
}

function extractRelationInfo(relationsObj: Relations) {
  const sourceTableName = asAnyTable(relationsObj.table)[TableName];

  const config = relationsObj.config({
    one: createOne(relationsObj.table),
    many: createMany(relationsObj.table),
  });

  return Object.values(config).map((relation) => {
    const referencedTableName = asAnyTable(relation.referencedTable)[TableName];
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
    return dialect ? [extractTableInfo(value, key, dialect)] : [];
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
