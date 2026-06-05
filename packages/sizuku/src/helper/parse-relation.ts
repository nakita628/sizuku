// Parses `/// @relation Model.field Model.field type` annotation lines from
// Drizzle schema code into a structured relation with a cardinality on each
// side. Rendering to Mermaid crow's-foot symbols or DBML operators is the
// responsibility of each generator's output boundary, not this parser
// (Codegen: "emit entries, not strings").

// The cardinality vocabulary is hand-written here (the one runtime/type source);
// the generators derive their key sets from their own symbol tables.
function isCardinality(value: string): value is "zero-one" | "one" | "zero-many" | "many" {
  return value === "zero-one" || value === "one" || value === "zero-many" || value === "many";
}

// The type token must contain `-to-`; `[\w-]+` (unlike `\w+`) spans hyphens so
// compound cardinalities like `zero-one-to-many` are captured whole. The enum
// itself (zero-one|one|zero-many|many) is validated downstream in
// `splitCardinality`, keeping cardinality validation in one place.
const RELATION_RE = new RegExp(
  String.raw`^@relation\s+(\w+)\.(\w+)\s+(\w+)\.(\w+)\s+([\w-]+-to-[\w-]+)$`,
);

export function parseRelation(line: string) {
  const stripped = line.trim().replace(/^\/\/\/\s*/, "");
  const match = stripped.match(RELATION_RE);
  if (!match) return null;
  const [, fromModel, fromField, toModel, toField, type] = match;
  return { fromModel, fromField, toModel, toField, type };
}

// Splits `<from>-to-<to>(-optional)` into the two cardinalities. Only the first
// `-to-` separates the sides; any remainder is rejoined so a malformed type
// (extra `-to-`) is rejected by the cardinality check rather than truncated.
// `-optional` becomes `optional: true` (a non-identifying relation),
// independent of the cardinality values themselves.
const OPTIONAL_SUFFIX = "-optional";

function splitCardinality(type: string) {
  const [from, ...restParts] = type.split("-to-");
  const rest = restParts.join("-to-");
  const optional = rest.endsWith(OPTIONAL_SUFFIX);
  const to = optional ? rest.slice(0, -OPTIONAL_SUFFIX.length) : rest;
  if (!isCardinality(from) || !isCardinality(to)) return null;
  return { fromCard: from, toCard: to, optional };
}

export function extractRelationsFromAnnotations(code: readonly string[]) {
  return code.flatMap((line) => {
    const r = parseRelation(line);
    if (r === null) return [];
    const card = splitCardinality(r.type);
    if (card === null) return [];
    return [
      {
        fromModel: r.fromModel,
        fromField: r.fromField,
        toModel: r.toModel,
        toField: r.toField,
        fromCard: card.fromCard,
        toCard: card.toCard,
        optional: card.optional,
      },
    ];
  });
}
