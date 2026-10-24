import type { Column } from "drizzle-orm";
import {
  createTableRelationsHelpers,
  extractTablesRelationalConfig,
  getTableColumns,
  is,
  Many,
  normalizeRelation,
  One,
  SQL,
  Table,
} from "drizzle-orm";
import { getTableConfig as mysqlTableConfig, MySqlTable } from "drizzle-orm/mysql-core";
import { getTableConfig as pgTableConfig, PgTable } from "drizzle-orm/pg-core";
import { getTableConfig as sqliteTableConfig, SQLiteTable } from "drizzle-orm/sqlite-core";
import { Effect } from "effect";
import { SeedConfigError } from "./errors.js";

export type Dialect = "postgresql" | "mysql" | "sqlite";

/**
 * What a column holds, as the seeder makes and checks it. `date` is a `Date`, `dateString` the
 * text a `mode: "string"` date or timestamp column takes, `unknown` a type the seeder cannot make
 * (a geometry, a custom type) and leaves to a rule.
 */
export type ColumnKind =
  | "string"
  | "uuid"
  | "enum"
  | "int"
  | "bigint"
  | "float"
  | "decimal"
  | "boolean"
  | "date"
  | "dateString"
  | "json"
  | "bytes"
  | "inet"
  | "cidr"
  | "mac"
  | "interval"
  | "unknown";

/** How a column fills itself when an insert leaves it out. */
export type ColumnDefault =
  | { readonly kind: "value"; readonly value: unknown }
  | { readonly kind: "fn"; readonly fn: () => unknown }
  | { readonly kind: "sql" }
  | null;

/** One insertable column: the property it is read from and the database column it is written to. */
export type SeedColumn = {
  readonly field: string;
  readonly column: string;
  /** The Drizzle column type (`PgVarchar`, `SQLiteInteger`), for messages and literal forms. */
  readonly type: string;
  readonly kind: ColumnKind;
  /** For a `dateString` column, which part of a date it holds. */
  readonly format: "date" | "time" | "timestamp" | null;
  readonly isList: boolean;
  readonly isRequired: boolean;
  readonly isId: boolean;
  readonly enumValues: readonly string[] | null;
  /** The most characters a `varchar` / `char` holds. */
  readonly length: number | null;
  readonly precision: number | null;
  readonly scale: number | null;
  /** The range an integer column stores. */
  readonly range: { readonly min: number; readonly max: number } | null;
  /** The database numbers it: serial, identity, autoincrement, or SQLite's integer primary key. */
  readonly autoincrement: boolean;
  /** A PostgreSQL `generated always as identity` column, which takes a value only when told to. */
  readonly identityAlways: boolean;
  readonly default: ColumnDefault;
  /**
   * The database fills it from a SQL default (`sql\`CURRENT_TIMESTAMP\``) when a row leaves it
   * out: faker rows do, and the INSERT names it only for the rows that give it.
   */
  readonly databaseFills: boolean;
  /** `$onUpdate()`: the value a write stamps. */
  readonly onUpdate: (() => unknown) | null;
  /** The value as the driver takes it: Drizzle's own mapping of the column. */
  readonly toDriver: (value: unknown) => unknown;
};

/** A key of a model to another: the columns it is stored in and the columns it points at. */
export type ForeignKey = {
  /** The `one()` relation that names it (`author`), else its first column (`authorId`). */
  readonly field: string;
  readonly fromFields: readonly string[];
  readonly toModel: string;
  readonly toFields: readonly string[];
  readonly required: boolean;
  /** The from-fields are a unique key of the model, so every parent may be used once. */
  readonly oneToOne: boolean;
  readonly self: boolean;
  /** A foreign key in the database; false for a relation only a `relations()` block declares. */
  readonly enforced: boolean;
};

/** A relation from the parent side (`posts: many(post)`): the child model and the key it points back by. */
export type ParentSide = {
  readonly name: string;
  readonly child: string;
  /** The `field` of the child's foreign key. */
  readonly key: string;
  readonly isList: boolean;
};

export type ModelTable = {
  /** The export name: what `models` and `defineData` are keyed by. */
  readonly name: string;
  readonly table: string;
  readonly schema: string | null;
  readonly columns: readonly SeedColumn[];
  readonly foreignKeys: readonly ForeignKey[];
  readonly parents: readonly ParentSide[];
  /** Every way to name one row: the primary key, each unique column, constraint and unique index. */
  readonly uniques: readonly (readonly string[])[];
};

/** The rows made for one table of the plan. */
export type SeedTableRows<Row> = { readonly table: ModelTable; readonly rows: readonly Row[] };

type AnyColumn = Column & {
  readonly autoIncrement?: boolean;
  readonly generatedIdentity?: { readonly type: "always" | "byDefault" };
  readonly length?: number;
  readonly precision?: number;
  readonly scale?: number;
  readonly unsigned?: boolean;
  readonly baseColumn?: Column;
};

const INT = 2_147_483_647;
const SAFE = Number.MAX_SAFE_INTEGER;

/** The range of an integer column, by its Drizzle type; unsigned MySQL types start at 0. */
function intRange(column: AnyColumn) {
  const type = column.columnType;
  const bits = /TinyInt/u.test(type)
    ? 127
    : /SmallInt|SmallSerial/u.test(type)
      ? 32_767
      : /MediumInt/u.test(type)
        ? 8_388_607
        : /^(PgInteger|PgSerial|MySqlInt)$/u.test(type)
          ? INT
          : SAFE;
  if (column.unsigned === true || type === "MySqlSerial") {
    return { min: 0, max: bits === SAFE ? SAFE : bits * 2 + 1 };
  }
  return { min: bits === SAFE ? -SAFE : -bits - 1, max: bits };
}

function kindOf(column: AnyColumn): {
  readonly kind: ColumnKind;
  readonly format: SeedColumn["format"];
} {
  const type = column.columnType;
  const plain = (kind: ColumnKind) => ({ kind, format: null });
  if ((column.enumValues ?? []).length > 0 && column.dataType === "string") return plain("enum");
  switch (column.dataType) {
    case "boolean":
      return plain("boolean");
    case "date":
      return plain("date");
    case "bigint":
      return plain("bigint");
    case "json":
      return plain("json");
    case "buffer":
      return plain("bytes");
    case "number":
      return plain(/Real|Double|Float|Numeric|Decimal/u.test(type) ? "float" : "int");
    case "string": {
      if (type === "PgUUID") return plain("uuid");
      if (/Numeric|Decimal/u.test(type)) return plain("decimal");
      if (type === "PgInet") return plain("inet");
      if (type === "PgCidr") return plain("cidr");
      if (/Macaddr/u.test(type)) return plain("mac");
      if (type === "PgInterval") return plain("interval");
      if (/Timestamp|DateTime/u.test(type)) return { kind: "dateString", format: "timestamp" };
      if (/Date(String)?$/u.test(type)) return { kind: "dateString", format: "date" };
      if (type.endsWith("Time")) return { kind: "dateString", format: "time" };
      return plain("string");
    }
    default:
      return plain("unknown");
  }
}

function defaultOf(column: AnyColumn): ColumnDefault {
  if (column.defaultFn !== undefined) {
    const fn = column.defaultFn;
    return { kind: "fn", fn: () => fn() };
  }
  if (column.default === undefined) return null;
  return is(column.default, SQL) ? { kind: "sql" } : { kind: "value", value: column.default };
}

function isAutoincrement(column: AnyColumn, onlyKey: boolean) {
  return (
    /Serial/u.test(column.columnType) ||
    column.generatedIdentity !== undefined ||
    column.autoIncrement === true ||
    // SQLite numbers an INTEGER PRIMARY KEY itself: the column is the rowid.
    (column.columnType === "SQLiteInteger" && column.primary && onlyKey)
  );
}

/** The column as the seeder reads it: its kind, bounds, defaults and the driver's mapping. */
function makeColumn(field: string, column: AnyColumn, onlyKey: boolean): SeedColumn {
  const list = column.dataType === "array" && column.baseColumn !== undefined;
  const base: AnyColumn = list && column.baseColumn !== undefined ? column.baseColumn : column;
  const { kind, format } = kindOf(base);
  return {
    field,
    column: column.name,
    type: column.columnType,
    kind: column.dataType === "array" && !list ? "unknown" : kind,
    format,
    isList: list,
    isRequired: column.notNull,
    isId: column.primary,
    enumValues: (base.enumValues ?? []).length > 0 ? (base.enumValues ?? []) : null,
    length: typeof base.length === "number" && base.length > 0 ? base.length : null,
    precision: typeof base.precision === "number" ? base.precision : null,
    scale: typeof base.scale === "number" ? base.scale : null,
    range: kind === "int" ? intRange(base) : null,
    autoincrement: kind === "int" && isAutoincrement(column, onlyKey),
    identityAlways: column.generatedIdentity?.type === "always",
    default: defaultOf(column),
    databaseFills: false,
    onUpdate: column.onUpdateFn === undefined ? null : column.onUpdateFn,
    toDriver: (value) => column.mapToDriverValue(value),
  };
}

/** A foreign key as every dialect reports it: its columns, and the table and columns it points at. */
type Reference = {
  readonly columns: readonly Column[];
  readonly foreignColumns: readonly Column[];
  readonly foreignTable: Table;
};

function dialectOf(table: Table): Dialect | null {
  if (is(table, PgTable)) return "postgresql";
  if (is(table, MySqlTable)) return "mysql";
  if (is(table, SQLiteTable)) return "sqlite";
  return null;
}

/** The parts of a table the seeder needs, as each dialect's `getTableConfig` reports them. */
function tableConfig(table: Table, dialect: Dialect) {
  const config =
    dialect === "postgresql"
      ? pgTableConfig(table as PgTable)
      : dialect === "mysql"
        ? mysqlTableConfig(table as MySqlTable)
        : sqliteTableConfig(table as SQLiteTable);
  const uniqueIndexes = config.indexes.flatMap((index) =>
    index.config.unique === true ? [index.config.columns] : [],
  );
  return {
    name: config.name,
    schema: "schema" in config && typeof config.schema === "string" ? config.schema : null,
    primaryKeys: config.primaryKeys.map((key) => key.columns),
    uniques: [...config.uniqueConstraints.map((unique) => unique.columns), ...uniqueIndexes],
    foreignKeys: config.foreignKeys.map((fk): Reference => {
      const reference = fk.reference();
      return {
        columns: reference.columns,
        foreignColumns: reference.foreignColumns,
        foreignTable: reference.foreignTable,
      };
    }),
  };
}

function sameKey(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((field, i) => field === b[i]);
}

function sameSet(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((field) => b.includes(field));
}

/**
 * The tables of a Drizzle schema module as the seeder reads them: every exported table with its
 * insertable columns, its foreign keys (in the database, or declared by a `one()` relation alone),
 * its unique keys and the `many()` relations other models point back by. All tables must be of
 * one dialect.
 */
export function readSchema(schema: Readonly<Record<string, unknown>>) {
  return Effect.gen(function* () {
    const entries = Object.entries(schema).flatMap(([name, value]) =>
      is(value, Table) ? [{ name, table: value }] : [],
    );
    if (entries.length === 0) {
      return yield* new SeedConfigError({
        message:
          "The schema exports no tables.\n   Pass the module itself: `import * as schema from './db/schema'`.",
      });
    }
    const dialects = new Set(entries.map((entry) => dialectOf(entry.table)));
    const [dialect] = [...dialects];
    if (dialects.size !== 1 || dialect === undefined || dialect === null) {
      return yield* new SeedConfigError({
        message:
          "The schema mixes dialects, or uses one the seeder does not know (pg, mysql or sqlite).",
      });
    }
    const nameOf = new Map(entries.map((entry) => [entry.table, entry.name] as const));
    // Every column object by the table and property it belongs to, for keys and relations.
    const fieldOf = new Map<Column, string>(
      entries.flatMap((entry) =>
        Object.entries(getTableColumns(entry.table)).map(
          ([field, column]) => [column, field] as const,
        ),
      ),
    );
    // A table's extra config (`primaryKey()`, `foreignKey()`) holds stand-ins for its columns,
    // not the columns themselves, so a column not known by identity is found by its name.
    const fields = (columns: readonly Column[], table?: Table) =>
      columns.flatMap((column) => {
        const known = fieldOf.get(column);
        if (known !== undefined) return [known];
        const named =
          table === undefined
            ? undefined
            : Object.entries(getTableColumns(table)).find(([, c]) => c.name === column.name)?.[0];
        return named === undefined ? [] : [named];
      });
    const relational = extractTablesRelationalConfig(schema, createTableRelationsHelpers);

    const shapes = entries.map((entry) => {
      const config = tableConfig(entry.table, dialect);
      const columns = Object.entries(getTableColumns(entry.table)) as [string, AnyColumn][];
      const primary = columns.filter(([, column]) => column.primary).map(([field]) => field);
      const uniqueSets = [
        ...(primary.length === 1 ? [primary] : []),
        ...config.primaryKeys.map((key) => fields(key, entry.table)),
        ...columns.filter(([, column]) => column.isUnique).map(([field]) => [field]),
        ...config.uniques.map((set) => indexFields(set, columns)),
      ].filter((set) => set.length > 0);
      const uniques = uniqueSets.filter(
        (set, at) => uniqueSets.findIndex((other) => sameSet(other, set)) === at,
      );
      return { entry, config, columns, uniques };
    });

    // Columns other models' keys point at must hold the values the seeder hands out.
    const referenced = new Set<Column>([
      ...shapes.flatMap((shape) => shape.config.foreignKeys.flatMap((fk) => fk.foreignColumns)),
      ...Object.values(relational.tables).flatMap((t) =>
        Object.values(t.relations).flatMap((relation): Column[] =>
          is(relation, One) && relation.config !== undefined ? relation.config.references : [],
        ),
      ),
    ]);

    const tables = shapes.map((shape): ModelTable => {
      const { entry, config, columns, uniques } = shape;
      const required = (keys: readonly string[]) =>
        keys.every((key) => columns.find(([field]) => field === key)?.[1].notNull === true);
      const oneToOne = (keys: readonly string[]) => uniques.some((set) => sameSet(set, keys));
      const relations = Object.entries(relational.tables[entry.name]?.relations ?? {});
      const owning = relations.flatMap(([relationName, relation]) => {
        if (!is(relation, One) || relation.config === undefined) return [];
        const toModel = nameOf.get(relation.referencedTable);
        if (toModel === undefined) return [];
        return [
          {
            relationName,
            fromFields: fields(relation.config.fields),
            toModel,
            toFields: fields(relation.config.references),
          },
        ];
      });
      const enforced = config.foreignKeys.flatMap((fk): ForeignKey[] => {
        const toModel = nameOf.get(fk.foreignTable);
        if (toModel === undefined) return [];
        const fromFields = fields(fk.columns, entry.table);
        const toFields = fields(fk.foreignColumns, fk.foreignTable);
        const named = owning.find(
          (o) =>
            o.toModel === toModel &&
            sameKey(o.fromFields, fromFields) &&
            sameKey(o.toFields, toFields),
        );
        return [
          {
            field: named?.relationName ?? fromFields[0] ?? "",
            fromFields,
            toModel,
            toFields,
            required: required(fromFields),
            oneToOne: oneToOne(fromFields),
            self: toModel === entry.name,
            enforced: true,
          },
        ];
      });
      const logical = owning
        .filter(
          (o) =>
            !enforced.some(
              (fk) => fk.toModel === o.toModel && sameKey(fk.fromFields, o.fromFields),
            ),
        )
        .map(
          (o): ForeignKey => ({
            field: o.relationName,
            fromFields: o.fromFields,
            toModel: o.toModel,
            toFields: o.toFields,
            required: required(o.fromFields),
            oneToOne: oneToOne(o.fromFields),
            self: o.toModel === entry.name,
            enforced: false,
          }),
        );
      const keyed = new Set(primaryColumnsOf(columns));
      const seedColumns = columns.flatMap(([field, column]) => {
        // A generated column is the database's. A SQL default the database fills, unless the
        // column is a key or something points at it, or it is a date or a uuid worth spreading.
        if (column.generated !== undefined) return [];
        const made = makeColumn(field, column, keyed.size === 1);
        const databaseFills =
          made.default?.kind === "sql" &&
          !made.isId &&
          !referenced.has(column) &&
          !["date", "dateString", "uuid"].includes(made.kind);
        return [{ ...made, databaseFills }];
      });
      return {
        name: entry.name,
        table: config.name,
        schema: config.schema,
        columns: seedColumns,
        foreignKeys: [...enforced, ...logical],
        parents: [],
        uniques,
      };
    });

    // The parent side of each key: `posts: many(post)` on user, matched to post's key back to user
    // by Drizzle's own pairing, or, when that cannot tell, by the one key the child has to it.
    const withParents = tables.map((table): ModelTable => {
      const relations = Object.entries(relational.tables[table.name]?.relations ?? {});
      const parents = relations.flatMap(([name, relation]): ParentSide[] => {
        const isList = is(relation, Many);
        if (!isList && !(is(relation, One) && relation.config === undefined)) return [];
        const child = tables.find((t) => t.name === nameOf.get(relation.referencedTable));
        if (child === undefined) return [];
        const back = child.foreignKeys.filter((fk) => fk.toModel === table.name);
        const paired = (() => {
          try {
            const normalized = normalizeRelation(
              relational.tables,
              relational.tableNamesMap,
              relation,
            );
            const from = fields(normalized.references);
            return back.find((fk) => sameKey(fk.fromFields, from)) ?? null;
          } catch {
            return back.length === 1 ? (back[0] ?? null) : null;
          }
        })();
        return paired === null ? [] : [{ name, child: child.name, key: paired.field, isList }];
      });
      return { ...table, parents };
    });

    return { dialect, tables: withParents };
  });
}

/**
 * The fields of a unique constraint or index, or nothing when one of its parts is not a plain
 * column (an expression): such an index says nothing the seeder can check.
 */
function indexFields(set: readonly unknown[], columns: readonly (readonly [string, AnyColumn])[]) {
  const found = set.map((part) => {
    if (is(part, SQL)) return null;
    const own = columns.find(([, column]) => column === part);
    if (own !== undefined) return own[0];
    // A PostgreSQL index holds its columns as IndexedColumn, which carries the column's name.
    const name = typeof part === "object" && part !== null && "name" in part ? part.name : null;
    return columns.find(([, column]) => column.name === name)?.[0] ?? null;
  });
  return found.every((field): field is string => field !== null) ? found : [];
}

function primaryColumnsOf(columns: readonly (readonly [string, AnyColumn])[]) {
  return columns.filter(([, column]) => column.primary).map(([field]) => field);
}
