import { z } from 'zod'

export const UserSchema = z.object({
  /**
   * (PK) Unique identifier for the user.
   */
  id: z.string().uuid(),
  /**
   * Username of the user.
   */
  username: z.string(),
  /**
   * Email address of the user.
   */
  email: z.string().email(),
  /**
   * Password for the user.
   */
  password: z.string().min(8).max(100),
  /**
   * Timestamp when the user was created.
   */
  createdAt: z.date(),
  /**
   * Timestamp when the user was last updated.
   */
  updatedAt: z.date(),
})

export const PostSchema = z.object({
  /**
   * (PK) Unique identifier for the post.
   */
  id: z.string().uuid(),
  /**
   * (FK) ID of the user who created the post.
   */
  userId: z.string().uuid(),
  /**
   * Content of the post.
   */
  content: z.string(),
  /**
   * Timestamp when the post was created.
   */
  createdAt: z.date(),
  /**
   * Timestamp when the post was last updated.
   */
  updatedAt: z.date(),
})

export const LikesSchema = z.object({
  /**
   * (PK) Unique identifier for the like.
   */
  id: z.string().uuid(),
  /**
   * (FK) ID of the post that is liked.
   */
  postId: z.string().uuid(),
  /**
   * (FK) ID of the user who liked the post.
   */
  userId: z.string().uuid(),
  /**
   * Timestamp when the like was created.
   */
  createdAt: z.date(),
})
