import { Schema } from 'effect'

export const UserSchema = Schema.Struct({
  /**
   * Unique identifier for the user
   */
  id: Schema.UUID,
  /**
   * User's display name
   */
  name: Schema.String,
  /**
   * User's biography or profile description
   */
  username: Schema.optional(Schema.String),
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

export type User = Schema.Schema.Type<typeof UserSchema>

export const PostSchema = Schema.Struct({
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
   * Foreign key referencing User.id
   */
  userId: Schema.UUID,
})

export type Post = Schema.Schema.Type<typeof PostSchema>

export const FollowSchema = Schema.Struct({
  /**
   * Unique identifier for the follow relationship
   */
  id: Schema.UUID,
  /**
   * Foreign key referencing User.id
   */
  followerId: Schema.UUID,
  /**
   * Foreign key referencing User.id
   */
  followingId: Schema.UUID,
  /**
   * Timestamp when the follow relationship was created
   */
  createdAt: Schema.DateTimeUtc,
})

export type Follow = Schema.Schema.Type<typeof FollowSchema>

export const LikeSchema = Schema.Struct({
  /**
   * Unique identifier for the like relationship
   */
  id: Schema.UUID,
  /**
   * Foreign key referencing User.id
   */
  userId: Schema.UUID,
  /**
   * Foreign key referencing Post.id
   */
  postId: Schema.UUID,
  /**
   * Timestamp when the like relationship was created
   */
  createdAt: Schema.DateTimeUtc,
})

export type Like = Schema.Schema.Type<typeof LikeSchema>

export const CommentSchema = Schema.Struct({
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
   * Foreign key referencing User.id
   */
  userId: Schema.UUID,
  /**
   * Foreign key referencing Post.id
   */
  postId: Schema.UUID,
})

export type Comment = Schema.Schema.Type<typeof CommentSchema>

export const NotificationSchema = Schema.Struct({
  /**
   * Unique identifier for the notification
   */
  id: Schema.UUID,
  /**
   * Body content of the notification
   */
  body: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(65535)),
  /**
   * Foreign key referencing User.id
   */
  userId: Schema.UUID,
  /**
   * Timestamp when the notification was created
   */
  createdAt: Schema.DateTimeUtc,
})

export type Notification = Schema.Schema.Type<typeof NotificationSchema>
