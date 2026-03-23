import { describe, expect, it } from "vitest";
import {
  dbmlContent,
  escapeNote,
  formatConstraints,
  generateColumn,
  generateEnum,
  generateRef,
  generateRefName,
  generateTable,
  makeColumnConstraints,
  mapDrizzleType,
} from "./dbml-content.js";

// ============================================================================
// mapDrizzleType
// ============================================================================

describe("mapDrizzleType", () => {
  it("maps serial to serial", () => {
    expect(mapDrizzleType("serial")).toBe("serial");
  });

  it("maps smallserial to smallserial", () => {
    expect(mapDrizzleType("smallserial")).toBe("smallserial");
  });

  it("maps bigserial to bigserial", () => {
    expect(mapDrizzleType("bigserial")).toBe("bigserial");
  });

  it("maps integer to integer", () => {
    expect(mapDrizzleType("integer")).toBe("integer");
  });

  it("maps int to integer", () => {
    expect(mapDrizzleType("int")).toBe("integer");
  });

  it("maps smallint to smallint", () => {
    expect(mapDrizzleType("smallint")).toBe("smallint");
  });

  it("maps bigint to bigint", () => {
    expect(mapDrizzleType("bigint")).toBe("bigint");
  });

  it("maps boolean to boolean", () => {
    expect(mapDrizzleType("boolean")).toBe("boolean");
  });

  it("maps text to text", () => {
    expect(mapDrizzleType("text")).toBe("text");
  });

  it("maps varchar to varchar", () => {
    expect(mapDrizzleType("varchar")).toBe("varchar");
  });

  it("maps char to char", () => {
    expect(mapDrizzleType("char")).toBe("char");
  });

  it("maps numeric to numeric", () => {
    expect(mapDrizzleType("numeric")).toBe("numeric");
  });

  it("maps decimal to decimal", () => {
    expect(mapDrizzleType("decimal")).toBe("decimal");
  });

  it("maps real to real", () => {
    expect(mapDrizzleType("real")).toBe("real");
  });

  it("maps doublePrecision to double precision", () => {
    expect(mapDrizzleType("doublePrecision")).toBe("double precision");
  });

  it("maps json to json", () => {
    expect(mapDrizzleType("json")).toBe("json");
  });

  it("maps jsonb to jsonb", () => {
    expect(mapDrizzleType("jsonb")).toBe("jsonb");
  });

  it("maps timestamp to timestamp", () => {
    expect(mapDrizzleType("timestamp")).toBe("timestamp");
  });

  it("maps timestamptz to timestamptz", () => {
    expect(mapDrizzleType("timestamptz")).toBe("timestamptz");
  });

  it("maps date to date", () => {
    expect(mapDrizzleType("date")).toBe("date");
  });

  it("maps time to time", () => {
    expect(mapDrizzleType("time")).toBe("time");
  });

  it("maps interval to interval", () => {
    expect(mapDrizzleType("interval")).toBe("interval");
  });

  it("maps uuid to uuid", () => {
    expect(mapDrizzleType("uuid")).toBe("uuid");
  });

  it("maps blob to blob", () => {
    expect(mapDrizzleType("blob")).toBe("blob");
  });

  it("maps bytea to bytea", () => {
    expect(mapDrizzleType("bytea")).toBe("bytea");
  });

  it("returns unknown type as-is (fallback)", () => {
    expect(mapDrizzleType("customType")).toBe("customType");
  });
});

// ============================================================================
// escapeNote
// ============================================================================

describe("escapeNote", () => {
  it("escapes single quotes", () => {
    expect(escapeNote("User's email")).toBe("User\\'s email");
  });

  it("escapes multiple single quotes", () => {
    expect(escapeNote("it's a user's note")).toBe("it\\'s a user\\'s note");
  });

  it("returns string without quotes unchanged", () => {
    expect(escapeNote("Primary key")).toBe("Primary key");
  });

  it("handles empty string", () => {
    expect(escapeNote("")).toBe("");
  });
});

// ============================================================================
// makeColumnConstraints
// ============================================================================

describe("makeColumnConstraints", () => {
  it("returns pk for primary key column", () => {
    expect(makeColumnConstraints({ name: "id", type: "serial", isPrimaryKey: true })).toStrictEqual(
      ["pk"],
    );
  });

  it("returns pk and increment for serial primary key", () => {
    expect(
      makeColumnConstraints({ name: "id", type: "serial", isPrimaryKey: true, isIncrement: true }),
    ).toStrictEqual(["pk", "increment"]);
  });

  it("returns unique for unique column", () => {
    expect(makeColumnConstraints({ name: "email", type: "varchar", isUnique: true })).toStrictEqual(
      ["unique"],
    );
  });

  it("returns not null for non-PK not null column", () => {
    expect(
      makeColumnConstraints({ name: "name", type: "varchar", isNotNull: true }),
    ).toStrictEqual(["not null"]);
  });

  it("does not add not null for primary key even if isNotNull is true", () => {
    expect(
      makeColumnConstraints({
        name: "id",
        type: "serial",
        isPrimaryKey: true,
        isNotNull: true,
      }),
    ).toStrictEqual(["pk"]);
  });

  it("includes default value", () => {
    expect(
      makeColumnConstraints({ name: "role", type: "varchar", defaultValue: "'USER'" }),
    ).toStrictEqual(["default: 'USER'"]);
  });

  it("includes note", () => {
    expect(
      makeColumnConstraints({ name: "id", type: "uuid", note: "Primary key" }),
    ).toStrictEqual(["note: 'Primary key'"]);
  });

  it("returns empty array for column with no constraints", () => {
    expect(makeColumnConstraints({ name: "bio", type: "text" })).toStrictEqual([]);
  });

  it("combines all constraints in correct order", () => {
    expect(
      makeColumnConstraints({
        name: "id",
        type: "serial",
        isPrimaryKey: true,
        isIncrement: true,
        isUnique: true,
        defaultValue: "1",
        note: "PK",
      }),
    ).toStrictEqual(["pk", "increment", "unique", "default: 1", "note: 'PK'"]);
  });
});

// ============================================================================
// formatConstraints
// ============================================================================

describe("formatConstraints", () => {
  it("returns empty string for empty array", () => {
    expect(formatConstraints([])).toBe("");
  });

  it("formats single constraint", () => {
    expect(formatConstraints(["pk"])).toBe(" [pk]");
  });

  it("formats multiple constraints with comma separator", () => {
    expect(formatConstraints(["pk", "increment"])).toBe(" [pk, increment]");
  });
});

// ============================================================================
// generateColumn
// ============================================================================

describe("generateColumn", () => {
  it("generates column with pk and increment", () => {
    expect(
      generateColumn({ name: "id", type: "serial", isPrimaryKey: true, isIncrement: true }),
    ).toBe("  id serial [pk, increment]");
  });

  it("generates column without constraints", () => {
    expect(generateColumn({ name: "bio", type: "text" })).toBe("  bio text");
  });

  it("generates column with note", () => {
    expect(generateColumn({ name: "email", type: "varchar", note: "User email" })).toBe(
      "  email varchar [note: 'User email']",
    );
  });

  it("generates column with escaped note", () => {
    expect(generateColumn({ name: "name", type: "text", note: "User's name" })).toBe(
      "  name text [note: 'User\\'s name']",
    );
  });
});

// ============================================================================
// generateTable
// ============================================================================

describe("generateTable", () => {
  it("generates table with multiple columns", () => {
    expect(
      generateTable({
        name: "users",
        columns: [
          { name: "id", type: "serial", isPrimaryKey: true, isIncrement: true },
          { name: "name", type: "text" },
        ],
      }),
    ).toBe("Table users {\n  id serial [pk, increment]\n  name text\n}");
  });

  it("generates table with note", () => {
    expect(
      generateTable({
        name: "config",
        columns: [{ name: "key", type: "text", isPrimaryKey: true }],
        note: "App configuration",
      }),
    ).toBe("Table config {\n  key text [pk]\n\n  Note: 'App configuration'\n}");
  });

  it("generates table with empty columns", () => {
    expect(generateTable({ name: "empty", columns: [] })).toBe("Table empty {\n}");
  });
});

// ============================================================================
// generateEnum
// ============================================================================

describe("generateEnum", () => {
  it("generates enum with multiple values", () => {
    expect(generateEnum({ name: "role", values: ["ADMIN", "USER", "GUEST"] })).toBe(
      "Enum role {\n  ADMIN\n  USER\n  GUEST\n}",
    );
  });

  it("generates enum with single value", () => {
    expect(generateEnum({ name: "status", values: ["ACTIVE"] })).toBe(
      "Enum status {\n  ACTIVE\n}",
    );
  });
});

// ============================================================================
// generateRefName
// ============================================================================

describe("generateRefName", () => {
  it("uses provided name", () => {
    expect(
      generateRefName({
        name: "custom_fk",
        fromTable: "posts",
        fromColumn: "userId",
        toTable: "users",
        toColumn: "id",
      }),
    ).toBe("custom_fk");
  });

  it("generates default name when name is omitted", () => {
    expect(
      generateRefName({
        fromTable: "posts",
        fromColumn: "userId",
        toTable: "users",
        toColumn: "id",
      }),
    ).toBe("posts_userId_users_id_fk");
  });
});

// ============================================================================
// generateRef
// ============================================================================

describe("generateRef", () => {
  it("generates ref with default operator (>)", () => {
    expect(
      generateRef({
        fromTable: "posts",
        fromColumn: "userId",
        toTable: "users",
        toColumn: "id",
      }),
    ).toBe("Ref posts_userId_users_id_fk: posts.userId > users.id");
  });

  it("generates ref with custom operator (<)", () => {
    expect(
      generateRef({
        fromTable: "users",
        fromColumn: "id",
        toTable: "posts",
        toColumn: "userId",
        type: "<",
      }),
    ).toBe("Ref users_id_posts_userId_fk: users.id < posts.userId");
  });

  it("generates ref with one-to-one operator (-)", () => {
    expect(
      generateRef({
        fromTable: "users",
        fromColumn: "id",
        toTable: "profiles",
        toColumn: "userId",
        type: "-",
      }),
    ).toBe("Ref users_id_profiles_userId_fk: users.id - profiles.userId");
  });

  it("generates ref with onDelete action", () => {
    expect(
      generateRef({
        name: "fk_post_user",
        fromTable: "posts",
        fromColumn: "userId",
        toTable: "users",
        toColumn: "id",
        onDelete: "cascade",
      }),
    ).toBe("Ref fk_post_user: posts.userId > users.id [delete: cascade]");
  });

  it("generates ref with onDelete and onUpdate actions", () => {
    expect(
      generateRef({
        name: "fk",
        fromTable: "a",
        fromColumn: "bId",
        toTable: "b",
        toColumn: "id",
        onDelete: "cascade",
        onUpdate: "no action",
      }),
    ).toBe("Ref fk: a.bId > b.id [delete: cascade, update: no action]");
  });
});

// ============================================================================
// dbmlContent (integration - toBe strict)
// ============================================================================

describe("dbmlContent", () => {
  it("generates single table without relations", () => {
    const result = dbmlContent(
      [],
      [
        {
          name: "config",
          fields: [
            { name: "key", type: "text", keyType: "PK", description: null },
            { name: "value", type: "text", keyType: null, description: null },
          ],
        },
      ],
    );
    expect(result).toBe("Table config {\n  key text [pk]\n  value text\n}");
  });

  it("generates tables with relations and descriptions", () => {
    const result = dbmlContent(
      [
        {
          fromModel: "users",
          toModel: "posts",
          fromField: "id",
          toField: "userId",
          isRequired: true,
        },
      ],
      [
        {
          name: "users",
          fields: [
            { name: "id", type: "serial", keyType: "PK", description: "Primary key" },
          ],
        },
        {
          name: "posts",
          fields: [
            { name: "id", type: "serial", keyType: "PK", description: null },
            { name: "userId", type: "integer", keyType: "FK", description: null },
          ],
        },
      ],
    );
    expect(result).toBe(
      [
        "Table users {",
        "  id serial [pk, increment, note: 'Primary key']",
        "}",
        "",
        "Table posts {",
        "  id serial [pk, increment]",
        "  userId integer",
        "}",
        "",
        "Ref posts_userId_users_id_fk: posts.userId > users.id",
      ].join("\n"),
    );
  });
});
