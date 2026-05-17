import { describe, expect, it } from "vite-plus/test";
import {
  extractRelationsFromAnnotations,
  makeRelationLine,
  parseRelation,
} from "./parse-relation.js";

describe("parseRelation", () => {
  it("parses full one-to-one form", () => {
    expect(parseRelation("/// @relation User.id Profile.user_id one-to-one")).toStrictEqual({
      fromModel: "User",
      fromField: "id",
      toModel: "Profile",
      toField: "user_id",
      type: "one-to-one",
    });
  });

  it("parses full one-to-many form", () => {
    expect(parseRelation("/// @relation User.id Post.userId one-to-many")).toStrictEqual({
      fromModel: "User",
      fromField: "id",
      toModel: "Post",
      toField: "userId",
      type: "one-to-many",
    });
  });

  it("parses zero-one-to-many-optional", () => {
    expect(
      parseRelation("/// @relation User.id Profile.user_id zero-one-to-many-optional"),
    ).toStrictEqual({
      fromModel: "User",
      fromField: "id",
      toModel: "Profile",
      toField: "user_id",
      type: "zero-one-to-many-optional",
    });
  });

  it("accepts lines without leading /// prefix", () => {
    expect(parseRelation("@relation Team.id TeamMember.team_id one-to-many")).toStrictEqual({
      fromModel: "Team",
      fromField: "id",
      toModel: "TeamMember",
      toField: "team_id",
      type: "one-to-many",
    });
  });

  it("returns null for short form (cardinality only)", () => {
    expect(parseRelation("/// @relation one-to-many")).toBeNull();
  });

  it("returns null for non-annotation lines", () => {
    expect(parseRelation("  id: text('id').primaryKey(),")).toBeNull();
  });
});

describe("makeRelationLine", () => {
  const cases = [
    { input: "zero-one-to-zero-one", expected: "|o--|o" },
    { input: "zero-one-to-one", expected: "|o--||" },
    { input: "zero-one-to-zero-many", expected: "|o--}o" },
    { input: "zero-one-to-many", expected: "|o--}|" },
    { input: "zero-one-to-zero-one-optional", expected: "|o..|o" },
    { input: "one-to-zero-one", expected: "||--|o" },
    { input: "one-to-one", expected: "||--||" },
    { input: "one-to-zero-many", expected: "||--}o" },
    { input: "one-to-many", expected: "||--}|" },
    { input: "one-to-one-optional", expected: "||..||" },
    { input: "many-to-zero-one", expected: "}|--|o" },
    { input: "many-to-one", expected: "}|--||" },
    { input: "many-to-many", expected: "}|--}|" },
    { input: "many-to-many-optional", expected: "}|..}|" },
  ];
  it.each(cases)("converts $input to $expected", ({ input, expected }) => {
    const result = makeRelationLine(input);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(expected);
    }
  });

  it("returns error for invalid input format", () => {
    const result = makeRelationLine("invalid");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Invalid input format: invalid");
    }
  });

  it("returns error for invalid from relationship", () => {
    const result = makeRelationLine("invalid-to-one");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Invalid relationship: invalid");
    }
  });

  it("returns error for invalid to relationship", () => {
    const result = makeRelationLine("one-to-invalid");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Invalid relationship: invalid");
    }
  });
});

describe("extractRelationsFromAnnotations", () => {
  it("extracts all valid annotations from code lines", () => {
    const code = [
      "/// @relation User.id Post.userId one-to-many",
      "export const user = sqliteTable('user', {",
      "  id: text('id').primaryKey(),",
      "})",
      "",
      "/// @relation User.id Profile.user_id one-to-one",
      "export const profile = sqliteTable('profile', {",
      "  user_id: text('user_id').notNull(),",
      "})",
    ];

    expect(extractRelationsFromAnnotations(code)).toStrictEqual([
      {
        fromModel: "User",
        fromField: "id",
        toModel: "Post",
        toField: "userId",
        symbol: "||--}|",
      },
      {
        fromModel: "User",
        fromField: "id",
        toModel: "Profile",
        toField: "user_id",
        symbol: "||--||",
      },
    ]);
  });

  it("returns empty array when no annotations are present", () => {
    const code = [
      "export const user = sqliteTable('user', {",
      "  id: text('id').primaryKey(),",
      "})",
    ];
    expect(extractRelationsFromAnnotations(code)).toStrictEqual([]);
  });

  it("ignores annotations with invalid cardinality types", () => {
    const code = ["/// @relation User.id Post.userId bogus-to-many"];
    expect(extractRelationsFromAnnotations(code)).toStrictEqual([]);
  });
});
