import fs from "node:fs";
import fsp from "node:fs/promises";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { relationValibotCode, sizukuValibot, valibotCode } from "./index.js";

// Test run
// pnpm vitest run ./src/generator/valibot/index.test.ts

const TEST_CODE = [
  "export const user = mysqlTable('user', {",
  "  /// Primary key",
  "  /// @z.uuid()",
  "  /// @v.pipe(v.string(), v.uuid())",
  "  id: varchar('id', { length: 36 }).primaryKey(),",
  "  /// Display name",
  "  /// @z.string().min(1).max(50)",
  "  /// @v.pipe(v.string(), v.minLength(1), v.maxLength(50))",
  "  name: varchar('name', { length: 50 }).notNull(),",
  "})",
  "",
  "/// @relation user.id post.userId one-to-many",
  "export const post = mysqlTable('post', {",
  "  /// Primary key",
  "  /// @z.uuid()",
  "  /// @v.pipe(v.string(), v.uuid())",
  "  id: varchar('id', { length: 36 }).primaryKey(),",
  "  /// Article title",
  "  /// @z.string().min(1).max(100)",
  "  /// @v.pipe(v.string(), v.minLength(1), v.maxLength(100))",
  "  title: varchar('title', { length: 100 }).notNull(),",
  "  /// Body content (no length limit)",
  "  /// @z.string()",
  "  /// @v.string()",
  "  content: varchar('content', { length: 65535 }).notNull(),",
  "  /// Foreign key referencing User.id",
  "  /// @z.uuid()",
  "  /// @v.pipe(v.string(), v.uuid())",
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

const TEST_CODE_WITH_OBJECT_TYPES = [
  "/// @z.strictObject",
  "/// @v.strictObject",
  "export const user = mysqlTable('user', {",
  "  /// Primary key",
  "  /// @z.uuid()",
  "  /// @v.pipe(v.string(), v.uuid())",
  "  id: varchar('id', { length: 36 }).primaryKey(),",
  "  /// Display name",
  "  /// @z.string().min(1).max(50)",
  "  /// @v.pipe(v.string(), v.minLength(1), v.maxLength(50))",
  "  name: varchar('name', { length: 50 }).notNull(),",
  "})",
  "",
  "/// @relation user.id post.userId one-to-many",
  "/// @z.looseObject",
  "/// @v.looseObject",
  "export const post = mysqlTable('post', {",
  "  /// Primary key",
  "  /// @z.uuid()",
  "  /// @v.pipe(v.string(), v.uuid())",
  "  id: varchar('id', { length: 36 }).primaryKey(),",
  "  /// Article title",
  "  /// @z.string().min(1).max(100)",
  "  /// @v.pipe(v.string(), v.minLength(1), v.maxLength(100))",
  "  title: varchar('title', { length: 100 }).notNull(),",
  "  /// Body content (no length limit)",
  "  /// @z.string()",
  "  /// @v.string()",
  "  content: varchar('content', { length: 65535 }).notNull(),",
  "  /// Foreign key referencing User.id",
  "  /// @z.uuid()",
  "  /// @v.pipe(v.string(), v.uuid())",
  "  userId: varchar('user_id', { length: 36 }).notNull(),",
  "})",
  "",
  "/// @z.strictObject",
  "/// @v.strictObject",
  "export const userRelations = relations(user, ({ many }) => ({",
  "  posts: many(post),",
  "}))",
  "",
  "/// @z.strictObject",
  "/// @v.strictObject",
  "export const postRelations = relations(post, ({ one }) => ({",
  "  user: one(user, {",
  "    fields: [post.userId],",
  "    references: [user.id],",
  "  }),",
  "}))",
  "",
];

// ============================================================================
// Real-world use case tests - Pure function tests
// ============================================================================

describe("valibotCode E-Commerce pattern", () => {
  it.concurrent("generates Order schema with comments and type", () => {
    const result = valibotCode(
      {
        name: "order",
        fields: [
          {
            name: "id",
            definition: "v.pipe(v.string(), v.uuid())",
            description: "Order ID",
          },
          {
            name: "status",
            definition: "v.picklist(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'])",
            description: "Order status",
          },
          {
            name: "totalAmount",
            definition: "v.pipe(v.number(), v.integer(), v.minValue(0))",
            description: "Total amount in cents",
          },
        ],
      },
      true,
      true,
    );
    expect(result).toBe(`export const OrderSchema = v.object({/**
 * Order ID
 */
id:v.pipe(v.string(), v.uuid()),
/**
 * Order status
 */
status:v.picklist(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
/**
 * Total amount in cents
 */
totalAmount:v.pipe(v.number(), v.integer(), v.minValue(0))})

export type Order = v.InferOutput<typeof OrderSchema>
`);
  });

  it.concurrent("generates Order schema without comments", () => {
    const result = valibotCode(
      {
        name: "order",
        fields: [
          { name: "id", definition: "v.pipe(v.string(), v.uuid())" },
          { name: "status", definition: "v.picklist(['PENDING', 'CONFIRMED', 'SHIPPED'])" },
          { name: "totalAmount", definition: "v.pipe(v.number(), v.integer())" },
        ],
      },
      false,
      false,
    );
    expect(result).toBe(`export const OrderSchema = v.object({id:v.pipe(v.string(), v.uuid()),
status:v.picklist(['PENDING', 'CONFIRMED', 'SHIPPED']),
totalAmount:v.pipe(v.number(), v.integer())})
`);
  });
});

describe("relationValibotCode E-Commerce pattern", () => {
  it.concurrent("generates Order relation with items and customer", () => {
    const result = relationValibotCode(
      {
        name: "orderRelations",
        baseName: "order",
        fields: [
          { name: "items", definition: "v.array(OrderItemSchema)", description: undefined },
          { name: "customer", definition: "CustomerSchema", description: undefined },
        ],
      },
      true,
    );
    expect(result).toBe(`
export const OrderRelationsSchema = v.object({...OrderSchema.entries,items:v.array(OrderItemSchema),customer:CustomerSchema})

export type OrderRelations = v.InferOutput<typeof OrderRelationsSchema>
`);
  });
});

describe("valibotCode", () => {
  it.concurrent("valibotCode comment true type true", () => {
    const result = valibotCode(
      {
        name: "user",
        fields: [
          {
            name: "id",
            definition: "v.pipe(v.string(), v.uuid())",
            description: "Primary key",
          },
          {
            name: "name",
            definition: "v.pipe(v.string(), v.minLength(1), v.maxLength(50))",
            description: "Display name",
          },
        ],
      },
      true,
      true,
    );

    const expected = `export const UserSchema = v.object({/**
 * Primary key
 */
id:v.pipe(v.string(), v.uuid()),
/**
 * Display name
 */
name:v.pipe(v.string(), v.minLength(1), v.maxLength(50))})

export type User = v.InferOutput<typeof UserSchema>
`;

    expect(result).toBe(expected);
  });
  it.concurrent("valibotCode comment false type false", () => {
    const result = valibotCode(
      {
        name: "user",
        fields: [
          {
            name: "id",
            definition: "v.pipe(v.string(), v.uuid())",
            description: "Primary key",
          },
          {
            name: "name",
            definition: "v.pipe(v.string(), v.minLength(1), v.maxLength(50))",
            description: "Display name",
          },
        ],
      },
      false,
      false,
    );

    const expected = `export const UserSchema = v.object({id:v.pipe(v.string(), v.uuid()),
name:v.pipe(v.string(), v.minLength(1), v.maxLength(50))})
`;
    expect(result).toBe(expected);
  });

  it.concurrent("valibotCode strictObject", () => {
    const result = valibotCode(
      {
        name: "config",
        fields: [{ name: "key", definition: "v.string()" }],
        objectType: "strict",
      },
      false,
      false,
    );
    expect(result).toBe(`export const ConfigSchema = v.strictObject({key:v.string()})\n`);
  });

  it.concurrent("valibotCode looseObject", () => {
    const result = valibotCode(
      {
        name: "config",
        fields: [{ name: "key", definition: "v.string()" }],
        objectType: "loose",
      },
      false,
      false,
    );
    expect(result).toBe(`export const ConfigSchema = v.looseObject({key:v.string()})\n`);
  });

  it.concurrent("valibotCode strictObject with type", () => {
    const result = valibotCode(
      {
        name: "config",
        fields: [{ name: "key", definition: "v.string()" }],
        objectType: "strict",
      },
      false,
      true,
    );
    expect(result).toBe(
      `export const ConfigSchema = v.strictObject({key:v.string()})\n\nexport type Config = v.InferOutput<typeof ConfigSchema>\n`,
    );
  });
});

describe("relationValibotCode", () => {
  it.concurrent("relationValibotCode strict objectType strict", () => {
    const result = relationValibotCode(
      {
        name: "userRelations",
        baseName: "user",
        fields: [
          {
            name: "posts",
            definition: "z.array(PostSchema)",
            description: undefined,
          },
        ],
        objectType: "strict",
      },
      true,
    );
    const expected = `
export const UserRelationsSchema = v.strictObject({...UserSchema.entries,posts:z.array(PostSchema)})

export type UserRelations = v.InferOutput<typeof UserRelationsSchema>
`;
    expect(result).toBe(expected);
  });
  it.concurrent("relationValibotCode objectType loose", () => {
    const result = relationValibotCode(
      {
        name: "userRelations",
        baseName: "user",
        fields: [
          {
            name: "posts",
            definition: "z.array(PostSchema)",
            description: undefined,
          },
        ],
        objectType: "loose",
      },
      true,
    );
    const expected = `
export const UserRelationsSchema = v.looseObject({...UserSchema.entries,posts:z.array(PostSchema)})

export type UserRelations = v.InferOutput<typeof UserRelationsSchema>
`;
    expect(result).toBe(expected);
  });
});

// ============================================================================
// Auth pattern - valibotCode
// ============================================================================

describe("valibotCode Auth pattern", () => {
  it.concurrent("generates User schema with comments and type", () => {
    const result = valibotCode(
      {
        name: "user",
        fields: [
          { name: "id", definition: "v.pipe(v.string(), v.uuid())", description: "Primary key" },
          { name: "email", definition: "v.pipe(v.string(), v.email())", description: "User email" },
          {
            name: "createdAt",
            definition: "v.pipe(v.string(), v.isoTimestamp())",
            description: "Account creation timestamp",
          },
        ],
      },
      true,
      true,
    );
    expect(result).toBe(`export const UserSchema = v.object({/**
 * Primary key
 */
id:v.pipe(v.string(), v.uuid()),
/**
 * User email
 */
email:v.pipe(v.string(), v.email()),
/**
 * Account creation timestamp
 */
createdAt:v.pipe(v.string(), v.isoTimestamp())})

export type User = v.InferOutput<typeof UserSchema>
`);
  });

  it.concurrent("generates Session schema with comments and type", () => {
    const result = valibotCode(
      {
        name: "session",
        fields: [
          {
            name: "id",
            definition: "v.pipe(v.string(), v.uuid())",
            description: "Session identifier",
          },
          {
            name: "userId",
            definition: "v.pipe(v.string(), v.uuid())",
            description: "Foreign key to User",
          },
          {
            name: "expiresAt",
            definition: "v.pipe(v.string(), v.isoTimestamp())",
            description: "Session expiry",
          },
        ],
      },
      true,
      true,
    );
    expect(result).toBe(`export const SessionSchema = v.object({/**
 * Session identifier
 */
id:v.pipe(v.string(), v.uuid()),
/**
 * Foreign key to User
 */
userId:v.pipe(v.string(), v.uuid()),
/**
 * Session expiry
 */
expiresAt:v.pipe(v.string(), v.isoTimestamp())})

export type Session = v.InferOutput<typeof SessionSchema>
`);
  });

  it.concurrent("generates RBAC Role schema without comments", () => {
    const result = valibotCode(
      {
        name: "role",
        fields: [
          { name: "id", definition: "v.pipe(v.string(), v.uuid())" },
          { name: "name", definition: "v.string()" },
        ],
      },
      false,
      false,
    );
    expect(result).toBe(`export const RoleSchema = v.object({id:v.pipe(v.string(), v.uuid()),
name:v.string()})
`);
  });
});

describe("relationValibotCode Auth pattern", () => {
  it.concurrent("generates Session relation with user field", () => {
    const result = relationValibotCode(
      {
        name: "sessionRelations",
        baseName: "session",
        fields: [{ name: "user", definition: "UserSchema", description: undefined }],
      },
      true,
    );
    expect(result).toBe(`
export const SessionRelationsSchema = v.object({...SessionSchema.entries,user:UserSchema})

export type SessionRelations = v.InferOutput<typeof SessionRelationsSchema>
`);
  });
});

describe("sizukuValibot", () => {
  afterEach(() => {
    if (fs.existsSync("tmp-valibot/valibot-test.ts")) {
      fs.unlinkSync("tmp-valibot/valibot-test.ts");
    }
    if (fs.existsSync("tmp-valibot")) {
      fs.rmdirSync("tmp-valibot", { recursive: true });
    }
  });

  it("sizukuValibot", async () => {
    await sizukuValibot(TEST_CODE, "tmp-valibot/valibot-test.ts");
    const result = await fsp.readFile("tmp-valibot/valibot-test.ts", "utf-8");
    const expected = `import * as v from 'valibot'

export const UserSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(50)),
})

export const PostSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  title: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
  content: v.string(),
  userId: v.pipe(v.string(), v.uuid()),
})
`;
    expect(result).toBe(expected);
  });

  it("sizukuValibot comment true", async () => {
    await sizukuValibot(TEST_CODE, "tmp-valibot/valibot-test.ts", true);
    const result = await fsp.readFile("tmp-valibot/valibot-test.ts", "utf-8");
    const expected = `import * as v from 'valibot'

export const UserSchema = v.object({
  /**
   * Primary key
   */
  id: v.pipe(v.string(), v.uuid()),
  /**
   * Display name
   */
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(50)),
})

export const PostSchema = v.object({
  /**
   * Primary key
   */
  id: v.pipe(v.string(), v.uuid()),
  /**
   * Article title
   */
  title: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
  /**
   * Body content (no length limit)
   */
  content: v.string(),
  /**
   * Foreign key referencing User.id
   */
  userId: v.pipe(v.string(), v.uuid()),
})
`;
    expect(result).toBe(expected);
  });

  it("sizukuValibot type true", async () => {
    await sizukuValibot(TEST_CODE, "tmp-valibot/valibot-test.ts", false, true);
    const result = await fsp.readFile("tmp-valibot/valibot-test.ts", "utf-8");
    const expected = `import * as v from 'valibot'

export const UserSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(50)),
})

export type User = v.InferOutput<typeof UserSchema>

export const PostSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  title: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
  content: v.string(),
  userId: v.pipe(v.string(), v.uuid()),
})

export type Post = v.InferOutput<typeof PostSchema>
`;
    expect(result).toBe(expected);
  });

  it("sizukuValibot with strictObject and looseObject", async () => {
    await sizukuValibot(TEST_CODE_WITH_OBJECT_TYPES, "tmp-valibot/valibot-test.ts");
    const result = await fsp.readFile("tmp-valibot/valibot-test.ts", "utf-8");
    const expected = `import * as v from 'valibot'

export const UserSchema = v.strictObject({
  id: v.pipe(v.string(), v.uuid()),
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(50)),
})

export const PostSchema = v.looseObject({
  id: v.pipe(v.string(), v.uuid()),
  title: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
  content: v.string(),
  userId: v.pipe(v.string(), v.uuid()),
})
`;
    expect(result).toBe(expected);
  });

  it("sizukuValibot with strictObject and looseObject with relation", async () => {
    await sizukuValibot(
      TEST_CODE_WITH_OBJECT_TYPES,
      "tmp-valibot/valibot-test.ts",
      false,
      false,
      true,
    );
    const result = await fsp.readFile("tmp-valibot/valibot-test.ts", "utf-8");
    const expected = `import * as v from 'valibot'

export const UserSchema = v.strictObject({
  id: v.pipe(v.string(), v.uuid()),
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(50)),
})

export const PostSchema = v.looseObject({
  id: v.pipe(v.string(), v.uuid()),
  title: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
  content: v.string(),
  userId: v.pipe(v.string(), v.uuid()),
})

export const UserRelationsSchema = v.strictObject({
  ...UserSchema.entries,
  posts: v.array(PostSchema),
})

export const PostRelationsSchema = v.looseObject({ ...PostSchema.entries, user: UserSchema })
`;
    expect(result).toBe(expected);
  });
});
