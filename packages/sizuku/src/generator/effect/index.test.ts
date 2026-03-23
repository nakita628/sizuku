import fs from "node:fs";
import fsp from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { effectCode, sizukuEffect } from "./index.js";

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
    if (fs.existsSync("tmp/effect-test.ts")) {
      fs.unlinkSync("tmp/effect-test.ts");
    }
    if (fs.existsSync("tmp")) {
      fs.rmdirSync("tmp", { recursive: true });
    }
  });

  it("sizukuEffect", async () => {
    await sizukuEffect(TEST_CODE, "tmp/effect-test.ts");
    const result = await fsp.readFile("tmp/effect-test.ts", "utf-8");
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
    await sizukuEffect(TEST_CODE, "tmp/effect-test.ts", false, true);
    const result = await fsp.readFile("tmp/effect-test.ts", "utf-8");
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
    await sizukuEffect(TEST_CODE, "tmp/effect-test.ts", false, false, true);
    const result = await fsp.readFile("tmp/effect-test.ts", "utf-8");
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
