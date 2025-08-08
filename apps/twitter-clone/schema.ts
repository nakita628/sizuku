import { relations, sql } from 'drizzle-orm'
import { foreignKey, int, numeric, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

/// @relation User.id Post.userId one-to-many
/// @relation User.id Comment.userId one-to-many
/// @relation User.id Notification.userId one-to-many
/// @relation User.id Follow.followerId one-to-many
/// @relation User.id Follow.followingId one-to-many
/// @relation User.id Like.userId one-to-many
export const User = sqliteTable('User', {
  /// Unique identifier for the user
  /// @z.uuid()
  /// @v.pipe(v.string(), v.uuid()),
  id: text('id').notNull().primaryKey().default(sql`uuid(4)`),
  /// User's display name
  /// @z.string()
  /// @v.string()
  name: text('name').notNull(),
  /// User's biography or profile description
  /// @z.string().optional().default("")
  ///
  username: text('username').notNull().unique(),
  /// User's biography or profile description
  /// @z.string().optional().default("")
  /// @v.optional(v.string(),"")
  bio: text('bio'),
  /// User's unique email address
  /// @z.email()
  /// @v.pipe(v.string(),v.email())
  email: text('email').notNull().unique(),
  /// Timestamp of email verification
  /// @z.date().nullable()
  /// @v.nullable(v.date())
  emailVerified: numeric('emailVerified'),
  /// URL of user's image
  /// @z.url().nullable()
  /// @v.nullable(v.string())
  image: text('image'),
  /// URL of user's cover image
  /// @z.url().nullable()
  /// @v.nullable(v.string())
  coverImage: text('coverImage'),
  /// URL of user's profile image
  /// @z.url().nullable()
  /// @v.nullable(v.string())
  profileImage: text('profileImage'),
  /// Hashed password for security
  /// @z.string()
  /// @v.string()
  hashedPassword: text('hashedPassword'),
  /// Timestamp when the user was created
  /// @z.iso.datetime()
  /// @v.pipe(v.string(),v.isoDate())
  createdAt: numeric('createdAt').notNull().default(sql`DATE('now')`),
  /// Timestamp when the user was last updated
  /// @z.iso.datetime()
  /// @v.pipe(v.string(),v.isoDate())
  updatedAt: numeric('updatedAt').notNull(),
  /// Flag indicating if user has unread notifications
  /// @z.boolean().default(false)
  /// @v.optional(v.boolean(),false)
  hasNotification: int('hasNotification', { mode: 'boolean' }),
})

export const Post = sqliteTable(
  'Post',
  {
    /// Unique identifier for the post
    /// @z.uuid()
    /// @v.pipe(v.string(), v.uuid()),
    id: text('id').notNull().primaryKey().default(sql`uuid(4)`),
    /// Body content of the post
    /// @z.string().min(1).max(65535)
    /// @v.pipe(v.string(), v.minLength(1), v.maxLength(65535))
    body: text('body').notNull(),
    /// Timestamp when the post was created
    /// @z.iso.datetime()
    /// @v.pipe(v.string(),v.isoDate())
    createdAt: numeric('createdAt').notNull().default(sql`DATE('now')`),
    /// Timestamp when the post was last updated
    /// @z.iso.datetime()
    /// @v.pipe(v.string(),v.isoDate())
    updatedAt: numeric('updatedAt').notNull(),
    /// Foreign key referencing User.id
    /// @z.uuid()
    /// @v.pipe(v.string(), v.uuid()),
    userId: text('userId').notNull(),
  },
  (Post) => ({
    Post_user_fkey: foreignKey({
      name: 'Post_user_fkey',
      columns: [Post.userId],
      foreignColumns: [User.id],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
  }),
)

export const Follow = sqliteTable(
  'Follow',
  {
    /// Unique identifier for the follow relationship
    /// @z.uuid()
    /// @v.pipe(v.string(), v.uuid()),
    id: text('id').notNull().primaryKey().default(sql`uuid(4)`),
    /// Foreign key referencing User.id
    /// @z.uuid()
    /// @v.pipe(v.string(), v.uuid()),
    followerId: text('followerId').notNull(),
    /// Foreign key referencing User.id
    /// @z.uuid()
    /// @v.pipe(v.string(), v.uuid()),
    followingId: text('followingId').notNull(),
    /// Timestamp when the follow relationship was created
    /// @z.iso.datetime()
    /// @v.pipe(v.string(),v.isoDate())
    createdAt: numeric('createdAt').notNull().default(sql`DATE('now')`),
  },
  (Follow) => ({
    Follow_follower_fkey: foreignKey({
      name: 'Follow_follower_fkey',
      columns: [Follow.followerId],
      foreignColumns: [User.id],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
    Follow_following_fkey: foreignKey({
      name: 'Follow_following_fkey',
      columns: [Follow.followingId],
      foreignColumns: [User.id],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
    Follow_followerId_followingId_unique_idx: uniqueIndex('Follow_followerId_followingId_key').on(
      Follow.followerId,
      Follow.followingId,
    ),
  }),
)

export const Like = sqliteTable(
  'Like',
  {
    /// Unique identifier for the like relationship
    /// @z.uuid()
    /// @v.pipe(v.string(), v.uuid()),
    id: text('id').notNull().primaryKey().default(sql`uuid(4)`),
    /// Foreign key referencing User.id
    /// @z.uuid()
    /// @v.pipe(v.string(), v.uuid()),
    userId: text('userId').notNull(),
    /// Foreign key referencing Post.id
    /// @z.uuid()
    /// @v.pipe(v.string(), v.uuid()),
    postId: text('postId').notNull(),
    /// Timestamp when the like relationship was created
    /// @v.pipe(v.string(),v.isoDate())
    createdAt: numeric('createdAt').notNull().default(sql`DATE('now')`),
  },
  (Like) => ({
    Like_user_fkey: foreignKey({
      name: 'Like_user_fkey',
      columns: [Like.userId],
      foreignColumns: [User.id],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
    Like_post_fkey: foreignKey({
      name: 'Like_post_fkey',
      columns: [Like.postId],
      foreignColumns: [Post.id],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
    Like_userId_postId_unique_idx: uniqueIndex('Like_userId_postId_key').on(
      Like.userId,
      Like.postId,
    ),
  }),
)

export const Comment = sqliteTable(
  'Comment',
  {
    /// Unique identifier for the comment
    /// @z.uuid()
    /// @v.pipe(v.string(), v.uuid()),
    id: text('id').notNull().primaryKey().default(sql`uuid(4)`),
    /// Body content of the comment
    /// @z.string().min(1).max(65535)
    /// @v.pipe(v.string(), v.minLength(1), v.maxLength(65535))
    body: text('body').notNull(),
    /// Timestamp when the comment was created
    /// @z.iso.datetime()
    /// @v.pipe(v.string(),v.isoDate())
    createdAt: numeric('createdAt').notNull().default(sql`DATE('now')`),
    /// Timestamp when the comment was last updated
    /// @z.iso.datetime()
    /// @v.pipe(v.string(),v.isoDate())
    updatedAt: numeric('updatedAt').notNull(),
    /// Foreign key referencing User.id
    /// @z.uuid()
    /// @v.pipe(v.string(), v.uuid()),
    userId: text('userId').notNull(),
    /// Foreign key referencing Post.id
    /// @z.uuid()
    /// @v.pipe(v.string(), v.uuid()),
    postId: text('postId').notNull(),
  },
  (Comment) => ({
    Comment_user_fkey: foreignKey({
      name: 'Comment_user_fkey',
      columns: [Comment.userId],
      foreignColumns: [User.id],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
    Comment_post_fkey: foreignKey({
      name: 'Comment_post_fkey',
      columns: [Comment.postId],
      foreignColumns: [Post.id],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
  }),
)

export const Notification = sqliteTable(
  'Notification',
  {
    /// Unique identifier for the notification
    /// @z.uuid()
    /// @v.pipe(v.string(), v.uuid()),
    id: text('id').notNull().primaryKey().default(sql`uuid(4)`),
    /// Body content of the notification
    /// @z.string().min(1).max(65535)
    /// @v.pipe(v.string(), v.minLength(1), v.maxLength(65535))
    body: text('body').notNull(),
    /// Foreign key referencing User.id
    /// @z.uuid()
    /// @v.pipe(v.string(), v.uuid()),
    userId: text('userId').notNull(),
    /// Timestamp when the notification was created
    /// @z.iso.datetime()
    /// @v.pipe(v.string(),v.isoDate())
    createdAt: numeric('createdAt').notNull().default(sql`DATE('now')`),
  },
  (Notification) => ({
    Notification_user_fkey: foreignKey({
      name: 'Notification_user_fkey',
      columns: [Notification.userId],
      foreignColumns: [User.id],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
  }),
)

export const UserRelations = relations(User, ({ many }) => ({
  posts: many(Post, {
    relationName: 'PostToUser',
  }),
  comments: many(Comment, {
    relationName: 'CommentToUser',
  }),
  notifications: many(Notification, {
    relationName: 'NotificationToUser',
  }),
  followers: many(Follow, {
    relationName: 'Follower',
  }),
  following: many(Follow, {
    relationName: 'Following',
  }),
  likes: many(Like, {
    relationName: 'LikeToUser',
  }),
}))

export const PostRelations = relations(Post, ({ one, many }) => ({
  user: one(User, {
    relationName: 'PostToUser',
    fields: [Post.userId],
    references: [User.id],
  }),
  comments: many(Comment, {
    relationName: 'CommentToPost',
  }),
  likes: many(Like, {
    relationName: 'LikeToPost',
  }),
}))

export const FollowRelations = relations(Follow, ({ one }) => ({
  follower: one(User, {
    relationName: 'Following',
    fields: [Follow.followerId],
    references: [User.id],
  }),
  following: one(User, {
    relationName: 'Follower',
    fields: [Follow.followingId],
    references: [User.id],
  }),
}))

export const LikeRelations = relations(Like, ({ one }) => ({
  user: one(User, {
    relationName: 'LikeToUser',
    fields: [Like.userId],
    references: [User.id],
  }),
  post: one(Post, {
    relationName: 'LikeToPost',
    fields: [Like.postId],
    references: [Post.id],
  }),
}))

export const CommentRelations = relations(Comment, ({ one }) => ({
  user: one(User, {
    relationName: 'CommentToUser',
    fields: [Comment.userId],
    references: [User.id],
  }),
  post: one(Post, {
    relationName: 'CommentToPost',
    fields: [Comment.postId],
    references: [Post.id],
  }),
}))

export const NotificationRelations = relations(Notification, ({ one }) => ({
  user: one(User, {
    relationName: 'NotificationToUser',
    fields: [Notification.userId],
    references: [User.id],
  }),
}))
