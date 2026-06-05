import { Schema } from "effect";

export const UserSchema = Schema.Struct({
  /**
   * Primary key
   */
  id: Schema.UUID,
  /**
   * Display name
   */
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(50)),
});

export type User = typeof UserSchema.Type;

export const PostSchema = Schema.Struct({
  /**
   * Primary key
   */
  id: Schema.UUID,
  /**
   * Article title
   */
  title: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
  /**
   * Body content (no length limit)
   */
  content: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(65535)),
  /**
   * Foreign key referencing User.id
   */
  userId: Schema.UUID,
});

export type Post = typeof PostSchema.Type;

export const UserRelationsSchema = Schema.Struct({
  ...UserSchema.fields,
  posts: Schema.Array(PostSchema),
});

export type UserRelations = typeof UserRelationsSchema.Type;

export const PostRelationsSchema = Schema.Struct({ ...PostSchema.fields, user: UserSchema });

export type PostRelations = typeof PostRelationsSchema.Type;
