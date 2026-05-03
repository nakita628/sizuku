import { describe, expect, it } from "vite-plus/test";
import {
  extractFieldComments,
  fieldDefinitions,
  makeCapitalized,
  makeRelationFields,
  parseFieldComments,
  resolveWrapperType,
} from "./index";

// Test run
// pnpm vitest run ./src/utils/index.test.ts

describe("utils", () => {
  describe("makeCapitalized", () => {
    it.concurrent("makeCapitalized", () => {
      expect(makeCapitalized("user")).toBe("User");
    });
  });

  describe("parseFieldComments", () => {
    it.concurrent("parseFieldComments", () => {
      expect(
        parseFieldComments(
          ["/// Primary key", "/// @z.uuid()", "/// @v.pipe(v.string(), v.uuid())"],
          "@z.",
        ),
      ).toStrictEqual({
        definition: "z.uuid()",
        description: "Primary key",
        objectType: undefined,
      });
      expect(
        parseFieldComments(
          ["/// Primary key", "/// @z.uuid()", "/// @v.pipe(v.string(), v.uuid())"],
          "@v.",
        ),
      ).toStrictEqual({
        definition: "v.pipe(v.string(), v.uuid())",
        description: "Primary key",
        objectType: undefined,
      });
    });

    it.concurrent("parseFieldComments with strictObject", () => {
      expect(
        parseFieldComments(["/// @z.strictObject", "/// Primary key", "/// @z.uuid()"], "@z."),
      ).toStrictEqual({ definition: "z.uuid()", description: "Primary key", objectType: "strict" });
      expect(
        parseFieldComments(
          ["/// @v.strictObject", "/// Primary key", "/// @v.pipe(v.string(), v.uuid())"],
          "@v.",
        ),
      ).toStrictEqual({
        definition: "v.pipe(v.string(), v.uuid())",
        description: "Primary key",
        objectType: "strict",
      });
    });

    it.concurrent("parseFieldComments with looseObject", () => {
      expect(
        parseFieldComments(["/// @z.looseObject", "/// Primary key", "/// @z.uuid()"], "@z."),
      ).toStrictEqual({ definition: "z.uuid()", description: "Primary key", objectType: "loose" });
      expect(
        parseFieldComments(
          ["/// @v.looseObject", "/// Primary key", "/// @v.pipe(v.string(), v.uuid())"],
          "@v.",
        ),
      ).toStrictEqual({
        definition: "v.pipe(v.string(), v.uuid())",
        description: "Primary key",
        objectType: "loose",
      });
    });
  });

  describe("extractFieldComments", () => {
    it.concurrent("extractFieldComments", () => {
      const sourceText = `export const user = mysqlTable('user', {
  /// Primary key
  /// @z.uuid()
  /// @v.pipe(v.string(), v.uuid())
  id: varchar('id', { length: 36 }).primaryKey(),
  /// Display name
  /// @z.string().min(1).max(50)
  /// @v.pipe(v.string(), v.minLength(1), v.maxLength(50))
  name: varchar('name', { length: 50 }).notNull(),
})

/// @relation user.id post.userId one-to-many
export const post = mysqlTable('post', {
  /// Primary key
  /// @z.uuid()
  /// @v.pipe(v.string(), v.uuid())
  id: varchar('id', { length: 36 }).primaryKey(),
  /// Article title
  /// @z.string().min(1).max(100)
  /// @v.pipe(v.string(), v.minLength(1), v.maxLength(100))
  title: varchar('title', { length: 100 }).notNull(),
  /// Body content (no length limit)
  /// @z.string().min(1).max(65535)
  /// @v.pipe(v.string(), v.minLength(1), v.maxLength(65535))
  content: varchar('content', { length: 65535 }).notNull(),
  /// Foreign key referencing User.id
  /// @z.uuid()
  /// @v.pipe(v.string(), v.uuid())
  userId: varchar('user_id', { length: 36 }).notNull(),
})

export const userRelations = relations(user, ({ many }) => ({
  posts: many(post),
}))

export const postRelations = relations(post, ({ one }) => ({
  user: one(user, {
    fields: [post.userId],
    references: [user.id],
  }),
}))
`;
      const fieldStartPos = 113;
      const result = extractFieldComments(sourceText, fieldStartPos);
      expect(result).toStrictEqual([
        "/// Primary key",
        "/// @z.uuid()",
        "/// @v.pipe(v.string(), v.uuid())",
      ]);
    });
  });

  describe("fieldDefinitions", () => {
    it.concurrent("fieldDefinitions comment true", () => {
      const result = fieldDefinitions(
        {
          name: "user",
          fields: [
            { name: "id", definition: "z.uuid()", description: "Primary key" },
            {
              name: "name",
              definition: "z.string().min(1).max(50)",
              description: "Display name",
            },
          ],
        },
        true,
      );

      const expected = `/**
 * Primary key
 */
id:z.uuid(),
/**
 * Display name
 */
name:z.string().min(1).max(50)`;

      expect(result).toBe(expected);
    });

    it.concurrent("fieldDefinitions comment false", () => {
      const result = fieldDefinitions(
        {
          name: "user",
          fields: [
            { name: "id", definition: "z.uuid()", description: "Primary key" },
            {
              name: "name",
              definition: "z.string().min(1).max(50)",
              description: "Display name",
            },
          ],
        },
        false,
      );
      const expected = `id:z.uuid(),
name:z.string().min(1).max(50)`;
      expect(result).toBe(expected);
    });
  });

  // ============================================================================
  // Real-world use case tests
  // ============================================================================

  describe("E-Commerce pattern - fieldDefinitions", () => {
    it.concurrent("generates Order fields with comments", () => {
      const result = fieldDefinitions(
        {
          name: "order",
          fields: [
            { name: "id", definition: "z.uuid()", description: "Order ID" },
            {
              name: "totalAmount",
              definition: "z.number().int().nonnegative()",
              description: "Total amount in cents",
            },
            {
              name: "note",
              definition: "z.string().optional()",
              description: "Customer note",
            },
          ],
        },
        true,
      );
      expect(result).toBe(`/**
 * Order ID
 */
id:z.uuid(),
/**
 * Total amount in cents
 */
totalAmount:z.number().int().nonnegative(),
/**
 * Customer note
 */
note:z.string().optional()`);
    });

    it.concurrent("generates OrderItem fields without comments", () => {
      const result = fieldDefinitions(
        {
          name: "orderItem",
          fields: [
            { name: "id", definition: "z.uuid()" },
            { name: "quantity", definition: "z.number().int().positive()" },
            { name: "unitPrice", definition: "z.number().int().nonnegative()" },
            { name: "orderId", definition: "z.uuid()" },
          ],
        },
        false,
      );
      expect(result).toBe(
        "id:z.uuid(),\nquantity:z.number().int().positive(),\nunitPrice:z.number().int().nonnegative(),\norderId:z.uuid()",
      );
    });
  });

  describe("E-Commerce pattern - parseFieldComments", () => {
    it.concurrent("parses Order status enum annotation", () => {
      expect(
        parseFieldComments(
          [
            "/// Order status",
            "/// @z.enum(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'])",
            "/// @v.picklist(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'])",
          ],
          "@z.",
        ),
      ).toStrictEqual({
        definition: "z.enum(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'])",
        description: "Order status",
        objectType: undefined,
      });
    });

    it.concurrent("parses Order status for valibot", () => {
      expect(
        parseFieldComments(
          [
            "/// Order status",
            "/// @z.enum(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'])",
            "/// @v.picklist(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'])",
          ],
          "@v.",
        ),
      ).toStrictEqual({
        definition: "v.picklist(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'])",
        description: "Order status",
        objectType: undefined,
      });
    });
  });
});

describe("resolveWrapperType", () => {
  it("returns strictObject for strict", () => {
    expect(resolveWrapperType("strict")).toBe("strictObject");
  });

  it("returns looseObject for loose", () => {
    expect(resolveWrapperType("loose")).toBe("looseObject");
  });

  it("returns object for undefined", () => {
    expect(resolveWrapperType(undefined)).toBe("object");
  });
});

describe("makeRelationFields", () => {
  it("joins fields with comma", () => {
    expect(
      makeRelationFields([
        { name: "posts", definition: "z.array(PostSchema)" },
        { name: "profile", definition: "ProfileSchema" },
      ]),
    ).toBe("posts:z.array(PostSchema),profile:ProfileSchema");
  });

  it("returns empty string for empty array", () => {
    expect(makeRelationFields([])).toBe("");
  });

  it("returns single field without trailing comma", () => {
    expect(makeRelationFields([{ name: "user", definition: "UserSchema" }])).toBe(
      "user:UserSchema",
    );
  });
});

// ============================================================================
// Edge case tests
// ============================================================================

describe("makeCapitalized edge cases", () => {
  it.concurrent("empty string", () => {
    expect(makeCapitalized("")).toBe("");
  });

  it.concurrent("single char lowercase", () => {
    expect(makeCapitalized("a")).toBe("A");
  });

  it.concurrent("already capitalized", () => {
    expect(makeCapitalized("User")).toBe("User");
  });

  it.concurrent("numeric start", () => {
    expect(makeCapitalized("123abc")).toBe("123abc");
  });
});

describe("parseFieldComments with @a. (ArkType) tag", () => {
  it.concurrent("parses ArkType email annotation", () => {
    expect(parseFieldComments(["/// User email", '/// @a."string.email"'], "@a.")).toStrictEqual({
      definition: '"string.email"',
      description: "User email",
      objectType: undefined,
    });
  });
});

describe("parseFieldComments with @e. (Effect) tag", () => {
  it.concurrent("parses Effect Schema.UUID annotation", () => {
    expect(parseFieldComments(["/// User ID", "/// @e.Schema.UUID"], "@e.")).toStrictEqual({
      definition: "Schema.UUID",
      description: "User ID",
      objectType: undefined,
    });
  });
});

describe("parseFieldComments with no matching annotation", () => {
  it.concurrent("returns empty definition when tag not found", () => {
    expect(parseFieldComments(["/// Just a description"], "@z.")).toStrictEqual({
      definition: "",
      description: "Just a description",
      objectType: undefined,
    });
  });
});

describe("parseFieldComments with empty array", () => {
  it.concurrent("returns empty definition and undefined description", () => {
    expect(parseFieldComments([], "@z.")).toStrictEqual({
      definition: "",
      description: undefined,
      objectType: undefined,
    });
  });
});

describe("extractFieldComments edge cases", () => {
  it.concurrent("field at very beginning of source (no prior comments)", () => {
    const sourceText = `id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
`;
    const fieldStartPos = 0;
    const result = extractFieldComments(sourceText, fieldStartPos);
    expect(result).toStrictEqual([]);
  });

  it.concurrent("field with blank lines separating comments from field", () => {
    const sourceText = `/// Primary key
/// @z.uuid()

  id: varchar('id', { length: 36 }).primaryKey(),
`;
    const fieldStartPos = sourceText.indexOf("id:");
    const result = extractFieldComments(sourceText, fieldStartPos);
    expect(result).toStrictEqual(["/// Primary key", "/// @z.uuid()"]);
  });
});

describe("fieldDefinitions edge cases", () => {
  it.concurrent("single field without comment", () => {
    const result = fieldDefinitions(
      {
        name: "config",
        fields: [{ name: "key", definition: "z.string()" }],
      },
      false,
    );
    expect(result).toBe("key:z.string()");
  });

  it.concurrent("empty fields array", () => {
    const result = fieldDefinitions(
      {
        name: "empty",
        fields: [],
      },
      false,
    );
    expect(result).toBe("");
  });

  it.concurrent("field with no description when comment=true outputs no JSDoc", () => {
    const result = fieldDefinitions(
      {
        name: "session",
        fields: [{ name: "token", definition: "z.string()" }],
      },
      true,
    );
    expect(result).toBe("token:z.string()");
  });
});

describe("SNS Pattern (User/Post/Comment/Like) - parseFieldComments", () => {
  it.concurrent("Comment likes count with @z. annotation", () => {
    expect(
      parseFieldComments(["/// Number of likes", "/// @z.number().int().nonnegative()"], "@z."),
    ).toStrictEqual({
      definition: "z.number().int().nonnegative()",
      description: "Number of likes",
      objectType: undefined,
    });
  });

  it.concurrent("Like userId with @z.uuid() annotation", () => {
    expect(parseFieldComments(["/// User who liked", "/// @z.uuid()"], "@z.")).toStrictEqual({
      definition: "z.uuid()",
      description: "User who liked",
      objectType: undefined,
    });
  });
});
