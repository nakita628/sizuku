import { pgTable, boolean, text, timestamp } from "drizzle-orm/pg-core";

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
  /// username
  username: text("username").unique(),
  /// displayUsername
  displayUsername: text("displayUsername"),
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
