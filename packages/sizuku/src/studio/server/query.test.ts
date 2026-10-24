import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Effect } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { createStudioApi } from "./app.js";
import { connectDatabase } from "./services/database.js";
import { configureStudio } from "./services/studio.js";

const BASE = "http://127.0.0.1";

// The columns live in a file of their own, imported without an extension, as a bundler allows.
const columns = `import { integer } from "drizzle-orm/sqlite-core";

export const id = () => integer("id").primaryKey({ autoIncrement: true });
`;

const schema = `import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { id } from "./columns";

export const user = sqliteTable("users", {
  id: id(),
  name: text("name").notNull(),
});

export const post = sqliteTable("posts", {
  id: id(),
  authorId: integer("author_id").notNull().references((): AnySQLiteColumn => user.id),
  title: text("title").notNull(),
  published: integer("published", { mode: "boolean" }).notNull().default(false),
});

export const userRelations = relations(user, ({ many }) => ({ posts: many(post) }));
export const postRelations = relations(post, ({ one }) => ({
  author: one(user, { fields: [post.authorId], references: [user.id] }),
}));
`;

// Inside the package, so the project's typescript and drizzle-orm resolve as they would in an app.
describe("running Drizzle against the database", () => {
  let dir: string;
  let file: string;
  let request: (url: string, body: unknown) => Promise<Response>;

  const run = async (code: string) => (await request("/api/drizzle", { code })).json();

  beforeAll(async () => {
    dir = fs.mkdtempSync(path.join(import.meta.dirname, ".query-"));
    file = path.join(dir, "schema.ts");
    fs.writeFileSync(path.join(dir, "columns.ts"), columns);
    fs.writeFileSync(file, schema);
    const dbFile = path.join(dir, "dev.db");
    const seed = new DatabaseSync(dbFile);
    seed.exec(`
      CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL);
      CREATE TABLE posts (id INTEGER PRIMARY KEY AUTOINCREMENT, author_id INTEGER NOT NULL,
        title TEXT NOT NULL, published INTEGER NOT NULL DEFAULT 0);
      INSERT INTO users (name) VALUES ('Ada'), ('Linus');
      INSERT INTO posts (author_id, title, published) VALUES (1, 'Engines', 1), (2, 'Kernels', 0), (1, 'Notes', 1);
    `);
    seed.close();
    const database = await Effect.runPromise(connectDatabase({ url: `file:${dbFile}`, cwd: dir }));
    configureStudio({ schemaPath: file, cwd: dir, database });
    const api = createStudioApi();
    request = (url, body) =>
      api.request(`${BASE}${url}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("gives the rows of the last expression, and the SQL it sent", async () => {
    const out = await run("db.select().from(user)");
    expect(out.error).toBeNull();
    expect(out.result).toStrictEqual([
      { id: 1, name: "Ada" },
      { id: 2, name: "Linus" },
    ]);
    expect(out.statements).toHaveLength(1);
    expect(out.statements[0].sql).toBe('select "id", "name" from "users"');
  });

  it("has the operators and the schema in scope, and maps booleans back", async () => {
    const out = await run(
      "await db.select({ title: post.title, published: post.published }).from(post).where(eq(post.published, true)).orderBy(desc(post.id))",
    );
    expect(out.result).toStrictEqual([
      { title: "Notes", published: true },
      { title: "Engines", published: true },
    ]);
    expect(out.statements[0].params).toStrictEqual([1]);
  });

  it("runs relational queries", async () => {
    const out = await run(
      "db.query.post.findFirst({ where: eq(post.id, 2), with: { author: true } })",
    );
    expect(out.error).toBeNull();
    expect(out.result).toMatchObject({ title: "Kernels", author: { name: "Linus" } });
  });

  it("keeps both columns of a join that share a name", async () => {
    const out = await run(
      "db.select({ postId: post.id, userId: user.id }).from(post).innerJoin(user, eq(post.authorId, user.id)).where(eq(post.id, 2))",
    );
    expect(out.result).toStrictEqual([{ postId: 2, userId: 2 }]);
  });

  it("runs several statements, writes included, up to an explicit return", async () => {
    const out =
      await run(`const [added] = await db.insert(user).values({ name: "Grace" }).returning();
const total = await db.$count(user);
return { added, total };`);
    expect(out.error).toBeNull();
    expect(out.result).toStrictEqual({ added: { id: 3, name: "Grace" }, total: 3 });
    expect(out.statements.map((s: { sql: string }) => s.sql.split(" ")[0])).toStrictEqual([
      "insert",
      "select",
    ]);
  });

  it("reports what the code threw with the statements that ran before it", async () => {
    const out = await run(`await db.select().from(user);
throw new Error("stop here");`);
    expect(out.error).toBe("stop here");
    expect(out.result).toBeNull();
    expect(out.statements).toHaveLength(1);
  });

  it("reports what the database rejected", async () => {
    const out = await run("db.run(sql`select * from nope`)");
    expect(out.error).toContain("no such table");
  });

  it("answers code that does not parse with a 422 naming the line", async () => {
    const res = await request("/api/drizzle", { code: "const a = 1;\ndb.select(" });
    expect(res.status).toBe(422);
    expect((await res.json()).errors[0].message).toMatch(/\(line 2, column \d+\)$/);
  });

  it("picks up a saved change to the schema", async () => {
    fs.writeFileSync(
      file,
      schema.replace(
        'name: text("name").notNull(),',
        'name: text("name").notNull(),\n  nick: text("name"),',
      ),
    );
    // The mtime is the version, and two writes can share one.
    const later = new Date(Date.now() + 2000);
    fs.utimesSync(file, later, later);
    const out = await run("db.select({ nick: user.nick }).from(user).where(eq(user.id, 1))");
    expect(out.result).toStrictEqual([{ nick: "Ada" }]);
    fs.writeFileSync(file, schema);
  });

  // The first question about a query reads drizzle-orm's types, which takes seconds on CI.
  it(
    "completes db and the tables in the query editor, against the saved schema",
    { timeout: 60_000 },
    async () => {
      const complete = async (source: string) => {
        const res = await request("/api/language/complete", {
          source,
          offset: source.length,
          document: "query",
        });
        return (await res.json()).items.map((item: { label: string }) => item.label);
      };
      expect(await complete("db.")).toEqual(
        expect.arrayContaining(["select", "insert", "query", "$count"]),
      );
      expect(await complete("db.query.")).toEqual(expect.arrayContaining(["user", "post"]));
      expect(await complete("db.select().from(post).where(eq(post.")).toEqual(
        expect.arrayContaining(["authorId", "title", "published"]),
      );

      const typo = "db.select().from(post).where(eq(post.titel, 1))";
      const { diagnostics } = await (
        await request("/api/language/diagnostics", { source: typo, document: "query" })
      ).json();
      expect(diagnostics.map((d: { message: string }) => d.message).join("\n")).toContain("titel");
      expect(typo.slice(diagnostics[0].range.start, diagnostics[0].range.end)).toBe("titel");
    },
  );
});
