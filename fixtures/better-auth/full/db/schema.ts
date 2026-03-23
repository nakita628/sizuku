import { pgTable, boolean, integer, text, timestamp } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  /// Primary key
  id: text("id").primaryKey(),
  /// name
  name: text("name").notNull(),
  /// email
  email: text("email").notNull().unique(),
  /// emailVerified
  emailVerified: boolean("emailVerified").notNull().default(false),
  /// image
  image: text("image"),
  /// createdAt
  createdAt: timestamp("createdAt").notNull(),
  /// updatedAt
  updatedAt: timestamp("updatedAt").notNull(),
  /// twoFactorEnabled
  twoFactorEnabled: boolean("twoFactorEnabled").default(false),
  /// role
  role: text("role"),
  /// banned
  banned: boolean("banned").default(false),
  /// banReason
  banReason: text("banReason"),
  /// banExpires
  banExpires: timestamp("banExpires"),
  /// username
  username: text("username").unique(),
  /// displayUsername
  displayUsername: text("displayUsername"),
  /// isAnonymous
  isAnonymous: boolean("isAnonymous").default(false),
  /// phoneNumber
  phoneNumber: text("phoneNumber").unique(),
  /// phoneNumberVerified
  phoneNumberVerified: boolean("phoneNumberVerified"),
});

export const session = pgTable("session", {
  /// Primary key
  id: text("id").primaryKey(),
  /// expiresAt
  expiresAt: timestamp("expiresAt").notNull(),
  /// token
  token: text("token").notNull().unique(),
  /// createdAt
  createdAt: timestamp("createdAt").notNull(),
  /// updatedAt
  updatedAt: timestamp("updatedAt").notNull(),
  /// ipAddress
  ipAddress: text("ipAddress"),
  /// userAgent
  userAgent: text("userAgent"),
  /// userId
  userId: text("userId")
    .references(() => user.id)
    .notNull(),
  /// activeOrganizationId
  activeOrganizationId: text("activeOrganizationId"),
  /// impersonatedBy
  impersonatedBy: text("impersonatedBy"),
});

export const account = pgTable("account", {
  /// Primary key
  id: text("id").primaryKey(),
  /// accountId
  accountId: text("accountId").notNull(),
  /// providerId
  providerId: text("providerId").notNull(),
  /// userId
  userId: text("userId")
    .references(() => user.id)
    .notNull(),
  /// accessToken
  accessToken: text("accessToken"),
  /// refreshToken
  refreshToken: text("refreshToken"),
  /// idToken
  idToken: text("idToken"),
  /// accessTokenExpiresAt
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  /// refreshTokenExpiresAt
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  /// scope
  scope: text("scope"),
  /// password
  password: text("password"),
  /// createdAt
  createdAt: timestamp("createdAt").notNull(),
  /// updatedAt
  updatedAt: timestamp("updatedAt").notNull(),
});

export const verification = pgTable("verification", {
  /// Primary key
  id: text("id").primaryKey(),
  /// identifier
  identifier: text("identifier").notNull(),
  /// value
  value: text("value").notNull(),
  /// expiresAt
  expiresAt: timestamp("expiresAt").notNull(),
  /// createdAt
  createdAt: timestamp("createdAt").notNull(),
  /// updatedAt
  updatedAt: timestamp("updatedAt").notNull(),
});

export const twoFactor = pgTable("twoFactor", {
  /// Primary key
  id: text("id").primaryKey(),
  /// secret
  secret: text("secret").notNull(),
  /// backupCodes
  backupCodes: text("backupCodes").notNull(),
  /// userId
  userId: text("userId")
    .references(() => user.id)
    .notNull(),
});

export const organization = pgTable("organization", {
  /// Primary key
  id: text("id").primaryKey(),
  /// name
  name: text("name").notNull(),
  /// slug
  slug: text("slug").notNull().unique(),
  /// logo
  logo: text("logo"),
  /// createdAt
  createdAt: timestamp("createdAt").notNull(),
  /// metadata
  metadata: text("metadata"),
});

export const member = pgTable("member", {
  /// Primary key
  id: text("id").primaryKey(),
  /// organizationId
  organizationId: text("organizationId")
    .references(() => organization.id)
    .notNull(),
  /// userId
  userId: text("userId")
    .references(() => user.id)
    .notNull(),
  /// role
  role: text("role").notNull().default("member"),
  /// createdAt
  createdAt: timestamp("createdAt").notNull(),
});

export const invitation = pgTable("invitation", {
  /// Primary key
  id: text("id").primaryKey(),
  /// organizationId
  organizationId: text("organizationId")
    .references(() => organization.id)
    .notNull(),
  /// email
  email: text("email").notNull(),
  /// role
  role: text("role"),
  /// status
  status: text("status").notNull().default("pending"),
  /// expiresAt
  expiresAt: timestamp("expiresAt").notNull(),
  /// createdAt
  createdAt: timestamp("createdAt").notNull(),
  /// inviterId
  inviterId: text("inviterId")
    .references(() => user.id)
    .notNull(),
});

export const jwks = pgTable("jwks", {
  /// Primary key
  id: text("id").primaryKey(),
  /// publicKey
  publicKey: text("publicKey").notNull(),
  /// privateKey
  privateKey: text("privateKey").notNull(),
  /// createdAt
  createdAt: timestamp("createdAt").notNull(),
  /// expiresAt
  expiresAt: timestamp("expiresAt"),
});

export const deviceCode = pgTable("deviceCode", {
  /// Primary key
  id: text("id").primaryKey(),
  /// deviceCode
  deviceCode: text("deviceCode").notNull(),
  /// userCode
  userCode: text("userCode").notNull(),
  /// userId
  userId: text("userId"),
  /// expiresAt
  expiresAt: timestamp("expiresAt").notNull(),
  /// status
  status: text("status").notNull(),
  /// lastPolledAt
  lastPolledAt: timestamp("lastPolledAt"),
  /// pollingInterval
  pollingInterval: integer("pollingInterval"),
  /// clientId
  clientId: text("clientId"),
  /// scope
  scope: text("scope"),
});
