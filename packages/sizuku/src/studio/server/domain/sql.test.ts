import { describe, expect, it } from "vite-plus/test";
import {
  makeCell,
  makeDeleteStatement,
  makeDialect,
  makeInsertStatement,
  makeRedactedUrl,
  makeCountStatement,
  makeSelectStatement,
  makeSqlitePath,
  makeUpdateStatement,
} from "./sql.js";

const table = {
  table: "post_tags",
  columns: [
    { name: "postId", column: "post_id" },
    { name: "tagId", column: "tag_id" },
    { name: "note", column: "note" },
  ],
  key: ["postId", "tagId"],
};

describe("makeDialect", () => {
  it.each([
    ["postgres://u:p@h/db", "postgresql"],
    ["postgresql://h/db", "postgresql"],
    ["mysql://h/db", "mysql"],
    ["mariadb://h/db", "mysql"],
    ["file:./dev.db", "sqlite"],
    ["./local.sqlite", "sqlite"],
    ["redis://h", null],
  ] as const)("reads %s as %s", (url, dialect) => {
    expect(makeDialect({ url })).toBe(dialect);
  });

  it("finds the SQLite file and hides passwords", () => {
    expect(makeSqlitePath({ url: "file:./dev.db" })).toBe("./dev.db");
    expect(makeSqlitePath({ url: "sqlite://data/app.db" })).toBe("data/app.db");
    expect(makeRedactedUrl({ url: "postgres://admin:s3cr3t@db:5432/app" })).toBe(
      "postgres://admin:****@db:5432/app",
    );
  });
});

describe("statements", () => {
  it("orders a page by the key columns", () => {
    expect(makeSelectStatement({ dialect: "postgresql", table, skip: 20, take: 10 })).toStrictEqual(
      {
        sql: 'SELECT * FROM "post_tags" ORDER BY "post_id", "tag_id" LIMIT $1 OFFSET $2',
        params: [10, 20],
      },
    );
  });

  it("searches every column as text, escaping the wildcards, before the page", () => {
    expect(
      makeSelectStatement({ dialect: "postgresql", table, skip: 0, take: 10, search: "5%_off" }),
    ).toStrictEqual({
      sql:
        'SELECT * FROM "post_tags" WHERE CAST("post_id" AS TEXT) ILIKE $1 ESCAPE \'!\' OR ' +
        "CAST(\"tag_id\" AS TEXT) ILIKE $2 ESCAPE '!' OR CAST(\"note\" AS TEXT) ILIKE $3 ESCAPE '!' " +
        'ORDER BY "post_id", "tag_id" LIMIT $4 OFFSET $5',
      params: ["%5!%!_off%", "%5!%!_off%", "%5!%!_off%", 10, 0],
    });
    expect(makeCountStatement({ dialect: "mysql", table, search: "a" }).sql).toContain(
      "LOWER(CAST(`note` AS CHAR)) LIKE LOWER(?) ESCAPE '!'",
    );
    expect(makeCountStatement({ dialect: "sqlite", table, search: "" })).toStrictEqual({
      sql: 'SELECT COUNT(*) AS count FROM "post_tags"',
      params: [],
    });
  });

  it("numbers the PostgreSQL placeholders past the SET values, skipping IS NULL", () => {
    expect(
      makeUpdateStatement({
        dialect: "postgresql",
        table,
        where: { postId: 1, note: null, tagId: 2 },
        values: { note: "x" },
      }),
    ).toStrictEqual({
      sql: 'UPDATE "post_tags" SET "note" = $1 WHERE "post_id" = $2 AND "note" IS NULL AND "tag_id" = $3',
      params: ["x", 1, 2],
    });
  });

  it("quotes MySQL identifiers with backticks and SQLite booleans as numbers", () => {
    expect(makeDeleteStatement({ dialect: "mysql", table, where: { postId: 1 } })).toStrictEqual({
      sql: "DELETE FROM `post_tags` WHERE `post_id` = ?",
      params: [1],
    });
    expect(makeInsertStatement({ dialect: "sqlite", table, values: { note: true } })).toStrictEqual(
      {
        sql: 'INSERT INTO "post_tags" ("note") VALUES (?)',
        params: [1],
      },
    );
  });

  it("inserts the defaults when no value is given", () => {
    expect(makeInsertStatement({ dialect: "postgresql", table, values: {} }).sql).toBe(
      'INSERT INTO "post_tags" DEFAULT VALUES',
    );
    expect(makeInsertStatement({ dialect: "mysql", table, values: {} }).sql).toBe(
      "INSERT INTO `post_tags` () VALUES ()",
    );
  });

  it("escapes a quote inside an identifier", () => {
    const odd = { ...table, table: 'we"ird' };
    expect(makeDeleteStatement({ dialect: "sqlite", table: odd, where: { postId: 1 } }).sql).toBe(
      'DELETE FROM "we""ird" WHERE "post_id" = ?',
    );
  });
});

describe("makeCell", () => {
  it("turns driver values into what JSON can carry", () => {
    expect(makeCell(new Date("2026-01-02T03:04:05Z"))).toBe("2026-01-02T03:04:05.000Z");
    expect(makeCell(42n)).toBe(42);
    expect(makeCell(2n ** 64n)).toBe("18446744073709551616");
    expect(makeCell(new Uint8Array([0xde, 0xad]))).toBe("\\xdead");
    expect(makeCell({ a: 1 })).toBe('{"a":1}');
    expect(makeCell(undefined)).toBeNull();
    expect(makeCell(Number.NaN)).toBe("NaN");
  });
});
