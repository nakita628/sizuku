import { relations, sql } from 'drizzle-orm'
import { foreignKey, int, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

/// @relation User.id TwoFactorConfirmation.userId one-to-one
/// @relation User.id Account.userId one-to-many
export const User = sqliteTable('User', {
  /// Unique user ID
  /// @z.cuid()
  id: text('id').notNull().primaryKey().default(sql`(lower(hex(randomblob(12))))`),
  /// Display name
  /// @z.string().min(1).max(50).nullable()
  name: text('name'),
  /// Email address
  /// @z.email().nullable()
  email: text('email').unique(),
  /// Date when the email was verified
  /// @z.iso.datetime().nullable()
  emailVerified: text('emailVerified'),
  /// Profile image URL
  /// @z.url().nullable()
  image: text('image'),
  /// Hashed password
  /// @z.string().min(8).nullable()
  password: text('password'),
  /// Role of the user (ADMIN or USER)
  /// @z.enum(['ADMIN', 'USER'])
  role: text('role', { enum: ['ADMIN', 'USER'] })
    .notNull()
    .default('USER'),
  /// Whether 2FA is enabled
  /// @z.boolean()
  isTwoFactorEnabled: int('isTwoFactorEnabled', { mode: 'boolean' }).default(false),
})

/// @relation User.id Account.userId many-to-one
export const Account = sqliteTable(
  'Account',
  {
    /// Unique account ID
    /// @z.cuid()
    id: text('id').notNull().primaryKey().default(sql`(lower(hex(randomblob(12))))`),
    /// Reference to the user ID
    /// @z.string()
    userId: text('userId').notNull(),
    /// Type of account (e.g., oauth, email)
    /// @z.string()
    type: text('type').notNull(),
    /// Name of the provider (e.g., google, github)
    /// @z.string()
    provider: text('provider').notNull(),
    /// Provider-specific account ID
    /// @z.string()
    providerAccountId: text('providerAccountId').notNull(),
    /// Refresh token
    /// @z.string().nullable()
    refresh_token: text('refresh_token'),
    /// Access token
    /// @z.string().nullable()
    access_token: text('access_token'),
    /// Expiration time (UNIX timestamp)
    /// @z.int().nullable()
    expires_at: int('expires_at'),
    /// Token type (e.g., Bearer)
    /// @z.string().nullable()
    token_type: text('token_type'),
    /// OAuth scope
    /// @z.string().nullable()
    scope: text('scope'),
    /// ID token
    /// @z.string().nullable()
    id_token: text('id_token'),
    /// Session state
    /// @z.string().nullable()
    session_state: text('session_state'),
  },
  (Account) => ({
    Account_user_fkey: foreignKey({
      name: 'Account_user_fkey',
      columns: [Account.userId],
      foreignColumns: [User.id],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
    Account_provider_providerAccountId_unique_idx: uniqueIndex(
      'Account_provider_providerAccountId_key',
    ).on(Account.provider, Account.providerAccountId),
  }),
)

/// Email verification token
export const VerificationToken = sqliteTable(
  'VerificationToken',
  {
    /// Token ID
    /// @z.cuid()
    id: text('id').notNull().primaryKey().default(sql`(lower(hex(randomblob(12))))`),
    /// Email address
    /// @z.email()
    email: text('email').notNull(),
    /// Token string
    /// @z.string()
    token: text('token').notNull().unique(),
    /// Expiry time
    /// @z.iso.datetime()
    expires: text('expires').notNull(),
  },
  (VerificationToken) => ({
    VerificationToken_email_token_unique_idx: uniqueIndex('VerificationToken_email_token_key').on(
      VerificationToken.email,
      VerificationToken.token,
    ),
  }),
)

/// Password reset token
export const PasswordResetToken = sqliteTable(
  'PasswordResetToken',
  {
    /// Token ID
    /// @z.cuid()
    id: text('id').notNull().primaryKey().default(sql`(lower(hex(randomblob(12))))`),
    /// Email address
    /// @z.email()
    email: text('email').notNull(),
    /// Token string
    /// @z.string()
    token: text('token').notNull().unique(),
    /// Expiry time
    /// @z.iso.datetime()
    expires: text('expires').notNull(),
  },
  (PasswordResetToken) => ({
    PasswordResetToken_email_token_unique_idx: uniqueIndex('PasswordResetToken_email_token_key').on(
      PasswordResetToken.email,
      PasswordResetToken.token,
    ),
  }),
)

/// Two-factor authentication token
export const TwoFactorToken = sqliteTable(
  'TwoFactorToken',
  {
    /// Token ID
    /// @z.cuid()
    id: text('id').notNull().primaryKey().default(sql`(lower(hex(randomblob(12))))`),
    /// Email address
    /// @z.email()
    email: text('email').notNull(),
    /// Token string
    /// @z.string()
    token: text('token').notNull().unique(),
    /// Expiry time
    /// @z.iso.datetime()
    expires: text('expires').notNull(),
  },
  (TwoFactorToken) => ({
    TwoFactorToken_email_token_unique_idx: uniqueIndex('TwoFactorToken_email_token_key').on(
      TwoFactorToken.email,
      TwoFactorToken.token,
    ),
  }),
)

/// @relation User.id TwoFactorConfirmation.userId one-to-one
export const TwoFactorConfirmation = sqliteTable(
  'TwoFactorConfirmation',
  {
    /// Confirmation ID
    /// @z.cuid()
    id: text('id').notNull().primaryKey().default(sql`(lower(hex(randomblob(12))))`),
    /// Reference to user
    /// @z.string()
    userId: text('userId').notNull().unique(),
  },
  (TwoFactorConfirmation) => ({
    TwoFactorConfirmation_user_fkey: foreignKey({
      name: 'TwoFactorConfirmation_user_fkey',
      columns: [TwoFactorConfirmation.userId],
      foreignColumns: [User.id],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
  }),
)

export const UserRelations = relations(User, ({ one, many }) => ({
  accounts: many(Account, {
    relationName: 'AccountToUser',
  }),
  twoFactorConfirmation: one(TwoFactorConfirmation, {
    relationName: 'TwoFactorConfirmationToUser',
    fields: [User.id],
    references: [TwoFactorConfirmation.userId],
  }),
}))

export const AccountRelations = relations(Account, ({ one }) => ({
  user: one(User, {
    relationName: 'AccountToUser',
    fields: [Account.userId],
    references: [User.id],
  }),
}))

export const TwoFactorConfirmationRelations = relations(TwoFactorConfirmation, ({ one }) => ({
  user: one(User, {
    relationName: 'TwoFactorConfirmationToUser',
    fields: [TwoFactorConfirmation.userId],
    references: [User.id],
  }),
}))
