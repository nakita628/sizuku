import { type } from 'arktype'

export const UserSchema = type({
  /**
   * Primary key
   */
  id: 'string.uuid',
  /**
   * Display name
   */
  name: '1 <= string <= 50',
})

export type User = typeof UserSchema.infer

export const PostSchema = type({
  /**
   * Primary key
   */
  id: 'string.uuid',
  /**
   * Article title
   */
  title: '1 <= string <= 100',
  /**
   * Body content (no length limit)
   */
  content: '1 <= string <= 65535',
  /**
   * Foreign key referencing User.id
   */
  userId: 'string.uuid',
})

export type Post = typeof PostSchema.infer

export const UserRelationsSchema = type({ ...UserSchema.t, posts: PostSchema.array() })

export type UserRelations = typeof UserRelationsSchema.infer

export const PostRelationsSchema = type({ ...PostSchema.t, user: UserSchema })

export type PostRelations = typeof PostRelationsSchema.infer
