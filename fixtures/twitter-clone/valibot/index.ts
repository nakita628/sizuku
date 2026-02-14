import * as v from 'valibot'

export const UsersSchema = v.object({
  /**
   * Unique identifier for the user
   */
  id: v.pipe(v.string(), v.uuid()),
  /**
   * User's display name
   */
  name: v.string(),
  /**
   * User's unique username
   */
  username: v.pipe(v.string(), v.minLength(1), v.maxLength(50)),
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

export type Users = v.InferInput<typeof UsersSchema>

export const PostsSchema = v.object({
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
   * Foreign key referencing users.id
   */
  userId: v.pipe(v.string(), v.uuid()),
})

export type Posts = v.InferInput<typeof PostsSchema>

export const FollowsSchema = v.object({
  /**
   * Foreign key referencing users.id
   */
  followerId: v.pipe(v.string(), v.uuid()),
  /**
   * Foreign key referencing users.id
   */
  followingId: v.pipe(v.string(), v.uuid()),
  /**
   * Timestamp when the follow relationship was created
   */
  createdAt: v.pipe(v.string(), v.isoDate()),
})

export type Follows = v.InferInput<typeof FollowsSchema>

export const LikesSchema = v.object({
  /**
   * Foreign key referencing users.id
   */
  userId: v.pipe(v.string(), v.uuid()),
  /**
   * Foreign key referencing posts.id
   */
  postId: v.pipe(v.string(), v.uuid()),
  /**
   * Timestamp when the like relationship was created
   */
  createdAt: v.pipe(v.string(), v.isoDate()),
})

export type Likes = v.InferInput<typeof LikesSchema>

export const CommentsSchema = v.object({
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
   * Foreign key referencing users.id
   */
  userId: v.pipe(v.string(), v.uuid()),
  /**
   * Foreign key referencing posts.id
   */
  postId: v.pipe(v.string(), v.uuid()),
})

export type Comments = v.InferInput<typeof CommentsSchema>

export const NotificationsSchema = v.object({
  /**
   * Unique identifier for the notification
   */
  id: v.pipe(v.string(), v.uuid()),
  /**
   * Body content of the notification
   */
  body: v.pipe(v.string(), v.minLength(1), v.maxLength(65535)),
  /**
   * Foreign key referencing users.id
   */
  userId: v.pipe(v.string(), v.uuid()),
  /**
   * Timestamp when the notification was created
   */
  createdAt: v.pipe(v.string(), v.isoDate()),
})

export type Notifications = v.InferInput<typeof NotificationsSchema>

export const UsersRelationsSchema = v.object({
  ...UsersSchema.entries,
  posts: v.array(PostsSchema),
  comments: v.array(CommentsSchema),
  notifications: v.array(NotificationsSchema),
  followers: v.array(FollowsSchema),
  following: v.array(FollowsSchema),
  likes: v.array(LikesSchema),
})

export type UsersRelations = v.InferInput<typeof UsersRelationsSchema>

export const PostsRelationsSchema = v.object({
  ...PostsSchema.entries,
  user: UsersSchema,
  comments: v.array(CommentsSchema),
  likes: v.array(LikesSchema),
})

export type PostsRelations = v.InferInput<typeof PostsRelationsSchema>

export const FollowsRelationsSchema = v.object({
  ...FollowsSchema.entries,
  follower: UsersSchema,
  following: UsersSchema,
})

export type FollowsRelations = v.InferInput<typeof FollowsRelationsSchema>

export const LikesRelationsSchema = v.object({
  ...LikesSchema.entries,
  user: UsersSchema,
  post: PostsSchema,
})

export type LikesRelations = v.InferInput<typeof LikesRelationsSchema>

export const CommentsRelationsSchema = v.object({
  ...CommentsSchema.entries,
  user: UsersSchema,
  post: PostsSchema,
})

export type CommentsRelations = v.InferInput<typeof CommentsRelationsSchema>

export const NotificationsRelationsSchema = v.object({
  ...NotificationsSchema.entries,
  user: UsersSchema,
})

export type NotificationsRelations = v.InferInput<typeof NotificationsRelationsSchema>
