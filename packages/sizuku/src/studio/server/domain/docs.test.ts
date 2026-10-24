import { describe, expect, it } from "vite-plus/test";
import type { SchemaField, SchemaModel } from "../../../types/index.js";
import { makeDbTables, makeDocs } from "./docs.js";

function column(name: string, rest: Partial<SchemaField> = {}): SchemaField {
  return {
    name,
    dbName: name,
    kind: "scalar",
    type: "text",
    isList: false,
    isRequired: true,
    isId: false,
    isForeignKey: false,
    documentation: null,
    ...rest,
  };
}

const user: SchemaModel = {
  name: "user",
  dbName: "users",
  primaryKey: null,
  fields: [
    column("id", { type: "integer", isId: true }),
    column("email", { isUnique: true }),
    column("createdAt", { type: "timestamp", attributes: [".defaultNow()"] }),
  ],
};

describe("makeDbTables", () => {
  it("identifies a row by its primary key, else its unique columns, else all of them", () => {
    const noKey = { ...user, fields: user.fields.map((f) => ({ ...f, isId: false })) };
    const bare = { ...noKey, fields: noKey.fields.map((f) => ({ ...f, isUnique: false })) };
    expect(makeDbTables({ models: [user, noKey, bare] }).map((t) => t.key)).toStrictEqual([
      ["id"],
      ["email"],
      ["id", "email", "createdAt"],
    ]);
  });
});

describe("makeDocs", () => {
  const docs = (dialect: "sqlite" | "mysql") =>
    makeDocs({
      models: [user],
      relations: [],
      enums: [],
      relationFields: [{ table: "user", name: "posts", target: "post" }],
      dialect,
    });
  const queries = (dialect: "sqlite" | "mysql") =>
    Object.fromEntries(docs(dialect).tables[0]?.queries.map((q) => [q.name, q.code]) ?? []);

  it("writes the queries against the key, with a value for each column a row needs", () => {
    const sqlite = queries("sqlite");
    expect(sqlite["Find by key"]).toBe("db.select().from(user).where(eq(user.id, 1))");
    // The numeric key is counted up by the database and createdAt has a default.
    expect(sqlite.Insert).toBe(
      'db.insert(user)\n  .values({\n    email: "email",\n  })\n  .returning()',
    );
    expect(sqlite["With relations"]).toBe(
      "db.query.user.findMany({\n  with: { posts: true },\n  limit: 10,\n})",
    );
  });

  it("leaves out returning() for MySQL, which has none", () => {
    expect(queries("mysql").Insert).toBe('db.insert(user)\n  .values({\n    email: "email",\n  })');
  });
});
