import { type } from 'arktype'

export const UserSchema = type({
  /**
   * Unique identifier for the user
   */
  id: 'string.uuid',
  /**
   * User's display name
   */
  name: string,
  /**
   * User's biography or profile description
   */
  username: 'string | undefined',
  /**
   * User's biography or profile description
   */
  bio: 'string | undefined',
  /**
   * User's unique email address
   */
  email: 'string.email',
  /**
   * Timestamp of email verification
   */
  emailVerified: 'Date | null',
  /**
   * URL of user's image
   */
  image: 'string.url | null',
  /**
   * URL of user's cover image
   */
  coverImage: 'string.url | null',
  /**
   * URL of user's profile image
   */
  profileImage: 'string.url | null',
  /**
   * Hashed password for security
   */
  hashedPassword: string,
  /**
   * Timestamp when the user was created
   */
  createdAt: 'string.date.iso',
  /**
   * Timestamp when the user was last updated
   */
  updatedAt: 'string.date.iso',
  /**
   * Flag indicating if user has unread notifications
   */
  hasNotification: 'boolean = false',
})

export type User = typeof UserSchema.infer

export const PostSchema = type({
  /**
   * Unique identifier for the post
   */
  id: 'string.uuid',
  /**
   * Body content of the post
   */
  body: '1 <= string <= 65535',
  /**
   * Timestamp when the post was created
   */
  createdAt: 'string.date.iso',
  /**
   * Timestamp when the post was last updated
   */
  updatedAt: 'string.date.iso',
  /**
   * Foreign key referencing User.id
   */
  userId: 'string.uuid',
})

export type Post = typeof PostSchema.infer

export const FollowSchema = type({
  /**
   * Unique identifier for the follow relationship
   */
  id: 'string.uuid',
  /**
   * Foreign key referencing User.id
   */
  followerId: 'string.uuid',
  /**
   * Foreign key referencing User.id
   */
  followingId: 'string.uuid',
  /**
   * Timestamp when the follow relationship was created
   */
  createdAt: 'string.date.iso',
})

export type Follow = typeof FollowSchema.infer

export const LikeSchema = type({
  /**
   * Unique identifier for the like relationship
   */
  id: 'string.uuid',
  /**
   * Foreign key referencing User.id
   */
  userId: 'string.uuid',
  /**
   * Foreign key referencing Post.id
   */
  postId: 'string.uuid',
  /**
   * Timestamp when the like relationship was created
   */
  createdAt: 'string.date.iso',
})

export type Like = typeof LikeSchema.infer

export const CommentSchema = type({
  /**
   * Unique identifier for the comment
   */
  id: 'string.uuid',
  /**
   * Body content of the comment
   */
  body: '1 <= string <= 65535',
  /**
   * Timestamp when the comment was created
   */
  createdAt: 'string.date.iso',
  /**
   * Timestamp when the comment was last updated
   */
  updatedAt: 'string.date.iso',
  /**
   * Foreign key referencing User.id
   */
  userId: 'string.uuid',
  /**
   * Foreign key referencing Post.id
   */
  postId: 'string.uuid',
})

export type Comment = typeof CommentSchema.infer

export const NotificationSchema = type({
  /**
   * Unique identifier for the notification
   */
  id: 'string.uuid',
  /**
   * Body content of the notification
   */
  body: '1 <= string <= 65535',
  /**
   * Foreign key referencing User.id
   */
  userId: 'string.uuid',
  /**
   * Timestamp when the notification was created
   */
  createdAt: 'string.date.iso',
})

export type Notification = typeof NotificationSchema.infer
