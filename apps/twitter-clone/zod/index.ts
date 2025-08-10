import * as z from 'zod'

export const UserSchema = z.object({
  /**
   * Unique identifier for the user
   */
  id: z.uuid(),
  /**
   * User's display name
   */
  name: z.string(),
  /**
   * User's biography or profile description
   */
  username: z.string().optional().default(''),
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

export type User = z.infer<typeof UserSchema>

export const PostSchema = z.object({
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
   * Foreign key referencing User.id
   */
  userId: z.uuid(),
})

export type Post = z.infer<typeof PostSchema>

export const FollowSchema = z.object({
  /**
   * Unique identifier for the follow relationship
   */
  id: z.uuid(),
  /**
   * Foreign key referencing User.id
   */
  followerId: z.uuid(),
  /**
   * Foreign key referencing User.id
   */
  followingId: z.uuid(),
  /**
   * Timestamp when the follow relationship was created
   */
  createdAt: z.iso.datetime(),
})

export type Follow = z.infer<typeof FollowSchema>

export const LikeSchema = z.object({
  /**
   * Unique identifier for the like relationship
   */
  id: z.uuid(),
  /**
   * Foreign key referencing User.id
   */
  userId: z.uuid(),
  /**
   * Foreign key referencing Post.id
   */
  postId: z.uuid(),
  /**
   * Timestamp when the like relationship was created
   */
  createdAt: z.iso.datetime(),
})

export type Like = z.infer<typeof LikeSchema>

export const CommentSchema = z.object({
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
   * Foreign key referencing User.id
   */
  userId: z.uuid(),
  /**
   * Foreign key referencing Post.id
   */
  postId: z.uuid(),
})

export type Comment = z.infer<typeof CommentSchema>

export const NotificationSchema = z.object({
  /**
   * Unique identifier for the notification
   */
  id: z.uuid(),
  /**
   * Body content of the notification
   */
  body: z.string().min(1).max(65535),
  /**
   * Foreign key referencing User.id
   */
  userId: z.uuid(),
  /**
   * Timestamp when the notification was created
   */
  createdAt: z.iso.datetime(),
})

export type Notification = z.infer<typeof NotificationSchema>

export const UserRelationsSchema = z.object({
  ...UserSchema.shape,
  posts: z.array(PostSchema),
  comments: z.array(CommentSchema),
  notifications: z.array(NotificationSchema),
  followers: z.array(FollowSchema),
  following: z.array(FollowSchema),
  likes: z.array(LikeSchema),
})

export type UserRelations = z.infer<typeof UserRelationsSchema>

export const PostRelationsSchema = z.object({
  ...PostSchema.shape,
  user: UserSchema,
  comments: z.array(CommentSchema),
  likes: z.array(LikeSchema),
})

export type PostRelations = z.infer<typeof PostRelationsSchema>

export const FollowRelationsSchema = z.object({
  ...FollowSchema.shape,
  follower: UserSchema,
  following: UserSchema,
})

export type FollowRelations = z.infer<typeof FollowRelationsSchema>

export const LikeRelationsSchema = z.object({
  ...LikeSchema.shape,
  user: UserSchema,
  post: PostSchema,
})

export type LikeRelations = z.infer<typeof LikeRelationsSchema>

export const CommentRelationsSchema = z.object({
  ...CommentSchema.shape,
  user: UserSchema,
  post: PostSchema,
})

export type CommentRelations = z.infer<typeof CommentRelationsSchema>

export const NotificationRelationsSchema = z.object({
  ...NotificationSchema.shape,
  user: UserSchema,
})

export type NotificationRelations = z.infer<typeof NotificationRelationsSchema>
