import { relations } from "drizzle-orm";
import { mysqlTable, varchar } from "drizzle-orm/mysql-core";

export const user = mysqlTable("user", {
  /** Primary key */
  id: varchar("id", { length: 36 }).primaryKey(),
  /** Display name */
  name: varchar("name", { length: 50 }).notNull(),
});

export const post = mysqlTable("post", {
  /** Primary key */
  id: varchar("id", { length: 36 }).primaryKey(),
  /** Article title */
  title: varchar("title", { length: 100 }).notNull(),
  /** Body content (no length limit) */
  content: varchar("content", { length: 65535 }).notNull(),
  /** Foreign key referencing User.id */
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => user.id),
});

export const userRelations = relations(user, ({ many }) => ({
  posts: many(post),
}));

export const postRelations = relations(post, ({ one }) => ({
  user: one(user, {
    fields: [post.userId],
    references: [user.id],
  }),
}));
