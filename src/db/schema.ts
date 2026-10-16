import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { CardInput } from "ts-fsrs";

/* Better Auth's tables (email + password accounts). Field names are Better Auth's. */
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * One question's review state for one person. Starts when the question is first answered in a
 * lesson; item ids are stable (data/items.lock.json), so content edits keep the state.
 */
export const itemStates = pgTable(
  "item_states",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    itemId: text("item_id").notNull(),
    fsrs: jsonb("fsrs").$type<CardInput>().notNull(),
    due: timestamp("due", { withTimezone: true }).notNull(),
    introducedAt: timestamp("introduced_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.itemId] }),
    index("item_states_due_idx").on(t.userId, t.due),
  ],
);

/**
 * Every answer, also unscored ones (exams; "pretest" rows date from before lessons taught
 * first): which option, how sure, how fast. For item
 * analysis (dead distractors, too-easy questions) and the confidence calibration.
 */
export const answers = pgTable(
  "answers",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    itemId: text("item_id").notNull(),
    variantId: text("variant_id").notNull(),
    optionId: text("option_id").notNull(),
    correct: boolean("correct").notNull(),
    sure: boolean("sure").notNull(),
    /** The question's content hash when answered. */
    hash: text("hash").notNull(),
    context: text("context", { enum: ["lesson", "pretest", "review", "exam"] }).notNull(),
    /** FSRS grade given (1 Again, 2 Hard, 3 Good); null when unscored. */
    rating: smallint("rating"),
    /** FSRS state before the answer (0 new, 1 learning, 2 review, 3 relearning). */
    state: smallint("state"),
    durationMs: integer("duration_ms"),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("answers_user_idx").on(t.userId, t.at), index("answers_item_idx").on(t.itemId)],
);

/**
 * A lesson finished (kind "lesson"), an exam taken ("exam", score = percent), or a failed login
 * ("login-fail", ref = email, no user).
 */
export const activityLogs = pgTable(
  "activity_logs",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["lesson", "exam", "login-fail"] }).notNull(),
    ref: text("ref").notNull(),
    score: integer("score"),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("activity_logs_kind_idx").on(t.userId, t.kind, t.ref)],
);

/** "Flag this question": something looks wrong. Read before each content batch. */
export const flags = pgTable("flags", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  itemId: text("item_id").notNull(),
  variantId: text("variant_id").notNull(),
  note: text("note").notNull(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});
