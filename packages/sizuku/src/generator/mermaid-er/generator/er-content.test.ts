import { describe, expect, it } from "vite-plus/test";
import type { MergedSchema } from "../../../helper/runtime/types.js";
import {
  erContent,
  erContentFromMergedSchema,
  makeRelationLine,
  removeDuplicateRelations,
  simplifyType,
} from ".";

// ============================================================================
// simplifyType
// ============================================================================

describe("simplifyType", () => {
  it("maps integer to int", () => {
    expect(simplifyType("integer")).toBe("int");
  });

  it("maps int to int", () => {
    expect(simplifyType("int")).toBe("int");
  });

  it("maps bigint to int", () => {
    expect(simplifyType("bigint")).toBe("int");
  });

  it("maps smallint to int", () => {
    expect(simplifyType("smallint")).toBe("int");
  });

  it("maps serial to int", () => {
    expect(simplifyType("serial")).toBe("int");
  });

  it("maps bigserial to int", () => {
    expect(simplifyType("bigserial")).toBe("int");
  });

  it("maps varchar to string", () => {
    expect(simplifyType("varchar")).toBe("string");
  });

  it("maps varchar(255) to string", () => {
    expect(simplifyType("varchar(255)")).toBe("string");
  });

  it("maps text to string", () => {
    expect(simplifyType("text")).toBe("string");
  });

  it("maps char to string", () => {
    expect(simplifyType("char")).toBe("string");
  });

  it("maps char(1) to string", () => {
    expect(simplifyType("char(1)")).toBe("string");
  });

  it("maps uuid to uuid", () => {
    expect(simplifyType("uuid")).toBe("uuid");
  });

  it("maps UUID (uppercase) to uuid", () => {
    expect(simplifyType("UUID")).toBe("uuid");
  });

  it("maps boolean to boolean", () => {
    expect(simplifyType("boolean")).toBe("boolean");
  });

  it("maps bool to boolean", () => {
    expect(simplifyType("bool")).toBe("boolean");
  });

  it("maps timestamp to datetime", () => {
    expect(simplifyType("timestamp")).toBe("datetime");
  });

  it("maps timestamptz to datetime", () => {
    expect(simplifyType("timestamptz")).toBe("datetime");
  });

  it("maps date to datetime", () => {
    expect(simplifyType("date")).toBe("datetime");
  });

  it("maps time to datetime", () => {
    expect(simplifyType("time")).toBe("datetime");
  });

  it("maps json to json", () => {
    expect(simplifyType("json")).toBe("json");
  });

  it("maps jsonb to json", () => {
    expect(simplifyType("jsonb")).toBe("json");
  });

  it("maps float to float", () => {
    expect(simplifyType("float")).toBe("float");
  });

  it("maps double to float", () => {
    expect(simplifyType("double")).toBe("float");
  });

  it("maps double precision to float", () => {
    expect(simplifyType("double precision")).toBe("float");
  });

  it("maps decimal to float", () => {
    expect(simplifyType("decimal")).toBe("float");
  });

  it("maps decimal(10,2) to float", () => {
    expect(simplifyType("decimal(10,2)")).toBe("float");
  });

  it("returns unknown type as-is", () => {
    expect(simplifyType("bytea")).toBe("bytea");
  });

  it("returns custom type as-is (no match)", () => {
    expect(simplifyType("bytea")).toBe("bytea");
  });

  it("maps citext to string (contains 'text')", () => {
    expect(simplifyType("citext")).toBe("string");
  });
});

// ============================================================================
// makeRelationLine
// ============================================================================

describe("makeRelationLine", () => {
  it("generates required relation with }| (many)", () => {
    expect(
      makeRelationLine({
        fromModel: "user",
        toModel: "post",
        fromField: "id",
        toField: "userId",
        isRequired: true,
      }),
    ).toBe('    user ||--}| post : "(id) - (userId)"');
  });

  it("generates optional relation with }o (zero-many)", () => {
    expect(
      makeRelationLine({
        fromModel: "user",
        toModel: "profile",
        fromField: "id",
        toField: "userId",
        isRequired: false,
      }),
    ).toBe('    user ||--}o profile : "(id) - (userId)"');
  });
});

// ============================================================================
// removeDuplicateRelations
// ============================================================================

describe("removeDuplicateRelations", () => {
  it("returns empty array for empty input", () => {
    expect(removeDuplicateRelations([])).toStrictEqual([]);
  });

  it("returns same array when no duplicates", () => {
    expect(removeDuplicateRelations(["a", "b", "c"])).toStrictEqual(["a", "b", "c"]);
  });

  it("removes duplicate relation lines", () => {
    expect(removeDuplicateRelations(["a", "b", "a", "c", "b"])).toStrictEqual(["a", "b", "c"]);
  });

  it("preserves single element", () => {
    expect(removeDuplicateRelations(["only"])).toStrictEqual(["only"]);
  });
});

// ============================================================================
// erContent
// ============================================================================

describe("erContent", () => {
  it("generates ER with relations and tables (toBe strict)", () => {
    const result = erContent(
      [
        {
          fromModel: "user",
          fromField: "id",
          toModel: "post",
          toField: "userId",
          isRequired: true,
        },
      ],
      [
        {
          name: "user",
          fields: [
            { name: "id", type: "varchar", keyType: "PK", description: "Primary key" },
            { name: "name", type: "varchar", keyType: null, description: "Display name" },
          ],
        },
        {
          name: "post",
          fields: [
            { name: "id", type: "varchar", keyType: "PK", description: "Primary key" },
            { name: "title", type: "varchar", keyType: null, description: "Article title" },
            {
              name: "userId",
              type: "varchar",
              keyType: "FK",
              description: "Foreign key referencing User.id",
            },
          ],
        },
      ],
    );

    expect(result).toBe(
      [
        "```mermaid",
        "erDiagram",
        '    user ||--}| post : "(id) - (userId)"',
        "    user {",
        '        varchar id PK "Primary key"',
        '        varchar name "Display name"',
        "    }",
        "    post {",
        '        varchar id PK "Primary key"',
        '        varchar title "Article title"',
        '        varchar userId FK "Foreign key referencing User.id"',
        "    }",
        "```",
      ].join("\n"),
    );
  });

  it("generates ER with tables only (no relations)", () => {
    const result = erContent(
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

    expect(result).toBe(
      [
        "```mermaid",
        "erDiagram",
        "    config {",
        "        text key PK",
        "        text value",
        "    }",
        "```",
      ].join("\n"),
    );
  });

  it("generates ER with optional relation (zero-many)", () => {
    const result = erContent(
      [
        {
          fromModel: "user",
          fromField: "id",
          toModel: "profile",
          toField: "userId",
          isRequired: false,
        },
      ],
      [
        {
          name: "user",
          fields: [{ name: "id", type: "uuid", keyType: "PK", description: null }],
        },
        {
          name: "profile",
          fields: [{ name: "userId", type: "uuid", keyType: "FK", description: null }],
        },
      ],
    );

    expect(result).toBe(
      [
        "```mermaid",
        "erDiagram",
        '    user ||--}o profile : "(id) - (userId)"',
        "    user {",
        "        uuid id PK",
        "    }",
        "    profile {",
        "        uuid userId FK",
        "    }",
        "```",
      ].join("\n"),
    );
  });

  it("generates ER with empty table (no fields)", () => {
    const result = erContent([], [{ name: "empty", fields: [] }]);

    expect(result).toBe(["```mermaid", "erDiagram", "    empty {", "    }", "```"].join("\n"));
  });
});

// ============================================================================
// erContentFromMergedSchema (toBe strict)
// ============================================================================

describe("erContentFromMergedSchema", () => {
  it("generates ER content from MergedSchema with FK relations (toBe strict)", () => {
    const schema: MergedSchema = {
      dialect: "pg",
      tables: [
        {
          name: "user",
          tableName: "user",
          dialect: "pg",
          columns: [
            {
              name: "id",
              sqlType: "uuid",
              isPrimaryKey: true,
              isNotNull: true,
              isUnique: false,
              hasDefault: true,
              annotations: [],
            },
            {
              name: "name",
              sqlType: "varchar(255)",
              isPrimaryKey: false,
              isNotNull: true,
              isUnique: false,
              hasDefault: false,
              annotations: [{ type: "description", key: "description", value: "Display name" }],
            },
          ],
          foreignKeys: [],
          annotations: [],
        },
        {
          name: "post",
          tableName: "post",
          dialect: "pg",
          columns: [
            {
              name: "id",
              sqlType: "uuid",
              isPrimaryKey: true,
              isNotNull: true,
              isUnique: false,
              hasDefault: true,
              annotations: [],
            },
            {
              name: "userId",
              sqlType: "uuid",
              isPrimaryKey: false,
              isNotNull: true,
              isUnique: false,
              hasDefault: false,
              annotations: [],
            },
          ],
          foreignKeys: [
            {
              sourceTable: "post",
              sourceColumns: ["userId"],
              foreignTable: "user",
              foreignColumns: ["id"],
            },
          ],
          annotations: [],
        },
      ],
      relations: [],
      enums: [],
    };

    const result = erContentFromMergedSchema(schema);

    expect(result).toBe(
      [
        "```mermaid",
        "erDiagram",
        '    user ||--}| post : "(id) - (userId)"',
        "    user {",
        "        uuid id PK",
        '        string name "Display name"',
        "    }",
        "    post {",
        "        uuid id PK",
        "        uuid userId FK",
        "    }",
        "```",
      ].join("\n"),
    );
  });

  it("generates ER content with relations() function relations", () => {
    const schema: MergedSchema = {
      dialect: "pg",
      tables: [
        {
          name: "author",
          tableName: "author",
          dialect: "pg",
          columns: [
            {
              name: "id",
              sqlType: "integer",
              isPrimaryKey: true,
              isNotNull: true,
              isUnique: false,
              hasDefault: true,
              annotations: [],
            },
          ],
          foreignKeys: [],
          annotations: [],
        },
        {
          name: "book",
          tableName: "book",
          dialect: "pg",
          columns: [
            {
              name: "id",
              sqlType: "integer",
              isPrimaryKey: true,
              isNotNull: true,
              isUnique: false,
              hasDefault: true,
              annotations: [],
            },
            {
              name: "authorId",
              sqlType: "integer",
              isPrimaryKey: false,
              isNotNull: true,
              isUnique: false,
              hasDefault: false,
              annotations: [],
            },
          ],
          foreignKeys: [],
          annotations: [],
        },
      ],
      relations: [
        {
          type: "one",
          sourceTable: "book",
          referencedTable: "author",
          sourceColumns: ["authorId"],
          foreignColumns: ["id"],
          relationName: "bookToAuthor",
        },
      ],
      enums: [],
    };

    const result = erContentFromMergedSchema(schema);

    expect(result).toBe(
      [
        "```mermaid",
        "erDiagram",
        '    author ||--}| book : "(id) - (authorId)"',
        "    author {",
        "        int id PK",
        "    }",
        "    book {",
        "        int id PK",
        "        int authorId",
        "    }",
        "```",
      ].join("\n"),
    );
  });

  it("generates ER with optional FK (nullable column)", () => {
    const schema: MergedSchema = {
      dialect: "pg",
      tables: [
        {
          name: "department",
          tableName: "department",
          dialect: "pg",
          columns: [
            {
              name: "id",
              sqlType: "integer",
              isPrimaryKey: true,
              isNotNull: true,
              isUnique: false,
              hasDefault: true,
              annotations: [],
            },
          ],
          foreignKeys: [],
          annotations: [],
        },
        {
          name: "employee",
          tableName: "employee",
          dialect: "pg",
          columns: [
            {
              name: "id",
              sqlType: "integer",
              isPrimaryKey: true,
              isNotNull: true,
              isUnique: false,
              hasDefault: true,
              annotations: [],
            },
            {
              name: "departmentId",
              sqlType: "integer",
              isPrimaryKey: false,
              isNotNull: false,
              isUnique: false,
              hasDefault: false,
              annotations: [],
            },
          ],
          foreignKeys: [
            {
              sourceTable: "employee",
              sourceColumns: ["departmentId"],
              foreignTable: "department",
              foreignColumns: ["id"],
            },
          ],
          annotations: [],
        },
      ],
      relations: [],
      enums: [],
    };

    const result = erContentFromMergedSchema(schema);

    // nullable FK → }o (zero-many)
    expect(result).toBe(
      [
        "```mermaid",
        "erDiagram",
        '    department ||--}o employee : "(id) - (departmentId)"',
        "    department {",
        "        int id PK",
        "    }",
        "    employee {",
        "        int id PK",
        "        int departmentId FK",
        "    }",
        "```",
      ].join("\n"),
    );
  });
});
