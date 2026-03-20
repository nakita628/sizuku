import { describe, expect, it } from "vitest";
import { makeRelationLine, extractRelations, toRelationSymbol } from "../helper/extract-schemas.js";
import {
  cleanCommentLines,
  containsSubstring,
  extractFieldComments,
  fieldDefinitions,
  infer,
  inferArktype,
  inferEffect,
  inferOutput,
  isNonEmpty,
  joinWithSpace,
  makeCapitalized,
  makeCommentBlock,
  makeValibotObject,
  makeZodObject,
  parseFieldComments,
  parseRelationLine,
  removeAtSign,
  removeOptionalSuffix,
  removeTripleSlash,
  splitByDot,
  splitByNewline,
  splitByTo,
  splitByWhitespace,
  startsWith,
  trimString,
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

  describe("extractRelations", () => {
    it.concurrent("extractRelations", () => {
      const result = extractRelations(["/// @relation user.id post.userId one-to-many"]);
      const expected = [
        {
          fromModel: "user",
          fromField: "id",
          toModel: "post",
          toField: "userId",
          type: "one-to-many",
        },
      ];
      expect(result).toStrictEqual(expected);
    });
  });

  describe("toRelationSymbol", () => {
    it.concurrent("maps valid cardinalities", () => {
      expect(toRelationSymbol("zero-one")).toBe("|o");
      expect(toRelationSymbol("one")).toBe("||");
      expect(toRelationSymbol("zero-many")).toBe("}o");
      expect(toRelationSymbol("many")).toBe("}|");
    });

    it.concurrent("returns null for invalid cardinality", () => {
      expect(toRelationSymbol("invalid")).toBeNull();
      expect(toRelationSymbol("")).toBeNull();
      expect(toRelationSymbol("one-to-many")).toBeNull();
    });
  });

  describe("makeRelationLine", () => {
    it.concurrent.each([
      ["zero-one-to-zero-one", "|o--|o"],
      ["zero-one-to-one", "|o--||"],
      ["zero-one-to-zero-many", "|o--}o"],
      ["zero-one-to-many", "|o--}|"],
      ["zero-one-to-zero-one-optional", "|o..|o"],
      ["zero-one-to-one-optional", "|o..||"],
      ["zero-one-to-zero-many-optional", "|o..}o"],
      ["zero-one-to-many-optional", "|o..}|"],
      ["one-to-zero-one", "||--|o"],
      ["one-to-one", "||--||"],
      ["one-to-zero-many", "||--}o"],
      ["one-to-many", "||--}|"],
      ["one-to-zero-one-optional", "||..|o"],
      ["one-to-one-optional", "||..||"],
      ["one-to-zero-many-optional", "||..}o"],
      ["one-to-many-optional", "||..}|"],
      ["zero-many-to-zero-one", "}o--|o"],
      ["zero-many-to-one", "}o--||"],
      ["zero-many-to-zero-many", "}o--}o"],
      ["zero-many-to-many", "}o--}|"],
      ["zero-many-to-zero-one-optional", "}o..|o"],
      ["zero-many-to-one-optional", "}o..||"],
      ["zero-many-to-zero-many-optional", "}o..}o"],
      ["zero-many-to-many-optional", "}o..}|"],
      ["many-to-zero-one", "}|--|o"],
      ["many-to-one", "}|--||"],
      ["many-to-zero-many", "}|--}o"],
      ["many-to-many", "}|--}|"],
      ["many-to-zero-one-optional", "}|..|o"],
      ["many-to-one-optional", "}|..||"],
      ["many-to-zero-many-optional", "}|..}o"],
      ["many-to-many-optional", "}|..}|"],
      ["zero-many-to-zero-one-optional", "}o..|o"],
      ["zero-many-to-one-optional", "}o..||"],
      ["zero-many-to-zero-many-optional", "}o..}o"],
      ["zero-many-to-many-optional", "}o..}|"],
      ["many-to-zero-one-optional", "}|..|o"],
      ["many-to-one-optional", "}|..||"],
      ["many-to-zero-many-optional", "}|..}o"],
      ["many-to-many-optional", "}|..}|"],
      ["zero-one-to-zero-one-optional", "|o..|o"],
      ["zero-one-to-one-optional", "|o..||"],
    ])("makeRelationLine(%s) -> ok: %s", (input, expected) => {
      const result = makeRelationLine(input);
      expect(result).toStrictEqual({ ok: true, value: expected });
    });

    it.concurrent("returns error for invalid input format", () => {
      const result = makeRelationLine("invalid-string");
      expect(result).toStrictEqual({ ok: false, error: "Invalid input format: invalid-string" });
    });

    it.concurrent("returns error for empty string", () => {
      const result = makeRelationLine("");
      expect(result).toStrictEqual({ ok: false, error: "Invalid input format: " });
    });

    it.concurrent("returns error for invalid relationship type", () => {
      const result = makeRelationLine("foo-to-bar");
      expect(result).toStrictEqual({ ok: false, error: "Invalid relationship string: foo-to-bar" });
    });

    it.concurrent("returns error for partial valid input", () => {
      const result = makeRelationLine("one-to-invalid");
      expect(result).toStrictEqual({
        ok: false,
        error: "Invalid relationship string: one-to-invalid",
      });
    });
  });

  describe("makeZodObject", () => {
    it.concurrent("default object", () => {
      expect(makeZodObject("id:z.uuid()")).toBe("z.object({id:z.uuid()})");
    });
    it.concurrent("strictObject", () => {
      expect(makeZodObject("id:z.uuid()", "strictObject")).toBe("z.strictObject({id:z.uuid()})");
    });
    it.concurrent("looseObject", () => {
      expect(makeZodObject("id:z.uuid()", "looseObject")).toBe("z.looseObject({id:z.uuid()})");
    });
  });

  describe("makeValibotObject", () => {
    it.concurrent("default object", () => {
      expect(makeValibotObject("id:v.string()")).toBe("v.object({id:v.string()})");
    });
    it.concurrent("strictObject", () => {
      expect(makeValibotObject("id:v.string()", "strictObject")).toBe(
        "v.strictObject({id:v.string()})",
      );
    });
    it.concurrent("looseObject", () => {
      expect(makeValibotObject("id:v.string()", "looseObject")).toBe(
        "v.looseObject({id:v.string()})",
      );
    });
  });

  describe("removeTripleSlash", () => {
    it.concurrent("removes /// prefix", () => {
      expect(removeTripleSlash("/// comment")).toBe(" comment");
    });
    it.concurrent("returns unchanged if no prefix", () => {
      expect(removeTripleSlash("comment")).toBe("comment");
    });
  });

  describe("isNonEmpty", () => {
    it.concurrent("true for non-empty", () => {
      expect(isNonEmpty("hello")).toBe(true);
    });
    it.concurrent("false for empty", () => {
      expect(isNonEmpty("")).toBe(false);
    });
  });

  describe("containsSubstring", () => {
    it.concurrent("true when found", () => {
      expect(containsSubstring("hello world", "world")).toBe(true);
    });
    it.concurrent("false when not found", () => {
      expect(containsSubstring("hello", "world")).toBe(false);
    });
  });

  describe("startsWith", () => {
    it.concurrent("true when starts with prefix", () => {
      expect(startsWith("@z.uuid()", "@z.")).toBe(true);
    });
    it.concurrent("false when not", () => {
      expect(startsWith("hello", "@z.")).toBe(false);
    });
  });

  describe("removeAtSign", () => {
    it.concurrent("removes @ prefix", () => {
      expect(removeAtSign("@z.uuid()")).toBe("z.uuid()");
    });
    it.concurrent("returns unchanged if no @", () => {
      expect(removeAtSign("z.uuid()")).toBe("z.uuid()");
    });
  });

  describe("joinWithSpace", () => {
    it.concurrent("joins with space", () => {
      expect(joinWithSpace(["a", "b", "c"])).toBe("a b c");
    });
    it.concurrent("empty array", () => {
      expect(joinWithSpace([])).toBe("");
    });
  });

  describe("splitByNewline", () => {
    it.concurrent("splits by newline", () => {
      expect(splitByNewline("a\nb\nc")).toStrictEqual(["a", "b", "c"]);
    });
  });

  describe("trimString", () => {
    it.concurrent("trims whitespace", () => {
      expect(trimString("  hello  ")).toBe("hello");
    });
  });

  describe("parseRelationLine", () => {
    it.concurrent("parses valid relation", () => {
      expect(parseRelationLine("@relation user.id post.userId one-to-many")).toStrictEqual({
        fromModel: "user",
        fromField: "id",
        toModel: "post",
        toField: "userId",
        type: "one-to-many",
      });
    });
    it.concurrent("returns null for non-relation", () => {
      expect(parseRelationLine("/// comment")).toBeNull();
    });
    it.concurrent("returns null for malformed relation", () => {
      expect(parseRelationLine("@relation incomplete")).toBeNull();
    });
    it.concurrent("returns null for invalid field format", () => {
      expect(parseRelationLine("@relation user post.userId one-to-many")).toBeNull();
    });
  });

  describe("splitByTo", () => {
    it.concurrent("splits by -to-", () => {
      expect(splitByTo("one-to-many")).toStrictEqual(["one", "many"]);
    });
    it.concurrent("returns null when no -to-", () => {
      expect(splitByTo("invalid")).toBeNull();
    });
  });

  describe("removeOptionalSuffix", () => {
    it.concurrent("removes -optional suffix", () => {
      expect(removeOptionalSuffix("one-optional")).toBe("one");
    });
    it.concurrent("returns unchanged if no suffix", () => {
      expect(removeOptionalSuffix("one")).toBe("one");
    });
  });

  describe("splitByWhitespace", () => {
    it.concurrent("splits by whitespace", () => {
      expect(splitByWhitespace("  a  b  c  ")).toStrictEqual(["a", "b", "c"]);
    });
    it.concurrent("empty string", () => {
      expect(splitByWhitespace("")).toStrictEqual([]);
    });
  });

  describe("splitByDot", () => {
    it.concurrent("splits by dot", () => {
      expect(splitByDot("user.id")).toStrictEqual(["user", "id"]);
    });
  });

  describe("cleanCommentLines", () => {
    it.concurrent("cleans triple slash prefix", () => {
      expect(cleanCommentLines(["/// Primary key", "/// @z.uuid()"])).toStrictEqual([
        "Primary key",
        "@z.uuid()",
      ]);
    });
    it.concurrent("filters empty lines", () => {
      expect(cleanCommentLines(["///", "/// hello"])).toStrictEqual(["hello"]);
    });
    it.concurrent("empty array", () => {
      expect(cleanCommentLines([])).toStrictEqual([]);
    });
  });

  describe("infer", () => {
    it.concurrent("infer", () => {
      expect(infer("User")).toBe("export type User = z.infer<typeof UserSchema>");
    });
    it.concurrent("capitalizes first letter", () => {
      expect(infer("user")).toBe("export type User = z.infer<typeof UserSchema>");
    });
  });

  describe("inferOutput", () => {
    it.concurrent("inferOutput", () => {
      expect(inferOutput("User")).toBe("export type User = v.InferOutput<typeof UserSchema>");
    });
  });

  describe("inferArktype", () => {
    it.concurrent("generates arktype infer", () => {
      expect(inferArktype("User")).toBe("export type User = typeof UserSchema.infer");
    });
    it.concurrent("capitalizes", () => {
      expect(inferArktype("post")).toBe("export type Post = typeof PostSchema.infer");
    });
  });

  describe("inferEffect", () => {
    it.concurrent("generates effect infer", () => {
      expect(inferEffect("User")).toBe("export type UserEncoded = typeof UserSchema.Encoded");
    });
    it.concurrent("capitalizes", () => {
      expect(inferEffect("post")).toBe("export type PostEncoded = typeof PostSchema.Encoded");
    });
  });

  describe("makeCommentBlock", () => {
    it("generates multi-line JSDoc", () => {
      expect(makeCommentBlock("Primary key")).toBe("/**\n * Primary key\n */\n");
    });

    it("returns empty string for empty description", () => {
      expect(makeCommentBlock("")).toBe("");
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

  describe("E-Commerce pattern - infer functions", () => {
    it.concurrent("infer generates Order type", () => {
      expect(infer("order")).toBe("export type Order = z.infer<typeof OrderSchema>");
    });
    it.concurrent("inferOutput generates Order type", () => {
      expect(inferOutput("order")).toBe("export type Order = v.InferOutput<typeof OrderSchema>");
    });
    it.concurrent("inferArktype generates Order type", () => {
      expect(inferArktype("order")).toBe("export type Order = typeof OrderSchema.infer");
    });
    it.concurrent("inferEffect generates OrderEncoded type", () => {
      expect(inferEffect("order")).toBe("export type OrderEncoded = typeof OrderSchema.Encoded");
    });
  });

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

  describe("E-Commerce pattern - parseRelationLine", () => {
    it.concurrent("parses Order → OrderItem relation", () => {
      expect(parseRelationLine("@relation order.id orderItem.orderId one-to-many")).toStrictEqual({
        fromModel: "order",
        fromField: "id",
        toModel: "orderItem",
        toField: "orderId",
        type: "one-to-many",
      });
    });

    it.concurrent("parses Customer → Order relation", () => {
      expect(parseRelationLine("@relation customer.id order.customerId one-to-many")).toStrictEqual(
        {
          fromModel: "customer",
          fromField: "id",
          toModel: "order",
          toField: "customerId",
          type: "one-to-many",
        },
      );
    });

    it.concurrent("parses User → Profile one-to-one relation", () => {
      expect(parseRelationLine("@relation user.id profile.userId one-to-one")).toStrictEqual({
        fromModel: "user",
        fromField: "id",
        toModel: "profile",
        toField: "userId",
        type: "one-to-one",
      });
    });
  });

  describe("E-Commerce pattern - extractRelations", () => {
    it.concurrent("extracts multiple EC relations", () => {
      const result = extractRelations([
        "/// @relation customer.id order.customerId one-to-many",
        "export const order = mysqlTable('order', {",
        "  /// @relation order.id orderItem.orderId one-to-many",
        "  export const orderItem = mysqlTable('order_item', {",
      ]);
      expect(result).toStrictEqual([
        {
          fromModel: "customer",
          fromField: "id",
          toModel: "order",
          toField: "customerId",
          type: "one-to-many",
        },
        {
          fromModel: "order",
          fromField: "id",
          toModel: "orderItem",
          toField: "orderId",
          type: "one-to-many",
        },
      ]);
    });
  });

  describe("E-Commerce pattern - makeRelationLine", () => {
    it.concurrent("one-to-many for Customer → Order", () => {
      expect(makeRelationLine("one-to-many")).toStrictEqual({ ok: true, value: "||--}|" });
    });
    it.concurrent("one-to-one for User → Profile", () => {
      expect(makeRelationLine("one-to-one")).toStrictEqual({ ok: true, value: "||--||" });
    });
    it.concurrent("many-to-many for Product → Tag", () => {
      expect(makeRelationLine("many-to-many")).toStrictEqual({ ok: true, value: "}|--}|" });
    });
  });
});
