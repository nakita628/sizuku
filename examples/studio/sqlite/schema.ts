import { relations, sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** サインインするユーザー */
export const user = sqliteTable("users", {
  /** 主キー */
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** ログインに使うメールアドレス */
  email: text("email").notNull().unique(),
  /** 表示名 */
  name: text("name").notNull(),
  /** 管理者かどうか（0 / 1） */
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

/** 記事 */
export const post = sqliteTable(
  "posts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** 書いたユーザー */
    authorId: integer("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    /** 公開済みかどうか */
    published: integer("published", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("posts_author_idx").on(t.authorId)],
);

/** 記事へのコメント */
export const comment = sqliteTable("comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  postId: integer("post_id")
    .notNull()
    .references(() => post.id, { onDelete: "cascade" }),
  /** コメントしたユーザー（退会すると null） */
  authorId: integer("author_id").references(() => user.id, { onDelete: "set null" }),
  body: text("body").notNull(),
});

/** タグ */
export const tag = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
});

/** 記事とタグの対応（複合主キー） */
export const postTag = sqliteTable(
  "post_tags",
  {
    postId: integer("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.tagId] })],
);

export const userRelations = relations(user, ({ many }) => ({
  posts: many(post),
  comments: many(comment),
}));

export const postRelations = relations(post, ({ one, many }) => ({
  author: one(user, { fields: [post.authorId], references: [user.id] }),
  comments: many(comment),
  tags: many(postTag),
}));

export const commentRelations = relations(comment, ({ one }) => ({
  post: one(post, { fields: [comment.postId], references: [post.id] }),
  author: one(user, { fields: [comment.authorId], references: [user.id] }),
}));

export const tagRelations = relations(tag, ({ many }) => ({
  posts: many(postTag),
}));

export const postTagRelations = relations(postTag, ({ one }) => ({
  post: one(post, { fields: [postTag.postId], references: [post.id] }),
  tag: one(tag, { fields: [postTag.tagId], references: [tag.id] }),
}));
