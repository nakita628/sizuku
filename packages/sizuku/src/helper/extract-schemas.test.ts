import { describe, expect, it } from "vite-plus/test";
import { extractRelationSchemas, extractSchemas } from "./extract-schemas.js";

// Test run
// pnpm vitest run ./src/helper/extract-schemas.test.ts

describe("extractSchemas", () => {
  const sourceCode = [
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

  const expectedZodSchemas = [
    {
      name: "user",
      fields: [
        {
          name: "id",
          definition: "z.uuid()",
          description: "Primary key",
        },
        {
          name: "name",
          definition: "z.string().min(1).max(50)",
          description: "Display name",
        },
      ],
      objectType: undefined,
    },
    {
      name: "post",
      fields: [
        {
          name: "id",
          definition: "z.uuid()",
          description: "Primary key",
        },
        {
          name: "title",
          definition: "z.string().min(1).max(100)",
          description: "Article title",
        },
        {
          name: "content",
          definition: "z.string()",
          description: "Body content (no length limit)",
        },
        {
          name: "userId",
          definition: "z.uuid()",
          description: "Foreign key referencing User.id",
        },
      ],
      objectType: undefined,
    },
  ];

  const expectedValibotSchemas = [
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
      objectType: undefined,
    },
    {
      name: "post",
      fields: [
        {
          name: "id",
          definition: "v.pipe(v.string(), v.uuid())",
          description: "Primary key",
        },
        {
          name: "title",
          definition: "v.pipe(v.string(), v.minLength(1), v.maxLength(100))",
          description: "Article title",
        },
        {
          name: "content",
          definition: "v.string()",
          description: "Body content (no length limit)",
        },
        {
          name: "userId",
          definition: "v.pipe(v.string(), v.uuid())",
          description: "Foreign key referencing User.id",
        },
      ],
      objectType: undefined,
    },
  ];

  it.concurrent("extractSchemas with zod library", () => {
    const result = extractSchemas(sourceCode, "zod");
    expect(result).toStrictEqual(expectedZodSchemas);
  });

  it.concurrent("extractSchemas with valibot library", () => {
    const result = extractSchemas(sourceCode, "valibot");
    expect(result).toStrictEqual(expectedValibotSchemas);
  });

  it.concurrent("extractSchemas with strictObject and looseObject", () => {
    const sourceCodeWithObjectTypes = [
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
    ];

    const resultZod = extractSchemas(sourceCodeWithObjectTypes, "zod");
    expect(resultZod[0].objectType).toBe("strict");
    expect(resultZod[1].objectType).toBe("loose");

    const resultValibot = extractSchemas(sourceCodeWithObjectTypes, "valibot");
    expect(resultValibot[0].objectType).toBe("strict");
    expect(resultValibot[1].objectType).toBe("loose");
  });
});

describe("extractSchemas (arktype)", () => {
  it("extracts arktype schema fields", () => {
    const code = [
      "export const user = mysqlTable('user', {",
      '  /// @a."string.uuid"',
      "  id: varchar('id', { length: 36 }).primaryKey(),",
      '  /// @a."string>=1"',
      "  name: varchar('name', { length: 50 }).notNull(),",
      "})",
    ];
    const result = extractSchemas(code, "arktype");
    expect(result.length).toBe(1);
    expect(result[0].name).toBe("user");
    expect(result[0].fields.length).toBe(2);
    expect(result[0].fields[0].name).toBe("id");
    expect(result[0].fields[0].definition).toBe('"string.uuid"');
    expect(result[0].fields[1].name).toBe("name");
    expect(result[0].fields[1].definition).toBe('"string>=1"');
  });
});

describe("extractSchemas (effect)", () => {
  it("extracts effect schema fields", () => {
    const code = [
      "export const user = mysqlTable('user', {",
      "  /// @e.Schema.UUID",
      "  id: varchar('id', { length: 36 }).primaryKey(),",
      "  /// @e.Schema.String.pipe(Schema.minLength(1))",
      "  name: varchar('name', { length: 50 }).notNull(),",
      "})",
    ];
    const result = extractSchemas(code, "effect");
    expect(result.length).toBe(1);
    expect(result[0].name).toBe("user");
    expect(result[0].fields.length).toBe(2);
    expect(result[0].fields[0].name).toBe("id");
    expect(result[0].fields[0].definition).toBe("Schema.UUID");
    expect(result[0].fields[1].name).toBe("name");
    expect(result[0].fields[1].definition).toBe("Schema.String.pipe(Schema.minLength(1))");
  });

  it("returns empty array for code without @e. annotations", () => {
    const code = [
      "export const user = mysqlTable('user', {",
      "  id: varchar('id', { length: 36 }).primaryKey(),",
      "})",
    ];
    const result = extractSchemas(code, "effect");
    expect(result.length).toBe(1);
    expect(result[0].fields[0].definition).toBe("");
  });
});

describe("extractSchemas - multi-table SNS pattern", () => {
  const SNS_SCHEMA = [
    "export const user = pgTable('user', {",
    "  /// @z.uuid()",
    "  id: uuid('id').primaryKey(),",
    "  /// @z.string().min(1).max(100)",
    "  name: varchar('name', { length: 100 }).notNull(),",
    "})",
    "",
    "export const post = pgTable('post', {",
    "  /// @z.uuid()",
    "  id: uuid('id').primaryKey(),",
    "  /// @z.string().min(1)",
    "  body: text('body').notNull(),",
    "  /// @z.uuid()",
    "  userId: uuid('user_id').notNull().references(() => user.id),",
    "})",
    "",
    "export const comment = pgTable('comment', {",
    "  /// @z.uuid()",
    "  id: uuid('id').primaryKey(),",
    "  /// @z.string().min(1).max(500)",
    "  content: text('content').notNull(),",
    "  /// @z.uuid()",
    "  postId: uuid('post_id').notNull().references(() => post.id),",
    "  /// @z.uuid()",
    "  userId: uuid('user_id').notNull().references(() => user.id),",
    "})",
    "",
  ];

  it("extracts 3 schemas with correct names and field counts", () => {
    const result = extractSchemas(SNS_SCHEMA, "zod");
    expect(result).toStrictEqual([
      {
        name: "user",
        fields: [
          { name: "id", definition: "z.uuid()", description: undefined },
          { name: "name", definition: "z.string().min(1).max(100)", description: undefined },
        ],
        objectType: undefined,
      },
      {
        name: "post",
        fields: [
          { name: "id", definition: "z.uuid()", description: undefined },
          { name: "body", definition: "z.string().min(1)", description: undefined },
          { name: "userId", definition: "z.uuid()", description: undefined },
        ],
        objectType: undefined,
      },
      {
        name: "comment",
        fields: [
          { name: "id", definition: "z.uuid()", description: undefined },
          { name: "content", definition: "z.string().min(1).max(500)", description: undefined },
          { name: "postId", definition: "z.uuid()", description: undefined },
          { name: "userId", definition: "z.uuid()", description: undefined },
        ],
        objectType: undefined,
      },
    ]);
  });
});

describe("extractSchemas - PostgreSQL dialect", () => {
  const PG_SCHEMA = [
    "export const product = pgTable('product', {",
    "  /// @z.number().int()",
    "  id: serial('id').primaryKey(),",
    "  /// @z.string()",
    "  name: varchar('name', { length: 255 }).notNull(),",
    "  /// @z.number()",
    "  price: doublePrecision('price').notNull(),",
    "})",
    "",
  ];

  it("extracts pgTable schema with PostgreSQL-specific types", () => {
    const result = extractSchemas(PG_SCHEMA, "zod");
    expect(result).toStrictEqual([
      {
        name: "product",
        fields: [
          { name: "id", definition: "z.number().int()", description: undefined },
          { name: "name", definition: "z.string()", description: undefined },
          { name: "price", definition: "z.number()", description: undefined },
        ],
        objectType: undefined,
      },
    ]);
  });
});

describe("extractSchemas - SQLite dialect", () => {
  const SQLITE_SCHEMA = [
    "export const task = sqliteTable('task', {",
    "  /// @z.number().int()",
    "  id: integer('id').primaryKey(),",
    "  /// @z.string()",
    "  title: text('title').notNull(),",
    "})",
    "",
  ];

  it("extracts sqliteTable schema", () => {
    const result = extractSchemas(SQLITE_SCHEMA, "zod");
    expect(result).toStrictEqual([
      {
        name: "task",
        fields: [
          { name: "id", definition: "z.number().int()", description: undefined },
          { name: "title", definition: "z.string()", description: undefined },
        ],
        objectType: undefined,
      },
    ]);
  });
});

describe("extractSchemas - MySQL dialect", () => {
  const MYSQL_SCHEMA = [
    "export const category = mysqlTable('category', {",
    "  /// @z.number().int()",
    "  id: int('id').autoincrement().primaryKey(),",
    "  /// @z.string().min(1)",
    "  name: varchar('name', { length: 100 }).notNull(),",
    "})",
    "",
  ];

  it("extracts mysqlTable schema with field definitions", () => {
    const result = extractSchemas(MYSQL_SCHEMA, "zod");
    expect(result).toStrictEqual([
      {
        name: "category",
        fields: [
          { name: "id", definition: "z.number().int()", description: undefined },
          { name: "name", definition: "z.string().min(1)", description: undefined },
        ],
        objectType: undefined,
      },
    ]);
  });
});

describe("extractSchemas - no annotations", () => {
  const NO_ANNOTATION_SCHEMA = [
    "export const config = pgTable('config', {",
    "  key: text('key').primaryKey(),",
    "  value: text('value').notNull(),",
    "})",
    "",
  ];

  it("extracts fields with empty definitions when no annotations present", () => {
    const result = extractSchemas(NO_ANNOTATION_SCHEMA, "zod");
    expect(result).toStrictEqual([
      {
        name: "config",
        fields: [
          { name: "key", definition: "", description: undefined },
          { name: "value", definition: "", description: undefined },
        ],
        objectType: undefined,
      },
    ]);
  });
});

describe("extractRelationSchemas", () => {
  const RELATION_SCHEMA = [
    "export const user = pgTable('user', {",
    "  /// @z.uuid()",
    "  id: uuid('id').primaryKey(),",
    "  /// @z.string()",
    "  name: text('name').notNull(),",
    "})",
    "",
    "export const post = pgTable('post', {",
    "  /// @z.uuid()",
    "  id: uuid('id').primaryKey(),",
    "  /// @z.uuid()",
    "  userId: uuid('user_id').notNull(),",
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

  it("extracts relation schemas with correct field definitions for zod", () => {
    const result = extractRelationSchemas(RELATION_SCHEMA, "zod");
    expect(result).toStrictEqual([
      {
        name: "userRelations",
        baseName: "user",
        fields: [{ name: "posts", definition: "z.array(PostSchema)", description: undefined }],
        objectType: undefined,
      },
      {
        name: "postRelations",
        baseName: "post",
        fields: [{ name: "user", definition: "UserSchema", description: undefined }],
        objectType: undefined,
      },
    ]);
  });
});

describe("extractSchemas - ArkType extraction", () => {
  const ARKTYPE_SCHEMA = [
    "export const user = pgTable('user', {",
    '  /// @a."string.uuid"',
    "  id: uuid('id').primaryKey(),",
    '  /// @a."string.email"',
    "  email: text('email').notNull(),",
    "})",
    "",
  ];

  it("extracts ArkType-specific definitions", () => {
    const result = extractSchemas(ARKTYPE_SCHEMA, "arktype");
    expect(result).toStrictEqual([
      {
        name: "user",
        fields: [
          { name: "id", definition: '"string.uuid"', description: undefined },
          { name: "email", definition: '"string.email"', description: undefined },
        ],
        objectType: undefined,
      },
    ]);
  });
});

describe("extractSchemas - Effect extraction", () => {
  const EFFECT_SCHEMA = [
    "export const user = pgTable('user', {",
    "  /// @e.Schema.UUID",
    "  id: uuid('id').primaryKey(),",
    "  /// @e.Schema.String",
    "  name: text('name').notNull(),",
    "})",
    "",
  ];

  it("extracts Effect-specific definitions", () => {
    const result = extractSchemas(EFFECT_SCHEMA, "effect");
    expect(result).toStrictEqual([
      {
        name: "user",
        fields: [
          { name: "id", definition: "Schema.UUID", description: undefined },
          { name: "name", definition: "Schema.String", description: undefined },
        ],
        objectType: undefined,
      },
    ]);
  });
});

describe("extractSchemas - empty schema", () => {
  it("returns empty array when no tables present", () => {
    const result = extractSchemas([""], "zod");
    expect(result).toStrictEqual([]);
  });
});
