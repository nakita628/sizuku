import * as z from 'zod'

export const UsersSchema = z.object({
  /**
   * Unique identifier for the user
   */
  id: z.uuid(),
  /**
   * User's display name
   */
  name: z.string(),
  /**
   * User's unique username
   */
  username: z.string().min(1).max(50),
  /**
   * User's biography or profile description
   */
  bio: z.string().optional().default(''),
  /**
   * User's unique email address
   */
  email: z.email(),
  /**
   * Timestamp of email verification
   */
  emailVerified: z.date().nullable(),
  /**
   * URL of user's image
   */
  image: z.url().nullable(),
  /**
   * URL of user's cover image
   */
  coverImage: z.url().nullable(),
  /**
   * URL of user's profile image
   */
  profileImage: z.url().nullable(),
  /**
   * Hashed password for security
   */
  hashedPassword: z.string(),
  /**
   * Timestamp when the user was created
   */
  createdAt: z.iso.datetime(),
  /**
   * Timestamp when the user was last updated
   */
  updatedAt: z.iso.datetime(),
  /**
   * Flag indicating if user has unread notifications
   */
  hasNotification: z.boolean().default(false),
})

export type Users = z.infer<typeof UsersSchema>

export const PostsSchema = z.object({
  /**
   * Unique identifier for the post
   */
  id: z.uuid(),
  /**
   * Body content of the post
   */
  body: z.string().min(1).max(65535),
  /**
   * Timestamp when the post was created
   */
  createdAt: z.iso.datetime(),
  /**
   * Timestamp when the post was last updated
   */
  updatedAt: z.iso.datetime(),
  /**
   * Foreign key referencing users.id
   */
  userId: z.uuid(),
})

export type Posts = z.infer<typeof PostsSchema>

export const FollowsSchema = z.object({
  /**
   * Foreign key referencing users.id
   */
  followerId: z.uuid(),
  /**
   * Foreign key referencing users.id
   */
  followingId: z.uuid(),
  /**
   * Timestamp when the follow relationship was created
   */
  createdAt: z.iso.datetime(),
})

export type Follows = z.infer<typeof FollowsSchema>

export const LikesSchema = z.object({
  /**
   * Foreign key referencing users.id
   */
  userId: z.uuid(),
  /**
   * Foreign key referencing posts.id
   */
  postId: z.uuid(),
  /**
   * Timestamp when the like relationship was created
   */
  createdAt: z.iso.datetime(),
})

export type Likes = z.infer<typeof LikesSchema>

export const CommentsSchema = z.object({
  /**
   * Unique identifier for the comment
   */
  id: z.uuid(),
  /**
   * Body content of the comment
   */
  body: z.string().min(1).max(65535),
  /**
   * Timestamp when the comment was created
   */
  createdAt: z.iso.datetime(),
  /**
   * Timestamp when the comment was last updated
   */
  updatedAt: z.iso.datetime(),
  /**
   * Foreign key referencing users.id
   */
  userId: z.uuid(),
  /**
   * Foreign key referencing posts.id
   */
  postId: z.uuid(),
})

export type Comments = z.infer<typeof CommentsSchema>

export const NotificationsSchema = z.object({
  /**
   * Unique identifier for the notification
   */
  id: z.uuid(),
  /**
   * Body content of the notification
   */
  body: z.string().min(1).max(65535),
  /**
   * Foreign key referencing users.id
   */
  userId: z.uuid(),
  /**
   * Timestamp when the notification was created
   */
  createdAt: z.iso.datetime(),
})

export type Notifications = z.infer<typeof NotificationsSchema>

export const UsersRelationsSchema = z.object({
  ...UsersSchema.shape,
  posts: z.array(PostsSchema),
  comments: z.array(CommentsSchema),
  notifications: z.array(NotificationsSchema),
  followers: z.array(FollowsSchema),
  following: z.array(FollowsSchema),
  likes: z.array(LikesSchema),
})

export type UsersRelations = z.infer<typeof UsersRelationsSchema>

export const PostsRelationsSchema = z.object({
  ...PostsSchema.shape,
  user: UsersSchema,
  comments: z.array(CommentsSchema),
  likes: z.array(LikesSchema),
})

export type PostsRelations = z.infer<typeof PostsRelationsSchema>

export const FollowsRelationsSchema = z.object({
  ...FollowsSchema.shape,
  follower: UsersSchema,
  following: UsersSchema,
})

export type FollowsRelations = z.infer<typeof FollowsRelationsSchema>

export const LikesRelationsSchema = z.object({
  ...LikesSchema.shape,
  user: UsersSchema,
  post: PostsSchema,
})

export type LikesRelations = z.infer<typeof LikesRelationsSchema>

export const CommentsRelationsSchema = z.object({
  ...CommentsSchema.shape,
  user: UsersSchema,
  post: PostsSchema,
})

export type CommentsRelations = z.infer<typeof CommentsRelationsSchema>

export const NotificationsRelationsSchema = z.object({
  ...NotificationsSchema.shape,
  user: UsersSchema,
})

export type NotificationsRelations = z.infer<typeof NotificationsRelationsSchema>
