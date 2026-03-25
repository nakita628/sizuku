import fs from "node:fs";
import fsp from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { effectCode, makeRelationEffectCode, sizukuEffect } from "./index.js";

// Test run
// pnpm vitest run ./src/generator/effect/index.test.ts

const TEST_CODE = [
  "export const user = mysqlTable('user', {",
  "  /// Primary key",
  "  /// @e.Schema.UUID",
  "  id: varchar('id', { length: 36 }).primaryKey(),",
  "  /// Display name",
  "  /// @e.Schema.String.pipe(Schema.minLength(1), Schema.maxLength(50))",
  "  name: varchar('name', { length: 50 }).notNull(),",
  "})",
  "",
  "/// @relation user.id post.userId one-to-many",
  "export const post = mysqlTable('post', {",
  "  /// Primary key",
  "  /// @e.Schema.UUID",
  "  id: varchar('id', { length: 36 }).primaryKey(),",
  "  /// Article title",
  "  /// @e.Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100))",
  "  title: varchar('title', { length: 100 }).notNull(),",
  "  /// Body content (no length limit)",
  "  /// @e.Schema.String",
  "  content: varchar('content', { length: 65535 }).notNull(),",
  "  /// Foreign key referencing User.id",
  "  /// @e.Schema.UUID",
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

describe("sizukuEffect", () => {
  afterEach(() => {
    if (fs.existsSync("tmp-effect/effect-test.ts")) {
      fs.unlinkSync("tmp-effect/effect-test.ts");
    }
    if (fs.existsSync("tmp-effect")) {
      fs.rmdirSync("tmp-effect", { recursive: true });
    }
  });

  it("sizukuEffect", async () => {
    await sizukuEffect(TEST_CODE, "tmp-effect/effect-test.ts");
    const result = await fsp.readFile("tmp-effect/effect-test.ts", "utf-8");
    const expected = `import { Schema } from 'effect'

export const UserSchema = Schema.Struct({
  id: Schema.UUID,
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(50)),
})

export const PostSchema = Schema.Struct({
  id: Schema.UUID,
  title: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
  content: Schema.String,
  userId: Schema.UUID,
})
`;
    expect(result).toBe(expected);
  });

  it("sizukuEffect type true", async () => {
    await sizukuEffect(TEST_CODE, "tmp-effect/effect-test.ts", false, true);
    const result = await fsp.readFile("tmp-effect/effect-test.ts", "utf-8");
    const expected = `import { Schema } from 'effect'

export const UserSchema = Schema.Struct({
  id: Schema.UUID,
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(50)),
})

export type UserEncoded = typeof UserSchema.Encoded

export const PostSchema = Schema.Struct({
  id: Schema.UUID,
  title: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
  content: Schema.String,
  userId: Schema.UUID,
})

export type PostEncoded = typeof PostSchema.Encoded
`;
    expect(result).toBe(expected);
  });

  it("sizukuEffect with relation", async () => {
    await sizukuEffect(TEST_CODE, "tmp-effect/effect-test.ts", false, false, true);
    const result = await fsp.readFile("tmp-effect/effect-test.ts", "utf-8");
    const expected = `import { Schema } from 'effect'

export const UserSchema = Schema.Struct({
  id: Schema.UUID,
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(50)),
})

export const PostSchema = Schema.Struct({
  id: Schema.UUID,
  title: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
  content: Schema.String,
  userId: Schema.UUID,
})

export const UserRelationsSchema = Schema.Struct({
  ...UserSchema.fields,
  posts: Schema.Array(PostSchema),
})

export const PostRelationsSchema = Schema.Struct({ ...PostSchema.fields, user: UserSchema })
`;
    expect(result).toBe(expected);
  });
});

describe("effectCode JSDoc", () => {
  it.concurrent("effectCode comment true type true", () => {
    const result = effectCode(
      {
        name: "user",
        fields: [
          { name: "id", definition: "Schema.UUID", description: "Primary key" },
          {
            name: "name",
            definition: "Schema.String.pipe(Schema.minLength(1), Schema.maxLength(50))",
            description: "Display name",
          },
        ],
      },
      true,
      true,
    );

    const expected = `export const UserSchema = Schema.Struct({/**
 * Primary key
 */
id:Schema.UUID,
/**
 * Display name
 */
name:Schema.String.pipe(Schema.minLength(1), Schema.maxLength(50))})

export type UserEncoded = typeof UserSchema.Encoded
`;
    expect(result).toBe(expected);
  });

  it.concurrent("effectCode comment false type true", () => {
    const result = effectCode(
      {
        name: "user",
        fields: [
          { name: "id", definition: "Schema.UUID", description: "Primary key" },
          { name: "name", definition: "Schema.String", description: "Display name" },
        ],
      },
      false,
      true,
    );

    const expected = `export const UserSchema = Schema.Struct({id:Schema.UUID,
name:Schema.String})

export type UserEncoded = typeof UserSchema.Encoded
`;
    expect(result).toBe(expected);
  });

  it.concurrent("effectCode comment true type false", () => {
    const result = effectCode(
      {
        name: "user",
        fields: [{ name: "id", definition: "Schema.UUID", description: "Primary key" }],
      },
      true,
      false,
    );

    const expected = `export const UserSchema = Schema.Struct({/**
 * Primary key
 */
id:Schema.UUID})
`;
    expect(result).toBe(expected);
  });

  it.concurrent("effectCode comment false type false", () => {
    const result = effectCode(
      {
        name: "user",
        fields: [{ name: "id", definition: "Schema.UUID" }],
      },
      false,
      false,
    );
    expect(result).toBe(`export const UserSchema = Schema.Struct({id:Schema.UUID})\n`);
  });
});

describe("effectCode strict/loose (Effect has no schema-level strict/loose API)", () => {
  it.concurrent("strict objectType is ignored - still generates Schema.Struct", () => {
    const result = effectCode(
      {
        name: "config",
        fields: [{ name: "key", definition: "Schema.String" }],
        objectType: "strict",
      },
      false,
      false,
    );
    expect(result).toBe(`export const ConfigSchema = Schema.Struct({key:Schema.String})\n`);
  });

  it.concurrent("loose objectType is ignored - still generates Schema.Struct", () => {
    const result = effectCode(
      {
        name: "config",
        fields: [{ name: "key", definition: "Schema.String" }],
        objectType: "loose",
      },
      false,
      false,
    );
    expect(result).toBe(`export const ConfigSchema = Schema.Struct({key:Schema.String})\n`);
  });

  it.concurrent("undefined objectType generates Schema.Struct", () => {
    const result = effectCode(
      {
        name: "config",
        fields: [{ name: "key", definition: "Schema.String" }],
      },
      false,
      true,
    );
    expect(result).toBe(
      `export const ConfigSchema = Schema.Struct({key:Schema.String})\n\nexport type ConfigEncoded = typeof ConfigSchema.Encoded\n`,
    );
  });
});

// ============================================================================
// Auth pattern - effectCode
// ============================================================================

describe("effectCode Auth pattern", () => {
  it.concurrent("generates User schema with comments and type", () => {
    const result = effectCode(
      {
        name: "user",
        fields: [
          { name: "id", definition: "Schema.UUID", description: "Primary key" },
          {
            name: "email",
            definition: "Schema.String.pipe(Schema.pattern(/^[^@]+@[^@]+$/))",
            description: "User email",
          },
          {
            name: "createdAt",
            definition: "Schema.DateFromString",
            description: "Account creation timestamp",
          },
        ],
      },
      true,
      true,
    );
    expect(result).toBe(`export const UserSchema = Schema.Struct({/**
 * Primary key
 */
id:Schema.UUID,
/**
 * User email
 */
email:Schema.String.pipe(Schema.pattern(/^[^@]+@[^@]+$/)),
/**
 * Account creation timestamp
 */
createdAt:Schema.DateFromString})

export type UserEncoded = typeof UserSchema.Encoded
`);
  });

  it.concurrent("generates Session schema with comments and type", () => {
    const result = effectCode(
      {
        name: "session",
        fields: [
          { name: "id", definition: "Schema.UUID", description: "Session identifier" },
          { name: "userId", definition: "Schema.UUID", description: "Foreign key to User" },
          {
            name: "expiresAt",
            definition: "Schema.DateFromString",
            description: "Session expiry",
          },
        ],
      },
      true,
      true,
    );
    expect(result).toBe(`export const SessionSchema = Schema.Struct({/**
 * Session identifier
 */
id:Schema.UUID,
/**
 * Foreign key to User
 */
userId:Schema.UUID,
/**
 * Session expiry
 */
expiresAt:Schema.DateFromString})

export type SessionEncoded = typeof SessionSchema.Encoded
`);
  });

  it.concurrent("generates RBAC Role schema without comments", () => {
    const result = effectCode(
      {
        name: "role",
        fields: [
          { name: "id", definition: "Schema.UUID" },
          { name: "name", definition: "Schema.String" },
        ],
      },
      false,
      false,
    );
    expect(result).toBe(`export const RoleSchema = Schema.Struct({id:Schema.UUID,
name:Schema.String})
`);
  });
});

describe("makeRelationEffectCode Auth pattern", () => {
  it.concurrent("generates Session relation with user field", () => {
    const result = makeRelationEffectCode(
      {
        name: "sessionRelations",
        baseName: "session",
        fields: [{ name: "user", definition: "UserSchema" }],
      },
      true,
    );
    expect(result).toBe(`
export const SessionRelationsSchema = Schema.Struct({...SessionSchema.fields,user:UserSchema})

export type SessionRelationsEncoded = typeof SessionRelationsSchema.Encoded
`);
  });
});
