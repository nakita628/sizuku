import { extractRelationsFromSchema } from "./extract-tables.js";

// Builds a single, render-agnostic list of ER relations consumed by both the
// Mermaid and DBML generators. Each relation keeps its cardinality structured
// (not pre-rendered to a symbol string) so each generator can map it to its own
// notation at the output boundary.
//
// `origin` records whether a physical FK backs the relation: a `.references()`
// or `foreignKey()` pair is `inferred`, a pair only a `relations()` block
// declares is `relations` (logical, no constraint in the database). A logical
// relation is non-identifying, so every output draws it dashed.
export function mergeRelations(code: readonly string[]) {
  // Parent side is exactly one; child side is one-or-more when the FK column is
  // NOT NULL, else zero-or-more. `as const` keeps the `cardinality` / `origin`
  // literals from widening to `string`.
  return extractRelationsFromSchema(code).map(
    (r) =>
      ({
        from: { model: r.fromModel, field: r.fromField, cardinality: "one" },
        to: {
          model: r.toModel,
          field: r.toField,
          cardinality: r.isRequired ? "many" : "zero-many",
        },
        identifying: r.enforced,
        origin: r.enforced ? "inferred" : "relations",
      }) as const,
  );
}
