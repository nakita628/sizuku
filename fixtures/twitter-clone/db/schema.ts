import { relations } from 'drizzle-orm'
import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  /// Unique identifier for the user
  /// @z.uuid()
  /// @v.pipe(v.string(), v.uuid())
  /// @a."string.uuid"
  /// @e.Schema.UUID
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  /// User's display name
  /// @z.string()
  /// @v.string()
  /// @a.string
  /// @e.Schema.String
  name: text().notNull(),
  /// User's unique username
  /// @z.string().min(1).max(50)
  /// @v.pipe(v.string(), v.minLength(1), v.maxLength(50))
  /// @a."1 <= string <= 50"
  /// @e.Schema.String.pipe(Schema.minLength(1), Schema.maxLength(50))
  username: text().notNull().unique(),
  /// User's biography or profile description
  /// @z.string().optional().default("")
  /// @v.optional(v.string(),"")
  /// @a."string | undefined"
  /// @e.Schema.optional(Schema.String)
  bio: text(),
  /// User's unique email address
  /// @z.email()
  /// @v.pipe(v.string(),v.email())
  /// @a."string.email"
  /// @e.Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
  email: text().notNull().unique(),
  /// Timestamp of email verification
  /// @z.date().nullable()
  /// @v.nullable(v.date())
  /// @a."Date | null"
  /// @e.Schema.NullOr(Schema.Date)
  emailVerified: integer({ mode: 'timestamp' }),
  /// URL of user's image
  /// @z.url().nullable()
  /// @v.nullable(v.string())
  /// @a."string.url | null"
  /// @e.Schema.NullOr(Schema.String.pipe(Schema.pattern(/^https?:\/\//)))
  image: text(),
  /// URL of user's cover image
  /// @z.url().nullable()
  /// @v.nullable(v.string())
  /// @a."string.url | null"
  /// @e.Schema.NullOr(Schema.String.pipe(Schema.pattern(/^https?:\/\//)))
  coverImage: text(),
  /// URL of user's profile image
  /// @z.url().nullable()
  /// @v.nullable(v.string())
  /// @a."string.url | null"
  /// @e.Schema.NullOr(Schema.String.pipe(Schema.pattern(/^https?:\/\//)))
  profileImage: text(),
  /// Hashed password for security
  /// @z.string()
  /// @v.string()
  /// @a.string
  /// @e.Schema.String
  hashedPassword: text(),
  /// Timestamp when the user was created
  /// @z.iso.datetime()
  /// @v.pipe(v.string(),v.isoDate())
  /// @a."string.date.iso"
  /// @e.Schema.DateTimeUtc
  createdAt: integer({ mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  /// Timestamp when the user was last updated
  /// @z.iso.datetime()
  /// @v.pipe(v.string(),v.isoDate())
  /// @a."string.date.iso"
  /// @e.Schema.DateTimeUtc
  updatedAt: integer({ mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
  /// Flag indicating if user has unread notifications
  /// @z.boolean().default(false)
  /// @v.optional(v.boolean(),false)
  /// @a."boolean = false"
  /// @e.Schema.optionalWith(Schema.Boolean, { default: () => false })
  hasNotification: integer({ mode: 'boolean' }),
})

export const posts = sqliteTable('posts', {
  /// Unique identifier for the post
  /// @z.uuid()
  /// @v.pipe(v.string(), v.uuid())
  /// @a."string.uuid"
  /// @e.Schema.UUID
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  /// Body content of the post
  /// @z.string().min(1).max(65535)
  /// @v.pipe(v.string(), v.minLength(1), v.maxLength(65535))
  /// @a."1 <= string <= 65535"
  /// @e.Schema.String.pipe(Schema.minLength(1), Schema.maxLength(65535))
  body: text().notNull(),
  /// Timestamp when the post was created
  /// @z.iso.datetime()
  /// @v.pipe(v.string(),v.isoDate())
  /// @a."string.date.iso"
  /// @e.Schema.DateTimeUtc
  createdAt: integer({ mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  /// Timestamp when the post was last updated
  /// @z.iso.datetime()
  /// @v.pipe(v.string(),v.isoDate())
  /// @a."string.date.iso"
  /// @e.Schema.DateTimeUtc
  updatedAt: integer({ mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
  /// Foreign key referencing users.id
  /// @z.uuid()
  /// @v.pipe(v.string(), v.uuid())
  /// @a."string.uuid"
  /// @e.Schema.UUID
  userId: text()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
})

export const follows = sqliteTable(
  'follows',
  {
    /// Foreign key referencing users.id
    /// @z.uuid()
    /// @v.pipe(v.string(), v.uuid())
    /// @a."string.uuid"
    /// @e.Schema.UUID
    followerId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    /// Foreign key referencing users.id
    /// @z.uuid()
    /// @v.pipe(v.string(), v.uuid())
    /// @a."string.uuid"
    /// @e.Schema.UUID
    followingId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    /// Timestamp when the follow relationship was created
    /// @z.iso.datetime()
    /// @v.pipe(v.string(),v.isoDate())
    /// @a."string.date.iso"
    /// @e.Schema.DateTimeUtc
    createdAt: integer({ mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.followerId, t.followingId] })],
)

export const likes = sqliteTable(
  'likes',
  {
    /// Foreign key referencing users.id
    /// @z.uuid()
    /// @v.pipe(v.string(), v.uuid())
    /// @a."string.uuid"
    /// @e.Schema.UUID
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    /// Foreign key referencing posts.id
    /// @z.uuid()
    /// @v.pipe(v.string(), v.uuid())
    /// @a."string.uuid"
    /// @e.Schema.UUID
    postId: text()
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    /// Timestamp when the like relationship was created
    /// @z.iso.datetime()
    /// @v.pipe(v.string(),v.isoDate())
    /// @a."string.date.iso"
    /// @e.Schema.DateTimeUtc
    createdAt: integer({ mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.userId, t.postId] })],
)

export const comments = sqliteTable('comments', {
  /// Unique identifier for the comment
  /// @z.uuid()
  /// @v.pipe(v.string(), v.uuid())
  /// @a."string.uuid"
  /// @e.Schema.UUID
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  /// Body content of the comment
  /// @z.string().min(1).max(65535)
  /// @v.pipe(v.string(), v.minLength(1), v.maxLength(65535))
  /// @a."1 <= string <= 65535"
  /// @e.Schema.String.pipe(Schema.minLength(1), Schema.maxLength(65535))
  body: text().notNull(),
  /// Timestamp when the comment was created
  /// @z.iso.datetime()
  /// @v.pipe(v.string(),v.isoDate())
  /// @a."string.date.iso"
  /// @e.Schema.DateTimeUtc
  createdAt: integer({ mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  /// Timestamp when the comment was last updated
  /// @z.iso.datetime()
  /// @v.pipe(v.string(),v.isoDate())
  /// @a."string.date.iso"
  /// @e.Schema.DateTimeUtc
  updatedAt: integer({ mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
  /// Foreign key referencing users.id
  /// @z.uuid()
  /// @v.pipe(v.string(), v.uuid())
  /// @a."string.uuid"
  /// @e.Schema.UUID
  userId: text()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  /// Foreign key referencing posts.id
  /// @z.uuid()
  /// @v.pipe(v.string(), v.uuid())
  /// @a."string.uuid"
  /// @e.Schema.UUID
  postId: text()
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
})

export const notifications = sqliteTable('notifications', {
  /// Unique identifier for the notification
  /// @z.uuid()
  /// @v.pipe(v.string(), v.uuid())
  /// @a."string.uuid"
  /// @e.Schema.UUID
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  /// Body content of the notification
  /// @z.string().min(1).max(65535)
  /// @v.pipe(v.string(), v.minLength(1), v.maxLength(65535))
  /// @a."1 <= string <= 65535"
  /// @e.Schema.String.pipe(Schema.minLength(1), Schema.maxLength(65535))
  body: text().notNull(),
  /// Foreign key referencing users.id
  /// @z.uuid()
  /// @v.pipe(v.string(), v.uuid())
  /// @a."string.uuid"
  /// @e.Schema.UUID
  userId: text()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  /// Timestamp when the notification was created
  /// @z.iso.datetime()
  /// @v.pipe(v.string(),v.isoDate())
  /// @a."string.date.iso"
  /// @e.Schema.DateTimeUtc
  createdAt: integer({ mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts, {
    relationName: 'PostToUser',
  }),
  comments: many(comments, {
    relationName: 'CommentToUser',
  }),
  notifications: many(notifications, {
    relationName: 'NotificationToUser',
  }),
  followers: many(follows, {
    relationName: 'Follower',
  }),
  following: many(follows, {
    relationName: 'Following',
  }),
  likes: many(likes, {
    relationName: 'LikeToUser',
  }),
}))

export const postsRelations = relations(posts, ({ one, many }) => ({
  user: one(users, {
    relationName: 'PostToUser',
    fields: [posts.userId],
    references: [users.id],
  }),
  comments: many(comments, {
    relationName: 'CommentToPost',
  }),
  likes: many(likes, {
    relationName: 'LikeToPost',
  }),
}))

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    relationName: 'Following',
    fields: [follows.followerId],
    references: [users.id],
  }),
  following: one(users, {
    relationName: 'Follower',
    fields: [follows.followingId],
    references: [users.id],
  }),
}))

export const likesRelations = relations(likes, ({ one }) => ({
  user: one(users, {
    relationName: 'LikeToUser',
    fields: [likes.userId],
    references: [users.id],
  }),
  post: one(posts, {
    relationName: 'LikeToPost',
    fields: [likes.postId],
    references: [posts.id],
  }),
}))

export const commentsRelations = relations(comments, ({ one }) => ({
  user: one(users, {
    relationName: 'CommentToUser',
    fields: [comments.userId],
    references: [users.id],
  }),
  post: one(posts, {
    relationName: 'CommentToPost',
    fields: [comments.postId],
    references: [posts.id],
  }),
}))

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    relationName: 'NotificationToUser',
    fields: [notifications.userId],
    references: [users.id],
  }),
}))
