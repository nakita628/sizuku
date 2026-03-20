import fs from "node:fs";
import fsp from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { arktypeCode, makeRelationArktypeCode, sizukuArktype } from "./index.js";

// Test run
// pnpm vitest run ./src/generator/arktype/index.test.ts

const TEST_CODE = [
  "export const user = mysqlTable('user', {",
  "  /// Primary key",
  "  /// @a.'string.uuid'",
  "  id: varchar('id', { length: 36 }).primaryKey(),",
  "  /// Display name",
  "  /// @a.'string'",
  "  name: varchar('name', { length: 50 }).notNull(),",
  "})",
  "",
  "/// @relation user.id post.userId one-to-many",
  "export const post = mysqlTable('post', {",
  "  /// Primary key",
  "  /// @a.'string.uuid'",
  "  id: varchar('id', { length: 36 }).primaryKey(),",
  "  /// Article title",
  "  /// @a.'string'",
  "  title: varchar('title', { length: 100 }).notNull(),",
  "  /// Body content (no length limit)",
  "  /// @a.'string'",
  "  content: varchar('content', { length: 65535 }).notNull(),",
  "  /// Foreign key referencing User.id",
  "  /// @a.'string.uuid'",
  "  userId: varchar('user_id', { length: 36 }).notNull(),",
  "})",
  "",
  "export const userRelations = relations(user, ({ many }) => ({",
  "  posts: many(post),",
  "}))",
  "",
  "export const postRelations = relations(post, ({ one }) => ({",
  "  user: one(user, {",
  "    fields: [post.userId],",
  "    references: [user.id],",
  "  }),",
  "}))",
  "",
];

// ============================================================================
// Pure function tests
// ============================================================================

describe("arktypeCode", () => {
  it.concurrent("generates schema without comment or type", () => {
    const result = arktypeCode(
      {
        name: "user",
        fields: [
          { name: "id", definition: "'string.uuid'" },
          { name: "name", definition: "'string'" },
        ],
      },
      false,
      false,
    );
    expect(result).toBe(`export const UserSchema = type({id:'string.uuid',\nname:'string'})\n`);
  });

  it.concurrent("generates schema with comment true", () => {
    const result = arktypeCode(
      {
        name: "user",
        fields: [
          { name: "id", definition: "'string.uuid'", description: "Primary key" },
          { name: "name", definition: "'string'", description: "Display name" },
        ],
      },
      true,
      false,
    );
    expect(result).toBe(
      `export const UserSchema = type({/**\n * Primary key\n */\nid:'string.uuid',\n/**\n * Display name\n */\nname:'string'})\n`,
    );
  });

  it.concurrent("generates schema with type true", () => {
    const result = arktypeCode(
      {
        name: "user",
        fields: [{ name: "id", definition: "'string.uuid'" }],
      },
      false,
      true,
    );
    expect(result).toBe(
      `export const UserSchema = type({id:'string.uuid'})\n\nexport type User = typeof UserSchema.infer\n`,
    );
  });

  it.concurrent("generates schema with comment and type", () => {
    const result = arktypeCode(
      {
        name: "order",
        fields: [
          { name: "id", definition: "'string.uuid'", description: "Order ID" },
          { name: "status", definition: "'PENDING' | 'SHIPPED'", description: "Order status" },
          { name: "totalAmount", definition: "'number'", description: "Total amount in cents" },
        ],
      },
      true,
      true,
    );
    expect(result).toBe(
      `export const OrderSchema = type({/**\n * Order ID\n */\nid:'string.uuid',\n/**\n * Order status\n */\nstatus:'PENDING' | 'SHIPPED',\n/**\n * Total amount in cents\n */\ntotalAmount:'number'})\n\nexport type Order = typeof OrderSchema.infer\n`,
    );
  });

  it.concurrent("capitalizes table name correctly", () => {
    const result = arktypeCode(
      { name: "orderItem", fields: [{ name: "id", definition: "'string'" }] },
      false,
      false,
    );
    expect(result).toBe(`export const OrderItemSchema = type({id:'string'})\n`);
  });

  it.concurrent("handles single field", () => {
    const result = arktypeCode(
      { name: "token", fields: [{ name: "value", definition: "'string'" }] },
      false,
      true,
    );
    expect(result).toBe(
      `export const TokenSchema = type({value:'string'})\n\nexport type Token = typeof TokenSchema.infer\n`,
    );
  });

  it.concurrent("handles field without description when comment is true", () => {
    const result = arktypeCode(
      {
        name: "user",
        fields: [
          { name: "id", definition: "'string.uuid'", description: "Primary key" },
          { name: "name", definition: "'string'" },
        ],
      },
      true,
      false,
    );
    expect(result).toBe(
      `export const UserSchema = type({/**\n * Primary key\n */\nid:'string.uuid',\nname:'string'})\n`,
    );
  });
});

describe("makeRelationArktypeCode", () => {
  it.concurrent("generates relation schema without type", () => {
    const result = makeRelationArktypeCode(
      {
        name: "userRelations",
        baseName: "user",
        fields: [{ name: "posts", definition: "PostSchema.array()" }],
      },
      false,
    );
    expect(result).toBe(
      `\nexport const UserRelationsSchema = type({...UserSchema.t,posts:PostSchema.array()})`,
    );
  });

  it.concurrent("generates relation schema with type", () => {
    const result = makeRelationArktypeCode(
      {
        name: "userRelations",
        baseName: "user",
        fields: [{ name: "posts", definition: "PostSchema.array()" }],
      },
      true,
    );
    expect(result).toBe(
      `\nexport const UserRelationsSchema = type({...UserSchema.t,posts:PostSchema.array()})\n\nexport type UserRelations = typeof UserRelationsSchema.infer\n`,
    );
  });

  it.concurrent("generates relation with multiple fields", () => {
    const result = makeRelationArktypeCode(
      {
        name: "orderRelations",
        baseName: "order",
        fields: [
          { name: "items", definition: "OrderItemSchema.array()" },
          { name: "customer", definition: "CustomerSchema" },
        ],
      },
      false,
    );
    expect(result).toBe(
      `\nexport const OrderRelationsSchema = type({...OrderSchema.t,items:OrderItemSchema.array(),customer:CustomerSchema})`,
    );
  });

  it.concurrent("generates relation with single one-to-one field", () => {
    const result = makeRelationArktypeCode(
      {
        name: "postRelations",
        baseName: "post",
        fields: [{ name: "author", definition: "UserSchema" }],
      },
      true,
    );
    expect(result).toBe(
      `\nexport const PostRelationsSchema = type({...PostSchema.t,author:UserSchema})\n\nexport type PostRelations = typeof PostRelationsSchema.infer\n`,
    );
  });
});

// ============================================================================
// E-Commerce pattern - arktypeCode
// ============================================================================

describe("arktypeCode E-Commerce pattern", () => {
  it.concurrent("generates Order schema with all options", () => {
    const result = arktypeCode(
      {
        name: "order",
        fields: [
          { name: "id", definition: "'string.uuid'", description: "Order ID" },
          {
            name: "status",
            definition: "'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'",
            description: "Order status",
          },
          { name: "totalAmount", definition: "'number'", description: "Total amount in cents" },
          { name: "customerId", definition: "'string.uuid'", description: "Customer reference" },
        ],
      },
      true,
      true,
    );
    expect(result).toBe(`export const OrderSchema = type({/**
 * Order ID
 */
id:'string.uuid',
/**
 * Order status
 */
status:'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED',
/**
 * Total amount in cents
 */
totalAmount:'number',
/**
 * Customer reference
 */
customerId:'string.uuid'})

export type Order = typeof OrderSchema.infer
`);
  });

  it.concurrent("generates OrderItem schema without comments", () => {
    const result = arktypeCode(
      {
        name: "orderItem",
        fields: [
          { name: "id", definition: "'string.uuid'" },
          { name: "quantity", definition: "'number'" },
          { name: "unitPrice", definition: "'number'" },
          { name: "orderId", definition: "'string.uuid'" },
        ],
      },
      false,
      false,
    );
    expect(result).toBe(`export const OrderItemSchema = type({id:'string.uuid',
quantity:'number',
unitPrice:'number',
orderId:'string.uuid'})
`);
  });
});

// ============================================================================
// E-Commerce pattern - makeRelationArktypeCode
// ============================================================================

describe("makeRelationArktypeCode E-Commerce pattern", () => {
  it.concurrent("generates Order relations with items and customer", () => {
    const result = makeRelationArktypeCode(
      {
        name: "orderRelations",
        baseName: "order",
        fields: [
          { name: "items", definition: "OrderItemSchema.array()" },
          { name: "customer", definition: "CustomerSchema" },
        ],
      },
      true,
    );
    expect(result).toBe(`
export const OrderRelationsSchema = type({...OrderSchema.t,items:OrderItemSchema.array(),customer:CustomerSchema})

export type OrderRelations = typeof OrderRelationsSchema.infer
`);
  });

  it.concurrent("generates Customer relations without type", () => {
    const result = makeRelationArktypeCode(
      {
        name: "customerRelations",
        baseName: "customer",
        fields: [{ name: "orders", definition: "OrderSchema.array()" }],
      },
      false,
    );
    expect(result).toBe(
      `\nexport const CustomerRelationsSchema = type({...CustomerSchema.t,orders:OrderSchema.array()})`,
    );
  });
});

// ============================================================================
// Edge cases - pure function
// ============================================================================

describe("arktypeCode edge cases", () => {
  it.concurrent("single field with empty definition string", () => {
    const result = arktypeCode(
      { name: "empty", fields: [{ name: "data", definition: "'unknown'" }] },
      false,
      false,
    );
    expect(result).toBe(`export const EmptySchema = type({data:'unknown'})\n`);
  });

  it.concurrent("field with long definition", () => {
    const result = arktypeCode(
      {
        name: "user",
        fields: [{ name: "role", definition: "'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER' | 'GUEST'" }],
      },
      false,
      false,
    );
    expect(result).toBe(
      `export const UserSchema = type({role:'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER' | 'GUEST'})\n`,
    );
  });

  it.concurrent("multiple fields all with descriptions", () => {
    const result = arktypeCode(
      {
        name: "session",
        fields: [
          { name: "id", definition: "'string.uuid'", description: "Session ID" },
          { name: "token", definition: "'string'", description: "Session token" },
          { name: "expiresAt", definition: "'Date'", description: "Expiration timestamp" },
        ],
      },
      true,
      true,
    );
    expect(result).toBe(`export const SessionSchema = type({/**
 * Session ID
 */
id:'string.uuid',
/**
 * Session token
 */
token:'string',
/**
 * Expiration timestamp
 */
expiresAt:'Date'})

export type Session = typeof SessionSchema.infer
`);
  });

  it.concurrent("mixed fields with and without descriptions", () => {
    const result = arktypeCode(
      {
        name: "user",
        fields: [
          { name: "id", definition: "'string.uuid'", description: "Primary key" },
          { name: "email", definition: "'string.email'" },
          { name: "name", definition: "'string'", description: "Display name" },
          { name: "isActive", definition: "'boolean'" },
        ],
      },
      true,
      false,
    );
    expect(result).toBe(`export const UserSchema = type({/**
 * Primary key
 */
id:'string.uuid',
email:'string.email',
/**
 * Display name
 */
name:'string',
isActive:'boolean'})
`);
  });
});

// ============================================================================
// Integration tests (I/O)
// ============================================================================

describe("sizukuArktype", () => {
  afterEach(() => {
    if (fs.existsSync("tmp/arktype-test.ts")) {
      fs.unlinkSync("tmp/arktype-test.ts");
    }
    if (fs.existsSync("tmp")) {
      fs.rmdirSync("tmp", { recursive: true });
    }
  });

  it("sizukuArktype", async () => {
    await sizukuArktype(TEST_CODE, "tmp/arktype-test.ts");
    const result = await fsp.readFile("tmp/arktype-test.ts", "utf-8");
    const expected = `import { type } from 'arktype'

export const UserSchema = type({ id: 'string.uuid', name: 'string' })

export const PostSchema = type({
  id: 'string.uuid',
  title: 'string',
  content: 'string',
  userId: 'string.uuid',
})
`;
    expect(result).toBe(expected);
  });

  it("sizukuArktype type true", async () => {
    await sizukuArktype(TEST_CODE, "tmp/arktype-test.ts", false, true);
    const result = await fsp.readFile("tmp/arktype-test.ts", "utf-8");
    const expected = `import { type } from 'arktype'

export const UserSchema = type({ id: 'string.uuid', name: 'string' })

export type User = typeof UserSchema.infer

export const PostSchema = type({
  id: 'string.uuid',
  title: 'string',
  content: 'string',
  userId: 'string.uuid',
})

export type Post = typeof PostSchema.infer
`;
    expect(result).toBe(expected);
  });

  it("sizukuArktype with comment", async () => {
    await sizukuArktype(TEST_CODE, "tmp/arktype-test.ts", true);
    const result = await fsp.readFile("tmp/arktype-test.ts", "utf-8");
    const expected = `import { type } from 'arktype'

export const UserSchema = type({
  /**
   * Primary key
   */
  id: 'string.uuid',
  /**
   * Display name
   */
  name: 'string',
})

export const PostSchema = type({
  /**
   * Primary key
   */
  id: 'string.uuid',
  /**
   * Article title
   */
  title: 'string',
  /**
   * Body content (no length limit)
   */
  content: 'string',
  /**
   * Foreign key referencing User.id
   */
  userId: 'string.uuid',
})
`;
    expect(result).toBe(expected);
  });

  it("sizukuArktype with comment and type", async () => {
    await sizukuArktype(TEST_CODE, "tmp/arktype-test.ts", true, true);
    const result = await fsp.readFile("tmp/arktype-test.ts", "utf-8");
    const expected = `import { type } from 'arktype'

export const UserSchema = type({
  /**
   * Primary key
   */
  id: 'string.uuid',
  /**
   * Display name
   */
  name: 'string',
})

export type User = typeof UserSchema.infer

export const PostSchema = type({
  /**
   * Primary key
   */
  id: 'string.uuid',
  /**
   * Article title
   */
  title: 'string',
  /**
   * Body content (no length limit)
   */
  content: 'string',
  /**
   * Foreign key referencing User.id
   */
  userId: 'string.uuid',
})

export type Post = typeof PostSchema.infer
`;
    expect(result).toBe(expected);
  });

  it("sizukuArktype with relation", async () => {
    await sizukuArktype(TEST_CODE, "tmp/arktype-test.ts", false, false, true);
    const result = await fsp.readFile("tmp/arktype-test.ts", "utf-8");
    const expected = `import { type } from 'arktype'

export const UserSchema = type({ id: 'string.uuid', name: 'string' })

export const PostSchema = type({
  id: 'string.uuid',
  title: 'string',
  content: 'string',
  userId: 'string.uuid',
})

export const UserRelationsSchema = type({ ...UserSchema.t, posts: PostSchema.array() })

export const PostRelationsSchema = type({ ...PostSchema.t, user: UserSchema })
`;
    expect(result).toBe(expected);
  });
});
