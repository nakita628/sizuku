import { describe, expect, it } from "vite-plus/test";
import { makeQueryBody, makeSchemaDialect } from "./query.js";

describe("makeQueryBody", () => {
  it("returns the last expression statement", () => {
    const code = "const n = 1;\ndb.select().from(user);";
    expect(
      makeQueryBody({
        code,
        error: null,
        last: { start: 13, end: 36, expression: { start: 13, end: 35 } },
      }),
    ).toStrictEqual({ body: "const n = 1;\nreturn (db.select().from(user));", error: null });
  });

  it("leaves a query that ends in another statement as it is", () => {
    expect(makeQueryBody({ code: "const n = 1;", error: null, last: null })).toStrictEqual({
      body: "const n = 1;",
      error: null,
    });
  });

  it("puts a syntax error on the query's own line and column", () => {
    expect(
      makeQueryBody({ code: "a;\nb(", error: { message: "Expected `)`", offset: 5 }, last: null }),
    ).toStrictEqual({ body: null, error: { message: "Expected `)`", line: 2, column: 3 } });
  });
});

describe("makeSchemaDialect", () => {
  it.each([
    ['pgTable("users", {})', "postgresql"],
    ['mysqlTable("users", {})', "mysql"],
    ['sqliteTable("users", {})', "sqlite"],
    ["export const x = 1;", null],
  ] as const)("%s → %s", (source, dialect) => {
    expect(makeSchemaDialect({ source })).toBe(dialect);
  });
});
