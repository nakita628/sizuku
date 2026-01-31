import * as z from 'zod'

export const UserSchema = z.object({
  /**
   * Unique user ID
   */
  id: z.cuid(),
  /**
   * Display name
   */
  name: z.string().min(1).max(50).nullable(),
  /**
   * Email address
   */
  email: z.email().nullable(),
  /**
   * Date when the email was verified
   */
  emailVerified: z.iso.datetime().nullable(),
  /**
   * Profile image URL
   */
  image: z.url().nullable(),
  /**
   * Hashed password
   */
  password: z.string().min(8).nullable(),
  /**
   * Role of the user (ADMIN or USER)
   */
  role: z.enum(['ADMIN', 'USER']),
  /**
   * Whether 2FA is enabled
   */
  isTwoFactorEnabled: z.boolean(),
})

export type User = z.infer<typeof UserSchema>

export const AccountSchema = z.object({
  /**
   * Unique account ID
   */
  id: z.cuid(),
  /**
   * Reference to the user ID
   */
  userId: z.string(),
  /**
   * Type of account (e.g., oauth, email)
   */
  type: z.string(),
  /**
   * Name of the provider (e.g., google, github)
   */
  provider: z.string(),
  /**
   * Provider-specific account ID
   */
  providerAccountId: z.string(),
  /**
   * Refresh token
   */
  refresh_token: z.string().nullable(),
  /**
   * Access token
   */
  access_token: z.string().nullable(),
  /**
   * Expiration time (UNIX timestamp)
   */
  expires_at: z.int().nullable(),
  /**
   * Token type (e.g., Bearer)
   */
  token_type: z.string().nullable(),
  /**
   * OAuth scope
   */
  scope: z.string().nullable(),
  /**
   * ID token
   */
  id_token: z.string().nullable(),
  /**
   * Session state
   */
  session_state: z.string().nullable(),
})

export type Account = z.infer<typeof AccountSchema>

export const VerificationTokenSchema = z.object({
  /**
   * Token ID
   */
  id: z.cuid(),
  /**
   * Email address
   */
  email: z.email(),
  /**
   * Token string
   */
  token: z.string(),
  /**
   * Expiry time
   */
  expires: z.iso.datetime(),
})

export type VerificationToken = z.infer<typeof VerificationTokenSchema>

export const PasswordResetTokenSchema = z.object({
  /**
   * Token ID
   */
  id: z.cuid(),
  /**
   * Email address
   */
  email: z.email(),
  /**
   * Token string
   */
  token: z.string(),
  /**
   * Expiry time
   */
  expires: z.iso.datetime(),
})

export type PasswordResetToken = z.infer<typeof PasswordResetTokenSchema>

export const TwoFactorTokenSchema = z.object({
  /**
   * Token ID
   */
  id: z.cuid(),
  /**
   * Email address
   */
  email: z.email(),
  /**
   * Token string
   */
  token: z.string(),
  /**
   * Expiry time
   */
  expires: z.iso.datetime(),
})

export type TwoFactorToken = z.infer<typeof TwoFactorTokenSchema>

export const TwoFactorConfirmationSchema = z.object({
  /**
   * Confirmation ID
   */
  id: z.cuid(),
  /**
   * Reference to user
   */
  userId: z.string(),
})

export type TwoFactorConfirmation = z.infer<typeof TwoFactorConfirmationSchema>

export const UserRelationsSchema = z.object({
  ...UserSchema.shape,
  accounts: z.array(AccountSchema),
  twoFactorConfirmation: TwoFactorConfirmationSchema,
})

export type UserRelations = z.infer<typeof UserRelationsSchema>

export const AccountRelationsSchema = z.object({ ...AccountSchema.shape, user: UserSchema })

export type AccountRelations = z.infer<typeof AccountRelationsSchema>

export const TwoFactorConfirmationRelationsSchema = z.object({
  ...TwoFactorConfirmationSchema.shape,
  user: UserSchema,
})

export type TwoFactorConfirmationRelations = z.infer<typeof TwoFactorConfirmationRelationsSchema>
