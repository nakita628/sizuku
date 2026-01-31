import { relations, sql } from 'drizzle-orm'
import { foreignKey, int, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const User = sqliteTable('User', {
  /// User ID
  /// @z.uuid()
  /// @v.pipe(v.string(), v.uuid())
  /// @a."string.uuid"
  /// @e.Schema.UUID
  id: text('id').notNull().primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  /// Email address
  /// @z.email()
  /// @v.pipe(v.string(), v.email())
  /// @a."string.email"
  /// @e.Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
  email: text('email').notNull().unique(),
  /// Hashed password (null for OAuth-only users)
  /// @z.string().min(8).nullable()
  /// @v.nullish(v.pipe(v.string(), v.minLength(8)))
  /// @a."(string >= 8) | null"
  /// @e.Schema.NullOr(Schema.String.pipe(Schema.minLength(8)))
  passwordHash: text('passwordHash'),
  /// Display name
  /// @z.string().min(1).max(100)
  /// @v.pipe(v.string(), v.minLength(1), v.maxLength(100))
  /// @a."1 <= string <= 100"
  /// @e.Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100))
  name: text('name').notNull(),
  /// Profile image URL
  /// @z.url().nullable()
  /// @v.nullish(v.pipe(v.string(), v.url()))
  /// @a."string.url | null"
  /// @e.Schema.NullOr(Schema.String.pipe(Schema.pattern(/^https?:\/\//)))
  avatarUrl: text('avatarUrl'),
  /// User role
  /// @z.enum(['ADMIN', 'USER', 'GUEST'])
  /// @v.picklist(['ADMIN', 'USER', 'GUEST'])
  /// @a."'ADMIN' | 'USER' | 'GUEST'"
  /// @e.Schema.Literal('ADMIN', 'USER', 'GUEST')
  role: text('role', { enum: ['ADMIN', 'USER', 'GUEST'] })
    .notNull()
    .default('USER'),
  /// Email verification status
  /// @z.boolean()
  /// @v.boolean()
  /// @a.boolean
  /// @e.Schema.Boolean
  emailVerified: int('emailVerified', { mode: 'boolean' }).notNull().default(false),
  /// Account active status
  /// @z.boolean()
  /// @v.boolean()
  /// @a.boolean
  /// @e.Schema.Boolean
  isActive: int('isActive', { mode: 'boolean' }).notNull().default(true),
  /// Account creation timestamp
  /// @z.iso.datetime()
  /// @v.pipe(v.string(), v.isoTimestamp())
  /// @a."string.date.iso"
  /// @e.Schema.DateTimeUtc
  createdAt: text('createdAt').notNull().default(sql`(datetime('now'))`),
  /// Last update timestamp
  /// @z.iso.datetime()
  /// @v.pipe(v.string(), v.isoTimestamp())
  /// @a."string.date.iso"
  /// @e.Schema.DateTimeUtc
  updatedAt: text('updatedAt').notNull(),
  /// Last login timestamp
  /// @z.iso.datetime().nullable()
  /// @v.nullish(v.pipe(v.string(), v.isoTimestamp()))
  /// @a."string.date.iso | null"
  /// @e.Schema.NullOr(Schema.DateTimeUtc)
  lastLoginAt: text('lastLoginAt'),
})

/// OAuth account linked to user
/// @relation User.id OAuthAccount.userId many-to-one
export const OAuthAccount = sqliteTable(
  'OAuthAccount',
  {
    /// OAuth account ID
    /// @z.uuid()
    /// @v.pipe(v.string(), v.uuid())
    /// @a."string.uuid"
    /// @e.Schema.UUID
    id: text('id').notNull().primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    /// User ID
    /// @z.uuid()
    /// @v.pipe(v.string(), v.uuid())
    /// @a."string.uuid"
    /// @e.Schema.UUID
    userId: text('userId').notNull(),
    /// OAuth provider
    /// @z.enum(['GOOGLE', 'GITHUB', 'FACEBOOK', 'TWITTER', 'APPLE'])
    /// @v.picklist(['GOOGLE', 'GITHUB', 'FACEBOOK', 'TWITTER', 'APPLE'])
    /// @a."'GOOGLE' | 'GITHUB' | 'FACEBOOK' | 'TWITTER' | 'APPLE'"
    /// @e.Schema.Literal('GOOGLE', 'GITHUB', 'FACEBOOK', 'TWITTER', 'APPLE')
    provider: text('provider', {
      enum: ['GOOGLE', 'GITHUB', 'FACEBOOK', 'TWITTER', 'APPLE'],
    }).notNull(),
    /// Provider account ID
    /// @z.string()
    /// @v.string()
    /// @a.string
    /// @e.Schema.String
    providerAccountId: text('providerAccountId').notNull(),
    /// Access token from provider
    /// @z.string().nullable()
    /// @v.nullish(v.string())
    /// @a."string | null"
    /// @e.Schema.NullOr(Schema.String)
    accessToken: text('accessToken'),
    /// Refresh token from provider
    /// @z.string().nullable()
    /// @v.nullish(v.string())
    /// @a."string | null"
    /// @e.Schema.NullOr(Schema.String)
    refreshToken: text('refreshToken'),
    /// Token expiration timestamp
    /// @z.iso.datetime().nullable()
    /// @v.nullish(v.pipe(v.string(), v.isoTimestamp()))
    /// @a."string.date.iso | null"
    /// @e.Schema.NullOr(Schema.DateTimeUtc)
    expiresAt: text('expiresAt'),
    /// Account creation timestamp
    /// @z.iso.datetime()
    /// @v.pipe(v.string(), v.isoTimestamp())
    /// @a."string.date.iso"
    /// @e.Schema.DateTimeUtc
    createdAt: text('createdAt').notNull().default(sql`(datetime('now'))`),
  },
  (OAuthAccount) => ({
    OAuthAccount_user_fkey: foreignKey({
      name: 'OAuthAccount_user_fkey',
      columns: [OAuthAccount.userId],
      foreignColumns: [User.id],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
    OAuthAccount_provider_providerAccountId_unique_idx: uniqueIndex(
      'OAuthAccount_provider_providerAccountId_key',
    ).on(OAuthAccount.provider, OAuthAccount.providerAccountId),
  }),
)

/// Two-factor authentication settings
/// @relation User.id TwoFactorSetting.userId one-to-one
export const TwoFactorSetting = sqliteTable(
  'TwoFactorSetting',
  {
    /// 2FA setting ID
    /// @z.uuid()
    /// @v.pipe(v.string(), v.uuid())
    /// @a."string.uuid"
    /// @e.Schema.UUID
    id: text('id').notNull().primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    /// User ID
    /// @z.uuid()
    /// @v.pipe(v.string(), v.uuid())
    /// @a."string.uuid"
    /// @e.Schema.UUID
    userId: text('userId').notNull().unique(),
    /// 2FA enabled status
    /// @z.boolean()
    /// @v.boolean()
    /// @a.boolean
    /// @e.Schema.Boolean
    enabled: int('enabled', { mode: 'boolean' }).notNull().default(false),
    /// 2FA method
    /// @z.enum(['TOTP', 'SMS', 'EMAIL']).nullable()
    /// @v.nullish(v.picklist(['TOTP', 'SMS', 'EMAIL']))
    /// @a."'TOTP' | 'SMS' | 'EMAIL' | null"
    /// @e.Schema.NullOr(Schema.Literal('TOTP', 'SMS', 'EMAIL'))
    method: text('method', { enum: ['TOTP', 'SMS', 'EMAIL'] }),
    /// TOTP secret (encrypted)
    /// @z.string().nullable()
    /// @v.nullish(v.string())
    /// @a."string | null"
    /// @e.Schema.NullOr(Schema.String)
    totpSecret: text('totpSecret'),
    /// Phone number for SMS (E.164 format)
    /// @z.string().nullable()
    /// @v.nullish(v.string())
    /// @a."string | null"
    /// @e.Schema.NullOr(Schema.String)
    phoneNumber: text('phoneNumber'),
    /// Backup codes (hashed, JSON array)
    /// @z.string().nullable()
    /// @v.nullish(v.string())
    /// @a."string | null"
    /// @e.Schema.NullOr(Schema.String)
    backupCodes: text('backupCodes'),
    /// Last verified timestamp
    /// @z.iso.datetime().nullable()
    /// @v.nullish(v.pipe(v.string(), v.isoTimestamp()))
    /// @a."string.date.iso | null"
    /// @e.Schema.NullOr(Schema.DateTimeUtc)
    verifiedAt: text('verifiedAt'),
    /// Creation timestamp
    /// @z.iso.datetime()
    /// @v.pipe(v.string(), v.isoTimestamp())
    /// @a."string.date.iso"
    /// @e.Schema.DateTimeUtc
    createdAt: text('createdAt').notNull().default(sql`(datetime('now'))`),
    /// Last update timestamp
    /// @z.iso.datetime()
    /// @v.pipe(v.string(), v.isoTimestamp())
    /// @a."string.date.iso"
    /// @e.Schema.DateTimeUtc
    updatedAt: text('updatedAt').notNull(),
  },
  (TwoFactorSetting) => ({
    TwoFactorSetting_user_fkey: foreignKey({
      name: 'TwoFactorSetting_user_fkey',
      columns: [TwoFactorSetting.userId],
      foreignColumns: [User.id],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
  }),
)

/// JWT refresh token for session management
/// @relation User.id RefreshToken.userId many-to-one
export const RefreshToken = sqliteTable(
  'RefreshToken',
  {
    /// Refresh token ID
    /// @z.uuid()
    /// @v.pipe(v.string(), v.uuid())
    /// @a."string.uuid"
    /// @e.Schema.UUID
    id: text('id').notNull().primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    /// User ID
    /// @z.uuid()
    /// @v.pipe(v.string(), v.uuid())
    /// @a."string.uuid"
    /// @e.Schema.UUID
    userId: text('userId').notNull(),
    /// Token hash (SHA-256)
    /// @z.string()
    /// @v.string()
    /// @a.string
    /// @e.Schema.String
    tokenHash: text('tokenHash').notNull().unique(),
    /// Device/client identifier
    /// @z.string().nullable()
    /// @v.nullish(v.string())
    /// @a."string | null"
    /// @e.Schema.NullOr(Schema.String)
    deviceInfo: text('deviceInfo'),
    /// IP address at creation
    /// @z.string().nullable()
    /// @v.nullish(v.string())
    /// @a."string | null"
    /// @e.Schema.NullOr(Schema.String)
    ipAddress: text('ipAddress'),
    /// Token expiration timestamp
    /// @z.iso.datetime()
    /// @v.pipe(v.string(), v.isoTimestamp())
    /// @a."string.date.iso"
    /// @e.Schema.DateTimeUtc
    expiresAt: text('expiresAt').notNull(),
    /// Token creation timestamp
    /// @z.iso.datetime()
    /// @v.pipe(v.string(), v.isoTimestamp())
    /// @a."string.date.iso"
    /// @e.Schema.DateTimeUtc
    createdAt: text('createdAt').notNull().default(sql`(datetime('now'))`),
    /// Revocation status
    /// @z.boolean()
    /// @v.boolean()
    /// @a.boolean
    /// @e.Schema.Boolean
    revoked: int('revoked', { mode: 'boolean' }).notNull().default(false),
  },
  (RefreshToken) => ({
    RefreshToken_user_fkey: foreignKey({
      name: 'RefreshToken_user_fkey',
      columns: [RefreshToken.userId],
      foreignColumns: [User.id],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
  }),
)

/// Email verification token
/// @relation User.id EmailVerification.userId many-to-one
export const EmailVerification = sqliteTable(
  'EmailVerification',
  {
    /// Verification ID
    /// @z.uuid()
    /// @v.pipe(v.string(), v.uuid())
    /// @a."string.uuid"
    /// @e.Schema.UUID
    id: text('id').notNull().primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    /// User ID
    /// @z.uuid()
    /// @v.pipe(v.string(), v.uuid())
    /// @a."string.uuid"
    /// @e.Schema.UUID
    userId: text('userId').notNull(),
    /// Verification token (hashed)
    /// @z.string()
    /// @v.string()
    /// @a.string
    /// @e.Schema.String
    tokenHash: text('tokenHash').notNull().unique(),
    /// Token expiration timestamp
    /// @z.iso.datetime()
    /// @v.pipe(v.string(), v.isoTimestamp())
    /// @a."string.date.iso"
    /// @e.Schema.DateTimeUtc
    expiresAt: text('expiresAt').notNull(),
    /// Creation timestamp
    /// @z.iso.datetime()
    /// @v.pipe(v.string(), v.isoTimestamp())
    /// @a."string.date.iso"
    /// @e.Schema.DateTimeUtc
    createdAt: text('createdAt').notNull().default(sql`(datetime('now'))`),
  },
  (EmailVerification) => ({
    EmailVerification_user_fkey: foreignKey({
      name: 'EmailVerification_user_fkey',
      columns: [EmailVerification.userId],
      foreignColumns: [User.id],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
  }),
)

/// Password reset token
/// @relation User.id PasswordReset.userId many-to-one
export const PasswordReset = sqliteTable(
  'PasswordReset',
  {
    /// Reset ID
    /// @z.uuid()
    /// @v.pipe(v.string(), v.uuid())
    /// @a."string.uuid"
    /// @e.Schema.UUID
    id: text('id').notNull().primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    /// User ID
    /// @z.uuid()
    /// @v.pipe(v.string(), v.uuid())
    /// @a."string.uuid"
    /// @e.Schema.UUID
    userId: text('userId').notNull(),
    /// Reset token (hashed)
    /// @z.string()
    /// @v.string()
    /// @a.string
    /// @e.Schema.String
    tokenHash: text('tokenHash').notNull().unique(),
    /// Token expiration timestamp
    /// @z.iso.datetime()
    /// @v.pipe(v.string(), v.isoTimestamp())
    /// @a."string.date.iso"
    /// @e.Schema.DateTimeUtc
    expiresAt: text('expiresAt').notNull(),
    /// Used status
    /// @z.boolean()
    /// @v.boolean()
    /// @a.boolean
    /// @e.Schema.Boolean
    used: int('used', { mode: 'boolean' }).notNull().default(false),
    /// Creation timestamp
    /// @z.iso.datetime()
    /// @v.pipe(v.string(), v.isoTimestamp())
    /// @a."string.date.iso"
    /// @e.Schema.DateTimeUtc
    createdAt: text('createdAt').notNull().default(sql`(datetime('now'))`),
  },
  (PasswordReset) => ({
    PasswordReset_user_fkey: foreignKey({
      name: 'PasswordReset_user_fkey',
      columns: [PasswordReset.userId],
      foreignColumns: [User.id],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
  }),
)

export const UserRelations = relations(User, ({ one, many }) => ({
  oauthAccounts: many(OAuthAccount, {
    relationName: 'OAuthAccountToUser',
  }),
  twoFactorSetting: one(TwoFactorSetting, {
    relationName: 'TwoFactorSettingToUser',
    fields: [User.id],
    references: [TwoFactorSetting.userId],
  }),
  refreshTokens: many(RefreshToken, {
    relationName: 'RefreshTokenToUser',
  }),
  emailVerifications: many(EmailVerification, {
    relationName: 'EmailVerificationToUser',
  }),
  passwordResets: many(PasswordReset, {
    relationName: 'PasswordResetToUser',
  }),
}))

export const OAuthAccountRelations = relations(OAuthAccount, ({ one }) => ({
  user: one(User, {
    relationName: 'OAuthAccountToUser',
    fields: [OAuthAccount.userId],
    references: [User.id],
  }),
}))

export const TwoFactorSettingRelations = relations(TwoFactorSetting, ({ one }) => ({
  user: one(User, {
    relationName: 'TwoFactorSettingToUser',
    fields: [TwoFactorSetting.userId],
    references: [User.id],
  }),
}))

export const RefreshTokenRelations = relations(RefreshToken, ({ one }) => ({
  user: one(User, {
    relationName: 'RefreshTokenToUser',
    fields: [RefreshToken.userId],
    references: [User.id],
  }),
}))

export const EmailVerificationRelations = relations(EmailVerification, ({ one }) => ({
  user: one(User, {
    relationName: 'EmailVerificationToUser',
    fields: [EmailVerification.userId],
    references: [User.id],
  }),
}))

export const PasswordResetRelations = relations(PasswordReset, ({ one }) => ({
  user: one(User, {
    relationName: 'PasswordResetToUser',
    fields: [PasswordReset.userId],
    references: [User.id],
  }),
}))
