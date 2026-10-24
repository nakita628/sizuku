import { diagramSchema, extractRelationSchemas } from "../../../helper/index.js";
import type {
  Cardinality,
  SchemaEnum,
  SchemaField,
  SchemaModel,
  SchemaRelation,
} from "../../../types/index.js";
import { stripImports } from "../../../utils/index.js";
import { makeSchemaDialect } from "./query.js";
import type { Dialect } from "./sql.js";

function isMany(cardinality: Cardinality) {
  return cardinality === "many" || cardinality === "zero-many";
}

/** How a relation reads from one of its ends: the near side first. */
function relationKind(near: Cardinality, far: Cardinality) {
  return `${isMany(near) ? "many" : "one"} to ${isMany(far) ? "many" : "one"}`;
}

function columnName(model: SchemaModel, field: string) {
  return model.fields.find((f) => f.name === field)?.dbName ?? field;
}

/** The relations seen from the table that holds the foreign key. */
function referencesOf(name: string, relations: readonly SchemaRelation[]) {
  return relations
    .filter((r) => r.to.model === name)
    .map((r) => ({
      table: r.from.model,
      column: r.to.field,
      otherColumn: r.from.field,
      kind: relationKind(r.to.cardinality, r.from.cardinality),
      origin: r.origin,
      onDelete: r.onDelete,
      onUpdate: r.onUpdate ?? null,
    }));
}

/** The relations seen from the table another one points at. */
function referencedByOf(name: string, relations: readonly SchemaRelation[]) {
  return relations
    .filter((r) => r.from.model === name)
    .map((r) => ({
      table: r.to.model,
      column: r.from.field,
      otherColumn: r.to.field,
      kind: relationKind(r.from.cardinality, r.to.cardinality),
      origin: r.origin,
      onDelete: r.onDelete,
      onUpdate: r.onUpdate ?? null,
    }));
}

/**
 * The documentation of a Drizzle schema: every table with its columns, keys, defaults, indexes
 * and relations in both directions, and every enum, each with the `///` description it carries.
 */
const NUMERIC =
  /^(int|integer|smallint|bigint|tinyint|mediumint|serial|smallserial|bigserial|real|double|doublePrecision|float|numeric|decimal)$/u;
const DATES = /^(timestamp|date|datetime|time)$/u;
const GENERATED =
  /^\.(?:default|defaultNow|defaultRandom|\$defaultFn|\$default|generatedAlwaysAs)\(/u;

/** A value of the column's type to put in an example: a number, a date, an enum's first value, text. */
function sampleValue(field: SchemaField, enums: readonly SchemaEnum[]) {
  if (field.kind === "enum") {
    const first = enums.find((e) => e.name === field.type)?.values[0]?.name;
    return JSON.stringify(first ?? "value");
  }
  const value = NUMERIC.test(field.type)
    ? "1"
    : field.type === "boolean"
      ? "true"
      : DATES.test(field.type)
        ? "new Date()"
        : field.type === "json" || field.type === "jsonb"
          ? "{}"
          : JSON.stringify(field.name);
  return field.isList ? `[${value}]` : value;
}

/** The columns a row needs a value for: not null, with no default, and not a numeric key the database counts up. */
function requiredFields(model: SchemaModel) {
  const key = new Set(model.primaryKey ?? []);
  return model.fields.filter(
    (field) =>
      field.isRequired &&
      !(field.attributes ?? []).some((attribute) => GENERATED.test(attribute)) &&
      !((field.isId || key.has(field.name)) && NUMERIC.test(field.type) && !field.isForeignKey),
  );
}

/**
 * Drizzle queries to start from on the Query page: read a page, find a row by its key, count,
 * read with its relations, and insert, update and delete one. Every one runs as written.
 */
function makeQueries(input: {
  readonly model: SchemaModel;
  readonly key: readonly string[];
  readonly relationNames: readonly string[];
  readonly enums: readonly SchemaEnum[];
  readonly dialect: Dialect;
}) {
  const { model, key, enums } = input;
  const t = model.name;
  const field = (name: string) => model.fields.find((f) => f.name === name);
  const condition = (() => {
    const parts = key.flatMap((name) => {
      const f = field(name);
      return f ? [`eq(${t}.${name}, ${sampleValue(f, enums)})`] : [];
    });
    return parts.length === 1 ? parts[0] : `and(${parts.join(", ")})`;
  })();
  const values = requiredFields(model).map((f) => `    ${f.name}: ${sampleValue(f, enums)},`);
  const returning = input.dialect === "mysql" ? "" : ".returning()";
  const changeable = model.fields.find((f) => !key.includes(f.name) && !f.isForeignKey);
  return [
    {
      name: "List",
      description: `The first ten rows of ${t}.`,
      code: `db.select().from(${t}).limit(10)`,
    },
    ...(condition === undefined
      ? []
      : [
          {
            name: "Find by key",
            description: `One row of ${t}, found by ${key.join(" and ")}.`,
            code: `db.select().from(${t}).where(${condition})`,
          },
        ]),
    { name: "Count", description: `How many rows ${t} has.`, code: `db.$count(${t})` },
    ...(input.relationNames.length === 0
      ? []
      : [
          {
            name: "With relations",
            description: `Rows of ${t} with what they relate to, through the relational query API.`,
            code: `db.query.${t}.findMany({\n  with: { ${input.relationNames.map((name) => `${name}: true`).join(", ")} },\n  limit: 10,\n})`,
          },
        ]),
    {
      name: "Insert",
      description: `Add a row to ${t}; the columns left out take their defaults.`,
      code: [
        `db.insert(${t})`,
        values.length === 0 ? "  .values({})" : ["  .values({", ...values, "  })"].join("\n"),
        ...(returning === "" ? [] : [`  ${returning}`]),
      ].join("\n"),
    },
    ...(changeable === undefined || condition === undefined
      ? []
      : [
          {
            name: "Update",
            description: `Change ${changeable.name} of the row found by ${key.join(" and ")}.`,
            code: `db.update(${t})\n  .set({ ${changeable.name}: ${sampleValue(changeable, enums)} })\n  .where(${condition})`,
          },
        ]),
    ...(condition === undefined
      ? []
      : [
          {
            name: "Delete",
            description: `Delete the row found by ${key.join(" and ")}.`,
            code: `db.delete(${t}).where(${condition})`,
          },
        ]),
  ];
}

export function makeDocs(input: { readonly source: string }) {
  const code = stripImports(input.source);
  const { models, relations, enums } = diagramSchema(code);
  const dialect = makeSchemaDialect({ source: input.source }) ?? "postgresql";
  const keys = new Map(makeDbTables({ source: input.source }).map((t) => [t.name, t.key]));
  // The names `relations()` gives a table's relations, which `db.query.*.findMany({ with })` takes.
  const relationNames = new Map<string, readonly string[]>();
  for (const block of extractRelationSchemas(code, "zod")) {
    relationNames.set(block.baseName, [
      ...(relationNames.get(block.baseName) ?? []),
      ...block.fields.map((f) => f.name),
    ]);
  }
  const tables = models.map((model) => {
    const primaryKey = new Set(model.primaryKey ?? []);
    return {
      name: model.name,
      dbName: model.dbName ?? model.name,
      description: model.documentation ?? null,
      columns: model.fields.map((field) => {
        const reference = relations.find(
          (r) => r.to.model === model.name && r.to.field === field.name,
        );
        return {
          name: field.name,
          dbName: columnName(model, field.name),
          type: field.type,
          nullable: !field.isRequired,
          primaryKey: field.isId || primaryKey.has(field.name),
          unique: field.isUnique ?? false,
          isList: field.isList,
          enumName: field.kind === "enum" ? field.type : null,
          defaults: [...(field.attributes ?? [])],
          description: field.documentation,
          references: reference
            ? { table: reference.from.model, column: reference.from.field }
            : null,
        };
      }),
      indexes: (model.indexes ?? []).map((index) => ({
        type: index.type,
        columns: [...index.fields],
      })),
      references: referencesOf(model.name, relations),
      referencedBy: referencedByOf(model.name, relations),
      queries: makeQueries({
        model,
        key: keys.get(model.name) ?? [],
        relationNames: relationNames.get(model.name) ?? [],
        enums,
        dialect,
      }),
    };
  });
  return {
    tables,
    enums: enums.map((e) => ({
      name: e.name,
      dbName: e.dbName ?? e.name,
      description: e.documentation ?? null,
      values: e.values.map((v) => v.name),
    })),
  };
}

/**
 * The tables as the data views read and write them: the database names of the table and its
 * columns, and the columns that identify a row — the primary key, else the unique columns, else
 * every column.
 */
export function makeDbTables(input: { readonly source: string }) {
  const { models } = diagramSchema(stripImports(input.source));
  return models.map((model) => {
    const ids = model.primaryKey ?? model.fields.filter((f) => f.isId).map((f) => f.name);
    const unique = model.fields.filter((f) => f.isUnique).map((f) => f.name);
    const key = ids.length > 0 ? ids : unique.length > 0 ? unique : model.fields.map((f) => f.name);
    return {
      name: model.name,
      table: model.dbName ?? model.name,
      columns: model.fields.map((field) => ({
        name: field.name,
        column: columnName(model, field.name),
        type: field.type,
        nullable: !field.isRequired,
      })),
      key: [...key],
    };
  });
}
