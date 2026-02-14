import { Schema } from 'effect'

export const UsersSchema = Schema.Struct({
  /**
   * Unique identifier for the user
   */
  id: Schema.UUID,
  /**
   * User's display name
   */
  name: Schema.String,
  /**
   * User's unique username
   */
  username: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(50)),
  /**
   * User's biography or profile description
   */
  bio: Schema.optional(Schema.String),
  /**
   * User's unique email address
   */
  email: Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
  /**
   * Timestamp of email verification
   */
  emailVerified: Schema.NullOr(Schema.Date),
  /**
   * URL of user's image
   */
  image: Schema.NullOr(Schema.String.pipe(Schema.pattern(/^https?:\/\//))),
  /**
   * URL of user's cover image
   */
  coverImage: Schema.NullOr(Schema.String.pipe(Schema.pattern(/^https?:\/\//))),
  /**
   * URL of user's profile image
   */
  profileImage: Schema.NullOr(Schema.String.pipe(Schema.pattern(/^https?:\/\//))),
  /**
   * Hashed password for security
   */
  hashedPassword: Schema.String,
  /**
   * Timestamp when the user was created
   */
  createdAt: Schema.DateTimeUtc,
  /**
   * Timestamp when the user was last updated
   */
  updatedAt: Schema.DateTimeUtc,
  /**
   * Flag indicating if user has unread notifications
   */
  hasNotification: Schema.optionalWith(Schema.Boolean, { default: () => false }),
})

export type Users = Schema.Schema.Type<typeof UsersSchema>

export const PostsSchema = Schema.Struct({
  /**
   * Unique identifier for the post
   */
  id: Schema.UUID,
  /**
   * Body content of the post
   */
  body: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(65535)),
  /**
   * Timestamp when the post was created
   */
  createdAt: Schema.DateTimeUtc,
  /**
   * Timestamp when the post was last updated
   */
  updatedAt: Schema.DateTimeUtc,
  /**
   * Foreign key referencing users.id
   */
  userId: Schema.UUID,
})

export type Posts = Schema.Schema.Type<typeof PostsSchema>

export const FollowsSchema = Schema.Struct({
  /**
   * Foreign key referencing users.id
   */
  followerId: Schema.UUID,
  /**
   * Foreign key referencing users.id
   */
  followingId: Schema.UUID,
  /**
   * Timestamp when the follow relationship was created
   */
  createdAt: Schema.DateTimeUtc,
})

export type Follows = Schema.Schema.Type<typeof FollowsSchema>

export const LikesSchema = Schema.Struct({
  /**
   * Foreign key referencing users.id
   */
  userId: Schema.UUID,
  /**
   * Foreign key referencing posts.id
   */
  postId: Schema.UUID,
  /**
   * Timestamp when the like relationship was created
   */
  createdAt: Schema.DateTimeUtc,
})

export type Likes = Schema.Schema.Type<typeof LikesSchema>

export const CommentsSchema = Schema.Struct({
  /**
   * Unique identifier for the comment
   */
  id: Schema.UUID,
  /**
   * Body content of the comment
   */
  body: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(65535)),
  /**
   * Timestamp when the comment was created
   */
  createdAt: Schema.DateTimeUtc,
  /**
   * Timestamp when the comment was last updated
   */
  updatedAt: Schema.DateTimeUtc,
  /**
   * Foreign key referencing users.id
   */
  userId: Schema.UUID,
  /**
   * Foreign key referencing posts.id
   */
  postId: Schema.UUID,
})

export type Comments = Schema.Schema.Type<typeof CommentsSchema>

export const NotificationsSchema = Schema.Struct({
  /**
   * Unique identifier for the notification
   */
  id: Schema.UUID,
  /**
   * Body content of the notification
   */
  body: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(65535)),
  /**
   * Foreign key referencing users.id
   */
  userId: Schema.UUID,
  /**
   * Timestamp when the notification was created
   */
  createdAt: Schema.DateTimeUtc,
})

export type Notifications = Schema.Schema.Type<typeof NotificationsSchema>

export const UsersRelationsSchema = Schema.Struct({
  ...UsersSchema.fields,
  posts: Schema.Array(PostsSchema),
  comments: Schema.Array(CommentsSchema),
  notifications: Schema.Array(NotificationsSchema),
  followers: Schema.Array(FollowsSchema),
  following: Schema.Array(FollowsSchema),
  likes: Schema.Array(LikesSchema),
})

export type UsersRelations = Schema.Schema.Type<typeof UsersRelationsSchema>

export const PostsRelationsSchema = Schema.Struct({
  ...PostsSchema.fields,
  user: UsersSchema,
  comments: Schema.Array(CommentsSchema),
  likes: Schema.Array(LikesSchema),
})

export type PostsRelations = Schema.Schema.Type<typeof PostsRelationsSchema>

export const FollowsRelationsSchema = Schema.Struct({
  ...FollowsSchema.fields,
  follower: UsersSchema,
  following: UsersSchema,
})

export type FollowsRelations = Schema.Schema.Type<typeof FollowsRelationsSchema>

export const LikesRelationsSchema = Schema.Struct({
  ...LikesSchema.fields,
  user: UsersSchema,
  post: PostsSchema,
})

export type LikesRelations = Schema.Schema.Type<typeof LikesRelationsSchema>

export const CommentsRelationsSchema = Schema.Struct({
  ...CommentsSchema.fields,
  user: UsersSchema,
  post: PostsSchema,
})

export type CommentsRelations = Schema.Schema.Type<typeof CommentsRelationsSchema>

export const NotificationsRelationsSchema = Schema.Struct({
  ...NotificationsSchema.fields,
  user: UsersSchema,
})

export type NotificationsRelations = Schema.Schema.Type<typeof NotificationsRelationsSchema>
