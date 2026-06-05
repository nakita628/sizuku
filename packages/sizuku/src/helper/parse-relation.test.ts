import { describe, expect, it } from "vite-plus/test";
import { extractRelationsFromAnnotations, parseRelation } from "./parse-relation.js";

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

describe("extractRelationsFromAnnotations", () => {
  it("extracts structured cardinality from valid annotations", () => {
    const code = [
      "/// @relation User.id Post.userId one-to-many",
      "export const user = sqliteTable('user', {",
      "  id: text('id').primaryKey(),",
      "})",
      "",
      "/// @relation User.id Profile.user_id zero-one-to-zero-many-optional",
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
        fromCard: "one",
        toCard: "many",
        optional: false,
      },
      {
        fromModel: "User",
        fromField: "id",
        toModel: "Profile",
        toField: "user_id",
        fromCard: "zero-one",
        toCard: "zero-many",
        optional: true,
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
