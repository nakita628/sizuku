import { diagramSchema } from "../../../helper/index.js";
import type { Cardinality, SchemaModel, SchemaRelation } from "../../../types/index.js";
import { stripImports } from "../../../utils/index.js";

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
export function makeDocs(input: { readonly source: string }) {
  const { models, relations, enums } = diagramSchema(stripImports(input.source));
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
