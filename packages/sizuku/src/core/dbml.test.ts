import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { stripImports } from "../utils/index.js";
import { sizukuDbml } from "./dbml.js";

const ecSchemaContent = `import { mysqlTable, varchar, int, decimal, timestamp } from 'drizzle-orm/mysql-core'
import { relations } from 'drizzle-orm'

export const user = mysqlTable('user', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
})

export const order = mysqlTable('order', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => user.id),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').notNull(),
})

export const orderItem = mysqlTable('order_item', {
  id: int('id').primaryKey().autoincrement(),
  orderId: int('order_id').notNull().references(() => order.id),
  productName: varchar('product_name', { length: 200 }).notNull(),
  quantity: int('quantity').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
})`;

const singleTableSchema = `import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const config = sqliteTable('config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})`;

const pgAuthSchema = `import { pgTable, uuid, varchar, timestamp, boolean } from 'drizzle-orm/pg-core'

/// Account table
export const account = pgTable('account', {
  /// Primary key
  id: uuid('id').primaryKey().defaultRandom(),
  /// User email address
  email: varchar('email', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  isActive: boolean('is_active').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})`;

describe("E2E: DBML generation", () => {
  let tmpdir: string;

  beforeEach(() => {
    tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "sizuku-e2e-dbml-"));
  });

  afterEach(() => {
    fs.rmSync(tmpdir, { recursive: true, force: true });
  });

  it("generates DBML with correct table and column definitions for EC schema", async () => {
    fs.writeFileSync(path.join(tmpdir, "schema.ts"), ecSchemaContent, "utf-8");
    const output = path.join(tmpdir, "output", "schema.dbml");

    const code = stripImports(ecSchemaContent);
    const result = await sizukuDbml(code, output);

    expect(result.ok).toBe(true);
    expect(fs.existsSync(output)).toBe(true);

    const content = fs.readFileSync(output, "utf-8");

    // Tables exist
    expect(content.includes("Table user {")).toBe(true);
    expect(content.includes("Table order {")).toBe(true);
    expect(content.includes("Table orderItem {")).toBe(true);

    // User columns
    expect(content.includes("id varchar [pk]")).toBe(true);
    expect(content.includes("name varchar")).toBe(true);
    expect(content.includes("email varchar")).toBe(true);

    // Order columns
    expect(content.includes("userId varchar")).toBe(true);
    expect(content.includes("total decimal")).toBe(true);
    expect(content.includes("createdAt timestamp")).toBe(true);

    // OrderItem columns
    expect(content.includes("orderId int")).toBe(true);
    expect(content.includes("productName varchar")).toBe(true);
    expect(content.includes("quantity int")).toBe(true);
    expect(content.includes("price decimal")).toBe(true);

    // Foreign key refs
    expect(content.includes("Ref order_userId_user_id_fk: order.userId > user.id")).toBe(true);
    expect(
      content.includes("Ref orderItem_orderId_order_id_fk: orderItem.orderId > order.id"),
    ).toBe(true);
  });

  it("generates DBML with field descriptions as notes for auth schema", async () => {
    fs.writeFileSync(path.join(tmpdir, "schema.ts"), pgAuthSchema, "utf-8");
    const output = path.join(tmpdir, "output", "auth.dbml");

    const code = stripImports(pgAuthSchema);
    const result = await sizukuDbml(code, output);

    expect(result.ok).toBe(true);
    const content = fs.readFileSync(output, "utf-8");

    expect(content.includes("Table account {")).toBe(true);
    expect(content.includes("note: 'Primary key'")).toBe(true);
    expect(content.includes("note: 'User email address'")).toBe(true);
  });

  it("generates DBML for single-table schema without refs", async () => {
    fs.writeFileSync(path.join(tmpdir, "schema.ts"), singleTableSchema, "utf-8");
    const output = path.join(tmpdir, "output", "config.dbml");

    const code = stripImports(singleTableSchema);
    const result = await sizukuDbml(code, output);

    expect(result.ok).toBe(true);
    const content = fs.readFileSync(output, "utf-8");

    expect(content.includes("Table config {")).toBe(true);
    expect(content.includes("key text [pk]")).toBe(true);
    expect(content.includes("value text")).toBe(true);
    // No Ref lines
    expect(content.includes("Ref ")).toBe(false);
  });
});

describe("E2E: PNG generation", () => {
  let tmpdir: string;

  beforeEach(() => {
    tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "sizuku-e2e-png-"));
  });

  afterEach(() => {
    fs.rmSync(tmpdir, { recursive: true, force: true });
  });

  it("generates valid PNG binary for EC schema", async () => {
    fs.writeFileSync(path.join(tmpdir, "schema.ts"), ecSchemaContent, "utf-8");
    const output = path.join(tmpdir, "output", "er.png");

    const code = stripImports(ecSchemaContent);
    const result = await sizukuDbml(code, output);

    expect(result.ok).toBe(true);
    expect(fs.existsSync(output)).toBe(true);

    const buffer = fs.readFileSync(output);
    // PNG magic bytes: 89 50 4E 47 (‰PNG)
    expect(buffer[0]).toBe(0x89);
    expect(buffer[1]).toBe(0x50);
    expect(buffer[2]).toBe(0x4e);
    expect(buffer[3]).toBe(0x47);
    expect(buffer.length > 1000).toBe(true);
  });

  it("generates valid PNG for single-table schema", async () => {
    fs.writeFileSync(path.join(tmpdir, "schema.ts"), singleTableSchema, "utf-8");
    const output = path.join(tmpdir, "output", "config.png");

    const code = stripImports(singleTableSchema);
    const result = await sizukuDbml(code, output);

    expect(result.ok).toBe(true);
    expect(fs.existsSync(output)).toBe(true);

    const buffer = fs.readFileSync(output);
    expect(buffer[0]).toBe(0x89);
    expect(buffer[1]).toBe(0x50);
    expect(buffer[2]).toBe(0x4e);
    expect(buffer[3]).toBe(0x47);
  });
});
