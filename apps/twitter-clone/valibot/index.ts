import * as v from 'valibot'

export const UserSchema = v.object({
  /**
   * Unique identifier for the user
   */
  id: v.pipe(v.string(), v.uuid()),
  /**
   * User's display name
   */
  name: v.string(),
  /**
   * User's biography or profile description
   */
  username: v.optional(v.string(), ''),
  /**
   * User's biography or profile description
   */
  bio: v.optional(v.string(), ''),
  /**
   * User's unique email address
   */
  email: v.pipe(v.string(), v.email()),
  /**
   * Timestamp of email verification
   */
  emailVerified: v.nullable(v.date()),
  /**
   * URL of user's image
   */
  image: v.nullable(v.string()),
  /**
   * URL of user's cover image
   */
  coverImage: v.nullable(v.string()),
  /**
   * URL of user's profile image
   */
  profileImage: v.nullable(v.string()),
  /**
   * Hashed password for security
   */
  hashedPassword: v.string(),
  /**
   * Timestamp when the user was created
   */
  createdAt: v.pipe(v.string(), v.isoDate()),
  /**
   * Timestamp when the user was last updated
   */
  updatedAt: v.pipe(v.string(), v.isoDate()),
  /**
   * Flag indicating if user has unread notifications
   */
  hasNotification: v.optional(v.boolean(), false),
})

export type User = v.InferInput<typeof UserSchema>

export const PostSchema = v.object({
  /**
   * Unique identifier for the post
   */
  id: v.pipe(v.string(), v.uuid()),
  /**
   * Body content of the post
   */
  body: v.pipe(v.string(), v.minLength(1), v.maxLength(65535)),
  /**
   * Timestamp when the post was created
   */
  createdAt: v.pipe(v.string(), v.isoDate()),
  /**
   * Timestamp when the post was last updated
   */
  updatedAt: v.pipe(v.string(), v.isoDate()),
  /**
   * Foreign key referencing User.id
   */
  userId: v.pipe(v.string(), v.uuid()),
})

export type Post = v.InferInput<typeof PostSchema>

export const FollowSchema = v.object({
  /**
   * Unique identifier for the follow relationship
   */
  id: v.pipe(v.string(), v.uuid()),
  /**
   * Foreign key referencing User.id
   */
  followerId: v.pipe(v.string(), v.uuid()),
  /**
   * Foreign key referencing User.id
   */
  followingId: v.pipe(v.string(), v.uuid()),
  /**
   * Timestamp when the follow relationship was created
   */
  createdAt: v.pipe(v.string(), v.isoDate()),
})

export type Follow = v.InferInput<typeof FollowSchema>

export const LikeSchema = v.object({
  /**
   * Unique identifier for the like relationship
   */
  id: v.pipe(v.string(), v.uuid()),
  /**
   * Foreign key referencing User.id
   */
  userId: v.pipe(v.string(), v.uuid()),
  /**
   * Foreign key referencing Post.id
   */
  postId: v.pipe(v.string(), v.uuid()),
  /**
   * Timestamp when the like relationship was created
   */
  createdAt: v.pipe(v.string(), v.isoDate()),
})

export type Like = v.InferInput<typeof LikeSchema>

export const CommentSchema = v.object({
  /**
   * Unique identifier for the comment
   */
  id: v.pipe(v.string(), v.uuid()),
  /**
   * Body content of the comment
   */
  body: v.pipe(v.string(), v.minLength(1), v.maxLength(65535)),
  /**
   * Timestamp when the comment was created
   */
  createdAt: v.pipe(v.string(), v.isoDate()),
  /**
   * Timestamp when the comment was last updated
   */
  updatedAt: v.pipe(v.string(), v.isoDate()),
  /**
   * Foreign key referencing User.id
   */
  userId: v.pipe(v.string(), v.uuid()),
  /**
   * Foreign key referencing Post.id
   */
  postId: v.pipe(v.string(), v.uuid()),
})

export type Comment = v.InferInput<typeof CommentSchema>

export const NotificationSchema = v.object({
  /**
   * Unique identifier for the notification
   */
  id: v.pipe(v.string(), v.uuid()),
  /**
   * Body content of the notification
   */
  body: v.pipe(v.string(), v.minLength(1), v.maxLength(65535)),
  /**
   * Foreign key referencing User.id
   */
  userId: v.pipe(v.string(), v.uuid()),
  /**
   * Timestamp when the notification was created
   */
  createdAt: v.pipe(v.string(), v.isoDate()),
})

export type Notification = v.InferInput<typeof NotificationSchema>

export const UserRelationsSchema = v.object({
  ...UserSchema.entries,
  posts: v.array(PostSchema),
  comments: v.array(CommentSchema),
  notifications: v.array(NotificationSchema),
  followers: v.array(FollowSchema),
  following: v.array(FollowSchema),
  likes: v.array(LikeSchema),
})

export type UserRelations = v.InferInput<typeof UserRelationsSchema>

export const PostRelationsSchema = v.object({
  ...PostSchema.entries,
  user: UserSchema,
  comments: v.array(CommentSchema),
  likes: v.array(LikeSchema),
})

export type PostRelations = v.InferInput<typeof PostRelationsSchema>

export const FollowRelationsSchema = v.object({
  ...FollowSchema.entries,
  follower: UserSchema,
  following: UserSchema,
})

export type FollowRelations = v.InferInput<typeof FollowRelationsSchema>

export const LikeRelationsSchema = v.object({
  ...LikeSchema.entries,
  user: UserSchema,
  post: PostSchema,
})

export type LikeRelations = v.InferInput<typeof LikeRelationsSchema>

export const CommentRelationsSchema = v.object({
  ...CommentSchema.entries,
  user: UserSchema,
  post: PostSchema,
})

export type CommentRelations = v.InferInput<typeof CommentRelationsSchema>

export const NotificationRelationsSchema = v.object({
  ...NotificationSchema.entries,
  user: UserSchema,
})

export type NotificationRelations = v.InferInput<typeof NotificationRelationsSchema>
