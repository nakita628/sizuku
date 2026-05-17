// Parses `/// @relation Model.field Model.field type` annotation lines from
// Drizzle schema code and converts the relationship type (e.g. `one-to-many`)
// into Mermaid relation symbols (e.g. `||--}|`). Mirrors the behavior of
// hekireki/packages/hekireki/src/helper/mermaid-er.ts.

type RelationshipType = "zero-one" | "one" | "zero-many" | "many";

const RELATIONSHIPS: Record<RelationshipType, string> = {
  "zero-one": "|o",
  one: "||",
  "zero-many": "}o",
  many: "}|",
};

function isRelationshipType(type: string): type is RelationshipType {
  return type === "zero-one" || type === "one" || type === "zero-many" || type === "many";
}

export type RelationAnnotation = {
  readonly fromModel: string;
  readonly fromField: string;
  readonly toModel: string;
  readonly toField: string;
  readonly type: string;
};

export type AnnotatedRelation = {
  readonly fromModel: string;
  readonly fromField: string;
  readonly toModel: string;
  readonly toField: string;
  readonly symbol: string;
};

// Cardinality enum is matched explicitly (zero-one|one|zero-many|many) on each
// side of `-to-`, because `\w+` does not span hyphens — that would reject
// compound forms like `zero-one-to-many`. An optional `-optional` suffix marks
// dashed relation lines in Mermaid.
const CARDINALITY = "(?:zero-one|one|zero-many|many)";
const RELATION_TYPE = `${CARDINALITY}-to-${CARDINALITY}(?:-optional)?`;
const RELATION_RE = new RegExp(
  String.raw`^@relation\s+(\w+)\.(\w+)\s+(\w+)\.(\w+)\s+(${RELATION_TYPE})$`,
);

export function parseRelation(line: string): RelationAnnotation | null {
  const stripped = line.trim().replace(/^\/\/\/\s*/, "");
  const match = stripped.match(RELATION_RE);
  if (!match) return null;
  const [, fromModel, fromField, toModel, toField, type] = match;
  return { fromModel, fromField, toModel, toField, type };
}

export function makeRelationLine(
  input: string,
): { readonly ok: true; readonly value: string } | { readonly ok: false; readonly error: string } {
  const parts = input.split("-to-");
  if (parts.length !== 2) return { ok: false, error: `Invalid input format: ${input}` };
  const [to, optionalFlag] = parts[1].includes("-optional")
    ? [parts[1].replace("-optional", ""), "optional"]
    : [parts[1], ""];
  const from = parts[0];
  if (!isRelationshipType(from)) return { ok: false, error: `Invalid relationship: ${from}` };
  if (!isRelationshipType(to)) return { ok: false, error: `Invalid relationship: ${to}` };
  return {
    ok: true,
    value: `${RELATIONSHIPS[from]}${optionalFlag === "optional" ? ".." : "--"}${RELATIONSHIPS[to]}`,
  };
}

export function extractRelationsFromAnnotations(
  code: readonly string[],
): readonly AnnotatedRelation[] {
  return code
    .map(parseRelation)
    .filter((r): r is RelationAnnotation => r !== null)
    .flatMap((r) => {
      const result = makeRelationLine(r.type);
      if (!result.ok) return [];
      return [
        {
          fromModel: r.fromModel,
          fromField: r.fromField,
          toModel: r.toModel,
          toField: r.toField,
          symbol: result.value,
        },
      ];
    });
}
