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

function detectDialect(table: unknown) {
  if (is(table, PgTable)) return "pg" as const;
  if (is(table, MySqlTable)) return "mysql" as const;
  if (is(table, SQLiteTable)) return "sqlite" as const;
  return null;
}

function getInlineForeignKeysSymbol(dialect: "pg" | "mysql" | "sqlite") {
  switch (dialect) {
    case "pg":
      return PgInlineForeignKeys;
    case "mysql":
      return MySqlInlineForeignKeys;
    case "sqlite":
      return SQLiteInlineForeignKeys;
    default:
      return AnyInlineForeignKeys;
  }
}

function isAutoIncrement(column: AnyColumn, dialect: "pg" | "mysql" | "sqlite") {
  const sqlType = column.getSQLType().toLowerCase();

  if (dialect === "pg") {
    return sqlType === "serial" || sqlType === "smallserial" || sqlType === "bigserial";
  }

  if (dialect === "mysql") {
    if (sqlType === "serial") return true;
    const col = column as unknown as { autoIncrement?: boolean };
    return col.autoIncrement === true;
  }

  if (dialect === "sqlite") {
    const col = column as unknown as { autoIncrement?: boolean };
    return sqlType === "integer" && (column.primary || col.autoIncrement === true);
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

function extractForeignKeys(fks: AnyForeignKey[], sourceTableName: string) {
  return fks.map((fk) => {
    const ref = fk.reference();
    const foreignTable = ref.foreignTable as unknown as AnyTable;

    return {
      sourceTable: sourceTableName,
      sourceColumns: ref.columns.map((col) => col.name),
      foreignTable: foreignTable[TableName],
      foreignColumns: ref.foreignColumns.map((col) => col.name),
      onDelete: fk.onDelete,
      onUpdate: fk.onUpdate,
    };
  });
}

function extractTableInfo(table: unknown, key: string, dialect: "pg" | "mysql" | "sqlite") {
  const anyTable = table as unknown as AnyTable;
  const tableName = anyTable[TableName];
  const schemaName = anyTable[Schema];
  const fkSymbol = getInlineForeignKeysSymbol(dialect);

  const drizzleColumns = getTableColumns(table as Table);
  const columns = Object.values(drizzleColumns).map((column) =>
    extractColumnInfo(column as AnyColumn, dialect),
  );

  const inlineFKs = (anyTable[fkSymbol as typeof AnyInlineForeignKeys] || []) as AnyForeignKey[];
  const foreignKeys = extractForeignKeys(inlineFKs, tableName);

  return {
    name: key,
    tableName,
    schema: schemaName,
    dialect,
    columns,
    foreignKeys,
  };
}

function extractRelationInfo(relationsObj: Relations) {
  const sourceTable = relationsObj.table as unknown as AnyTable;
  const sourceTableName = sourceTable[TableName];

  const config = relationsObj.config({
    one: createOne(relationsObj.table),
    many: createMany(relationsObj.table),
  });

  return Object.values(config).map((relation) => {
    const referencedTable = relation.referencedTable as unknown as AnyTable;
    const referencedTableName = referencedTable[TableName];

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
    dialect: detectedDialect || ("pg" as const),
    tables,
    relations,
    enums,
  };
}

export async function loadSchemaFromPath(schemaPath: string) {
  const schemaModule = await import(schemaPath);
  return loadSchemaFromModule(schemaModule);
}
