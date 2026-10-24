import { describe, expect, it } from "vite-plus/test";
import { inlineParams } from "./inline.js";

describe("inlineParams", () => {
  it("writes the values of ? in turn, quoting strings and leaving quoted text alone", () => {
    expect(
      inlineParams(
        `select "a?" from "t" where x = ? and y = ? and z = ?`,
        ["it's", 2, null],
        "sqlite",
      ),
    ).toBe(`select "a?" from "t" where x = 'it''s' and y = 2 and z = NULL`);
  });

  it("writes PostgreSQL's numbered placeholders, $10 included, and its booleans", () => {
    const params = [true, ...Array.from({ length: 9 }, (_, i) => i + 2)];
    expect(inlineParams("select $1, $10, $11", params, "postgresql")).toBe("select TRUE, 10, $11");
  });

  it("writes MySQL's booleans as numbers and objects as JSON text", () => {
    expect(inlineParams("insert into t values (?, ?)", [false, { a: 1 }], "mysql")).toBe(
      `insert into t values (0, '{"a":1}')`,
    );
  });
});
