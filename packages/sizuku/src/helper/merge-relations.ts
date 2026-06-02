import { extractRelationsFromSchema } from "./extract-tables.js";
import { extractRelationsFromAnnotations } from "./parse-relation.js";

// Builds a single, render-agnostic list of ER relations consumed by both the
// Mermaid and DBML generators. Each relation keeps its cardinality structured
// (not pre-rendered to a symbol string) so each generator can map it to its own
// notation at the output boundary.
//
// `origin` records whether a physical FK backs the relation: a pair present in
// the inferred set is `inferred` (physical FK), a pair declared only by a
// `/// @relation` annotation is `annotated` (logical, no physical FK). When a
// pair appears in both, the inferred FK exists so `origin` stays `inferred`
// while the annotation's richer cardinality still wins.
const key = (r: {
  readonly from: { readonly model: string; readonly field: string };
  readonly to: { readonly model: string; readonly field: string };
}) => `${r.from.model}.${r.from.field}->${r.to.model}.${r.to.field}`;

export function mergeRelations(code: readonly string[]) {
  // Inferred FK: parent side is exactly one; child side is one-or-more when the
  // FK column is NOT NULL, else zero-or-more. Inferred relations are always
  // identifying (solid line), matching the prior generator behavior. `as const`
  // keeps the `cardinality` / `origin` literals from widening to `string`.
  const inferred = extractRelationsFromSchema(code).map(
    (r) =>
      ({
        from: { model: r.fromModel, field: r.fromField, cardinality: "one" },
        to: {
          model: r.toModel,
          field: r.toField,
          cardinality: r.isRequired ? "many" : "zero-many",
        },
        identifying: true,
        origin: "inferred",
      }) as const,
  );

  const annotated = extractRelationsFromAnnotations(code).map(
    (r) =>
      ({
        from: { model: r.fromModel, field: r.fromField, cardinality: r.fromCard },
        to: { model: r.toModel, field: r.toField, cardinality: r.toCard },
        identifying: !r.optional,
        origin: "annotated",
      }) as const,
  );

  const inferredKeys = new Set(inferred.map(key));

  // The Map constructor sets entries in order: inferred relations seed the
  // insertion order, a later annotation for the same pair overwrites the value
  // in place (origin stays `inferred` because a physical FK exists), and
  // annotation-only pairs append at the end (duplicate annotations are
  // last-wins). Equivalent to a two-pass build, with no mutation in a loop.
  const merged = new Map([
    ...inferred.map((r) => [key(r), r] as const),
    ...annotated.map(
      (r) =>
        [key(r), inferredKeys.has(key(r)) ? ({ ...r, origin: "inferred" } as const) : r] as const,
    ),
  ]);

  return [...merged.values()];
}
