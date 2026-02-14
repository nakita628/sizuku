import { type } from 'arktype'

export const UsersSchema = type({
  /**
   * Unique identifier for the user
   */
  id: 'string.uuid',
  /**
   * User's display name
   */
  name: string,
  /**
   * User's unique username
   */
  username: '1 <= string <= 50',
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

export type Users = typeof UsersSchema.infer

export const PostsSchema = type({
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
   * Foreign key referencing users.id
   */
  userId: 'string.uuid',
})

export type Posts = typeof PostsSchema.infer

export const FollowsSchema = type({
  /**
   * Foreign key referencing users.id
   */
  followerId: 'string.uuid',
  /**
   * Foreign key referencing users.id
   */
  followingId: 'string.uuid',
  /**
   * Timestamp when the follow relationship was created
   */
  createdAt: 'string.date.iso',
})

export type Follows = typeof FollowsSchema.infer

export const LikesSchema = type({
  /**
   * Foreign key referencing users.id
   */
  userId: 'string.uuid',
  /**
   * Foreign key referencing posts.id
   */
  postId: 'string.uuid',
  /**
   * Timestamp when the like relationship was created
   */
  createdAt: 'string.date.iso',
})

export type Likes = typeof LikesSchema.infer

export const CommentsSchema = type({
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
   * Foreign key referencing users.id
   */
  userId: 'string.uuid',
  /**
   * Foreign key referencing posts.id
   */
  postId: 'string.uuid',
})

export type Comments = typeof CommentsSchema.infer

export const NotificationsSchema = type({
  /**
   * Unique identifier for the notification
   */
  id: 'string.uuid',
  /**
   * Body content of the notification
   */
  body: '1 <= string <= 65535',
  /**
   * Foreign key referencing users.id
   */
  userId: 'string.uuid',
  /**
   * Timestamp when the notification was created
   */
  createdAt: 'string.date.iso',
})

export type Notifications = typeof NotificationsSchema.infer

export const UsersRelationsSchema = type({
  ...UsersSchema.t,
  posts: PostsSchema.array(),
  comments: CommentsSchema.array(),
  notifications: NotificationsSchema.array(),
  followers: FollowsSchema.array(),
  following: FollowsSchema.array(),
  likes: LikesSchema.array(),
})

export type UsersRelations = typeof UsersRelationsSchema.infer

export const PostsRelationsSchema = type({
  ...PostsSchema.t,
  user: UsersSchema,
  comments: CommentsSchema.array(),
  likes: LikesSchema.array(),
})

export type PostsRelations = typeof PostsRelationsSchema.infer

export const FollowsRelationsSchema = type({
  ...FollowsSchema.t,
  follower: UsersSchema,
  following: UsersSchema,
})

export type FollowsRelations = typeof FollowsRelationsSchema.infer

export const LikesRelationsSchema = type({ ...LikesSchema.t, user: UsersSchema, post: PostsSchema })

export type LikesRelations = typeof LikesRelationsSchema.infer

export const CommentsRelationsSchema = type({
  ...CommentsSchema.t,
  user: UsersSchema,
  post: PostsSchema,
})

export type CommentsRelations = typeof CommentsRelationsSchema.infer

export const NotificationsRelationsSchema = type({ ...NotificationsSchema.t, user: UsersSchema })

export type NotificationsRelations = typeof NotificationsRelationsSchema.infer
