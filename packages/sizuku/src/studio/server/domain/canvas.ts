import { diagramSchema, tableCalls } from "../../../helper/index.js";
import { parseSource } from "../../../helper/ast.js";
import { stripImports } from "../../../utils/index.js";
import { makePosition } from "./parse.js";

/**
 * The schema as the diagram canvas draws it: the cards and edges `diagramSchema` finds, each
 * relation keyed for its edge, and each table with the lines it is declared on, so the editor
 * can say which card the cursor is in.
 */
export function makeCanvasSchema(input: { readonly source: string }) {
  const { models, relations, enums } = diagramSchema(stripImports(input.source));
  // The lines are read from the whole file, imports included, as the editor numbers them.
  const { program, text } = parseSource(input.source.split("\n"));
  const lines = new Map(
    tableCalls(program, text).map(({ varName, start, end }) => [
      varName,
      {
        start: makePosition({ source: text, offset: start }).line,
        end: makePosition({ source: text, offset: end }).line,
      },
    ]),
  );
  return {
    models: models.map((model) => ({
      name: model.name,
      dbName: model.dbName,
      documentation: model.documentation ?? null,
      primaryKey: model.primaryKey === null ? null : [...model.primaryKey],
      fields: model.fields.map((field) => ({
        name: field.name,
        dbName: field.dbName ?? null,
        kind: field.kind === "enum" ? ("enum" as const) : ("scalar" as const),
        type: field.type,
        isList: field.isList,
        isRequired: field.isRequired,
        isId: field.isId,
        isUnique: field.isUnique ?? false,
        isForeignKey: field.isForeignKey,
        documentation: field.documentation,
        attributes: [...(field.attributes ?? [])],
      })),
      indexes: (model.indexes ?? []).map((index) => ({
        type: index.type,
        fields: [...index.fields],
      })),
      lines: lines.get(model.name) ?? { start: 1, end: 1 },
    })),
    relations: relations.map((relation) => ({
      id: `${relation.from.model}.${relation.from.field}->${relation.to.model}.${relation.to.field}`,
      origin: relation.origin,
      name: relation.name ?? null,
      onDelete: relation.onDelete,
      onUpdate: relation.onUpdate ?? null,
      from: { ...relation.from },
      to: { ...relation.to },
    })),
    enums: enums.map((value) => ({
      name: value.name,
      dbName: value.dbName,
      documentation: value.documentation ?? null,
      values: value.values.map((v) => ({ name: v.name, dbName: v.dbName })),
    })),
  };
}
