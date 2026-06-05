import { describe, expect, it } from "vite-plus/test";
import { mergeRelations } from "./merge-relations.js";

describe("mergeRelations", () => {
  it("maps an inferred required FK to one / many, identifying, origin inferred", () => {
    const code = [
      "export const user = mysqlTable('user', {",
      "  id: varchar('id', { length: 36 }).primaryKey(),",
      "})",
      "export const post = mysqlTable('post', {",
      "  id: varchar('id', { length: 36 }).primaryKey(),",
      "  userId: varchar('user_id', { length: 36 }).notNull().references(() => user.id),",
      "})",
    ];
    expect(mergeRelations(code)).toStrictEqual([
      {
        from: { model: "user", field: "id", cardinality: "one" },
        to: { model: "post", field: "userId", cardinality: "many" },
        identifying: true,
        origin: "inferred",
      },
    ]);
  });

  it("maps a nullable inferred FK to one / zero-many", () => {
    const code = [
      "export const user = mysqlTable('user', {",
      "  id: varchar('id', { length: 36 }).primaryKey(),",
      "})",
      "export const post = mysqlTable('post', {",
      "  id: varchar('id', { length: 36 }).primaryKey(),",
      "  userId: varchar('user_id', { length: 36 }).references(() => user.id),",
      "})",
    ];
    expect(mergeRelations(code)).toStrictEqual([
      {
        from: { model: "user", field: "id", cardinality: "one" },
        to: { model: "post", field: "userId", cardinality: "zero-many" },
        identifying: true,
        origin: "inferred",
      },
    ]);
  });

  it("maps an annotation-only relation (no FK) to its declared cardinality, origin annotated", () => {
    const code = [
      "/// @relation User.id Profile.user_id zero-one-to-many-optional",
      "export const User = sqliteTable('User', {",
      "  id: text('id').notNull().primaryKey(),",
      "})",
      "export const Profile = sqliteTable('Profile', {",
      "  id: text('id').notNull().primaryKey(),",
      "  user_id: text('user_id').notNull(),",
      "})",
    ];
    expect(mergeRelations(code)).toStrictEqual([
      {
        from: { model: "User", field: "id", cardinality: "zero-one" },
        to: { model: "Profile", field: "user_id", cardinality: "many" },
        identifying: false,
        origin: "annotated",
      },
    ]);
  });

  it("lets an annotation refine an existing FK's cardinality while keeping origin inferred", () => {
    const code = [
      "/// @relation user.id post.userId one-to-zero-many",
      "export const user = mysqlTable('user', {",
      "  id: varchar('id', { length: 36 }).primaryKey(),",
      "})",
      "export const post = mysqlTable('post', {",
      "  id: varchar('id', { length: 36 }).primaryKey(),",
      "  userId: varchar('user_id', { length: 36 }).notNull().references(() => user.id),",
      "})",
    ];
    expect(mergeRelations(code)).toStrictEqual([
      {
        from: { model: "user", field: "id", cardinality: "one" },
        to: { model: "post", field: "userId", cardinality: "zero-many" },
        identifying: true,
        origin: "inferred",
      },
    ]);
  });

  it("keeps the last annotation when the same pair is declared twice (last-wins)", () => {
    const code = [
      "/// @relation User.id Post.userId one-to-many",
      "/// @relation User.id Post.userId one-to-zero-many",
      "export const User = sqliteTable('User', {",
      "  id: text('id').primaryKey(),",
      "})",
      "export const Post = sqliteTable('Post', {",
      "  userId: text('user_id').notNull(),",
      "})",
    ];
    expect(mergeRelations(code)).toStrictEqual([
      {
        from: { model: "User", field: "id", cardinality: "one" },
        to: { model: "Post", field: "userId", cardinality: "zero-many" },
        identifying: true,
        origin: "annotated",
      },
    ]);
  });

  it("preserves the source order of multiple inferred FKs", () => {
    const code = [
      "export const user = mysqlTable('user', {",
      "  id: varchar('id', { length: 36 }).primaryKey(),",
      "})",
      "export const post = mysqlTable('post', {",
      "  id: varchar('id', { length: 36 }).primaryKey(),",
      "  userId: varchar('user_id', { length: 36 }).notNull().references(() => user.id),",
      "})",
      "export const comment = mysqlTable('comment', {",
      "  id: varchar('id', { length: 36 }).primaryKey(),",
      "  postId: varchar('post_id', { length: 36 }).notNull().references(() => post.id),",
      "})",
    ];
    expect(mergeRelations(code)).toStrictEqual([
      {
        from: { model: "user", field: "id", cardinality: "one" },
        to: { model: "post", field: "userId", cardinality: "many" },
        identifying: true,
        origin: "inferred",
      },
      {
        from: { model: "post", field: "id", cardinality: "one" },
        to: { model: "comment", field: "postId", cardinality: "many" },
        identifying: true,
        origin: "inferred",
      },
    ]);
  });

  it("orders inferred relations first and appends annotation-only relations last", () => {
    const code = [
      "/// @relation Tag.id Article.tag_id zero-one-to-many-optional",
      "export const user = mysqlTable('user', {",
      "  id: varchar('id', { length: 36 }).primaryKey(),",
      "})",
      "export const Article = mysqlTable('Article', {",
      "  id: varchar('id', { length: 36 }).primaryKey(),",
      "  userId: varchar('user_id', { length: 36 }).notNull().references(() => user.id),",
      "  tag_id: varchar('tag_id', { length: 36 }).notNull(),",
      "})",
    ];
    expect(mergeRelations(code)).toStrictEqual([
      {
        from: { model: "user", field: "id", cardinality: "one" },
        to: { model: "Article", field: "userId", cardinality: "many" },
        identifying: true,
        origin: "inferred",
      },
      {
        from: { model: "Tag", field: "id", cardinality: "zero-one" },
        to: { model: "Article", field: "tag_id", cardinality: "many" },
        identifying: false,
        origin: "annotated",
      },
    ]);
  });
});
