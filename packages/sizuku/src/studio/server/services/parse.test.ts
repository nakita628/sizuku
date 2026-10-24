import { describe, expect, it } from "vite-plus/test";
import {
  findSyntaxError,
  findTableSpans,
  parseQuery,
  readQueryNames,
  readRelationFields,
} from "./parse.js";

const schema = `import { integer, sqliteTable } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const user = sqliteTable("users", {
  id: integer("id").primaryKey(),
});

export const post = sqliteTable("posts", {
  id: integer("id").primaryKey(),
  authorId: integer("author_id").notNull(),
});

export const userRelations = relations(user, ({ many }) => ({
  posts: many(post),
}));
`;

describe("findSyntaxError", () => {
  it("is null for a source that parses, and the offset of the first error otherwise", () => {
    expect(findSyntaxError(schema)).toBeNull();
    expect(findSyntaxError("const a = ;")?.offset).toBe(10);
  });
});

describe("findTableSpans", () => {
  it("spans each exported table from `export` to the end of its statement", () => {
    const spans = findTableSpans(schema);
    expect(spans.map((s) => s.name)).toStrictEqual(["user", "post"]);
    const user = spans[0];
    expect(schema.slice(user?.start, user?.end)).toBe(
      'export const user = sqliteTable("users", {\n  id: integer("id").primaryKey(),\n});',
    );
  });
});

describe("readRelationFields", () => {
  it("names each table's relations as relations() gives them, with the table they point at", () => {
    expect(readRelationFields(schema)).toStrictEqual([
      { table: "user", name: "posts", target: "post" },
    ]);
  });
});

describe("parseQuery", () => {
  it("finds the last expression statement in the query's own offsets", () => {
    const code = "const n = 1;\ndb.select().from(user);";
    const { error, last } = parseQuery(code);
    expect(error).toBeNull();
    expect(code.slice(last?.start, last?.end)).toBe("db.select().from(user);");
    expect(code.slice(last?.expression.start, last?.expression.end)).toBe("db.select().from(user)");
  });

  it("has no last expression when the query ends in a declaration", () => {
    expect(parseQuery("const n = 1;")).toStrictEqual({ error: null, last: null });
  });

  it("gives a syntax error at its offset in the query", () => {
    const { error } = parseQuery("a;\nb(");
    expect(error?.offset).toBeGreaterThanOrEqual(3);
    expect(error?.offset).toBeLessThanOrEqual(5);
  });
});

describe("readQueryNames", () => {
  it("reads identifiers, member accesses, db.query tables and with keys, but not property names", () => {
    const names = readQueryNames(
      "const rows = await db.select({ t: post.title }).from(post).where(eq(post.id, 1));\n" +
        "db.query.user.findMany({ with: { posts: { with: { comments: true } } } })",
    );
    expect(names?.names).toEqual(expect.arrayContaining(["rows", "db", "post", "eq"]));
    expect(names?.names).not.toContain("title");
    expect(names?.names).not.toContain("t");
    expect(names?.members).toEqual(
      expect.arrayContaining([
        { object: "post", property: "title" },
        { object: "post", property: "id" },
      ]),
    );
    expect(names?.queries).toStrictEqual(["user"]);
    expect(names?.withs).toStrictEqual(["posts", "comments"]);
  });

  it("is null for code that does not parse", () => {
    expect(readQueryNames("db.select(")).toBeNull();
  });
});
