import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Anonymous user sessions (no login required)
export const sessions = pgTable("sessions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  deviceId: text("device_id").notNull().unique(),
  credits: integer("credits").notNull().default(0),
  auraPoints: integer("aura_points").notNull().default(0),
  timeBankMinutes: real("time_bank_minutes").notNull().default(0),
  dailyMatchesLeft: integer("daily_matches_left").notNull().default(10),
  dailyMatchesResetAt: timestamp("daily_matches_reset_at").notNull().default(sql`NOW()`),
  isPremium: boolean("is_premium").notNull().default(false),
  premiumExpiresAt: timestamp("premium_expires_at"),
  genderPreference: text("gender_preference"),
  termsAcceptedAt: timestamp("terms_accepted_at"),
  // Habit Loop fields
  dailyStreak: integer("daily_streak").notNull().default(0),
  lastCheckIn: timestamp("last_check_in"),
  lastMoodCheck: text("last_mood_check"), // 'vent' or 'listen'
  firstCallCompleted: boolean("first_call_completed").notNull().default(false),
  // Backup & Restore fields
  restoreToken: text("restore_token"), // Server-generated token for validating restores
  transferredAt: timestamp("transferred_at"), // When this session was transferred to another device
  transferredToSessionId: text("transferred_to_session_id"), // Session ID it was transferred to
  // Country tracking for global rankings
  countryCode: text("country_code"), // ISO 3166-1 alpha-2 country code (e.g., "MY", "US")
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
});

export const insertSessionSchema = createInsertSchema(sessions);
export const selectSessionSchema = createSelectSchema(sessions);
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

// Call history for tracking and analytics
export const calls = pgTable("calls", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  callerSessionId: varchar("caller_session_id").notNull(),
  listenerSessionId: varchar("listener_session_id"),
  callerMood: text("caller_mood").notNull(), // 'vent' or 'listen'
  status: text("status").notNull().default("pending"), // pending, connected, ended, reported
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  durationSeconds: integer("duration_seconds").default(0),
  extensionsUsed: integer("extensions_used").default(0),
  creditsSpent: integer("credits_spent").default(0),
  endReason: text("end_reason"), // normal, extension_declined, reported, disconnected
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

export const insertCallSchema = createInsertSchema(calls);
export const selectCallSchema = createSelectSchema(calls);
export type InsertCall = z.infer<typeof insertCallSchema>;
export type Call = typeof calls.$inferSelect;

// Credit transactions for auditing
export const creditTransactions = pgTable("credit_transactions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  amount: integer("amount").notNull(), // positive = credit, negative = debit
  type: text("type").notNull(), // purchase, extension, shuffle, premium_bonus, refund
  description: text("description"),
  callId: varchar("call_id"),
  stripePaymentId: text("stripe_payment_id"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

export const insertCreditTransactionSchema = createInsertSchema(creditTransactions);
export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;
export type CreditTransaction = typeof creditTransactions.$inferSelect;

// Aura transactions for tracking (renamed from karma for Gen Z appeal)
export const auraTransactions = pgTable("aura_transactions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  amount: integer("amount").notNull(), // positive = earn, negative = penalty
  type: text("type").notNull(), // call_complete, call_extend, reported
  callId: varchar("call_id"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

export const insertAuraTransactionSchema = createInsertSchema(auraTransactions);
export type InsertAuraTransaction = z.infer<typeof insertAuraTransactionSchema>;
export type AuraTransaction = typeof auraTransactions.$inferSelect;

// Reports for safety
export const reports = pgTable("reports", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  reporterSessionId: varchar("reporter_session_id").notNull(),
  reportedSessionId: varchar("reported_session_id"),
  callId: varchar("call_id"),
  reasons: text("reasons").array(), // Array of reason IDs
  otherReason: text("other_reason"), // Custom text from "Other" option
  reason: text("reason"), // Legacy field, keeping for backwards compatibility
  status: text("status").notNull().default("pending"), // pending, reviewed, resolved
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

export const insertReportSchema = createInsertSchema(reports);
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;

// Call ratings for feedback analytics
export const callRatings = pgTable("call_ratings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  callId: varchar("call_id").notNull(),
  sessionId: varchar("session_id").notNull(),
  voiceQuality: integer("voice_quality").notNull(), // 1-5 stars
  strangerQuality: integer("stranger_quality").notNull(), // 1-5 stars
  overallExperience: integer("overall_experience").notNull(), // 1-5 stars
  wouldCallAgain: boolean("would_call_again"), // Optional: would you call again?
  feedback: text("feedback"), // Optional: written feedback
  auraAwarded: integer("aura_awarded").notNull().default(100),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

export const insertCallRatingSchema = createInsertSchema(callRatings);
export type InsertCallRating = z.infer<typeof insertCallRatingSchema>;
export type CallRating = typeof callRatings.$inferSelect;

// Country rankings cache (refreshed every 12 hours)
export const countryRankings = pgTable("country_rankings", {
  countryCode: text("country_code").primaryKey(), // ISO 3166-1 alpha-2 (e.g., "MY", "US")
  countryName: text("country_name").notNull(),
  totalAura: integer("total_aura").notNull().default(0),
  userCount: integer("user_count").notNull().default(0),
  rank: integer("rank").notNull().default(0),
  lastUpdatedAt: timestamp("last_updated_at").notNull().default(sql`NOW()`),
});

export const insertCountryRankingSchema = createInsertSchema(countryRankings);
export type InsertCountryRanking = z.infer<typeof insertCountryRankingSchema>;
export type CountryRanking = typeof countryRankings.$inferSelect;

// Bug reports from users
export const bugReports = pgTable("bug_reports", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id"),
  description: text("description").notNull(),
  deviceInfo: text("device_info"), // Platform, OS version, app version
  status: text("status").notNull().default("pending"), // pending, reviewed, resolved
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

export const insertBugReportSchema = createInsertSchema(bugReports);
export type InsertBugReport = z.infer<typeof insertBugReportSchema>;
export type BugReport = typeof bugReports.$inferSelect;

// Matchmaking queue
export const matchmakingQueue = pgTable("matchmaking_queue", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().unique(),
  mood: text("mood").notNull(), // 'vent' or 'listen'
  cardId: text("card_id"),
  isPriority: boolean("is_priority").notNull().default(false),
  genderPreference: text("gender_preference"),
  status: text("status").notNull().default("waiting"), // 'waiting' or 'matched'
  lastHeartbeat: timestamp("last_heartbeat").notNull().default(sql`NOW()`),
  joinedAt: timestamp("joined_at").notNull().default(sql`NOW()`),
});

export const insertMatchmakingQueueSchema = createInsertSchema(matchmakingQueue);
export type InsertMatchmakingQueue = z.infer<typeof insertMatchmakingQueueSchema>;
export type MatchmakingQueue = typeof matchmakingQueue.$inferSelect;

// Credit packages configuration
export const CREDIT_PACKAGES = [
  { id: "starter", name: "Starter Pack", credits: 250, priceUsd: 0.99 },
  { id: "weekender", name: "Weekender Pack", credits: 1500, priceUsd: 4.99 },
  { id: "power_user", name: "Power User Pack", credits: 3500, priceUsd: 9.99 },
] as const;

// Extension options configuration
export const EXTENSION_OPTIONS = [
  { minutes: 10, credits: 100 },
  { minutes: 20, credits: 180 },
  { minutes: 30, credits: 250 },
  { minutes: 60, credits: 450 },
] as const;

// Aura levels configuration (renamed from Karma for 2026 Gen Z appeal)
export const AURA_LEVELS = [
  { name: "New Soul", minAura: 0 },
  { name: "Kind Listener", minAura: 50 },
  { name: "Empathetic Soul", minAura: 150 },
  { name: "Trusted Companion", minAura: 300 },
  { name: "Guardian Angel", minAura: 500 },
  { name: "Heart of Gold", minAura: 1000 },
] as const;

// Aura rewards/penalties
export const AURA_REWARDS = {
  CALL_MINUTE: 10, // +10 per minute during call
  CALL_COMPLETE: 10,
  CALL_EXTEND: 50,
  REPORTED: -25,
  DAILY_CHECKIN: 5, // +5 for daily check-in
  FIRST_MISSION: 50, // +50 for completing first call ever
} as const;

// Daily Vibe prompts for variable rewards (different prompt each day)
export const DAILY_VIBE_PROMPTS = [
  "What's your secret win this week?",
  "What made you smile today?",
  "What's been on your mind lately?",
  "If you could change one thing right now...",
  "What's something you're grateful for?",
  "What would make today perfect?",
  "What's a small victory you've had recently?",
  "What's keeping you up at night?",
  "If you could talk to anyone, who would it be?",
  "What's something you've been putting off?",
  "What's your current vibe in one word?",
  "What would your younger self think of you now?",
  "What's the best advice you've ever received?",
  "What's something you wish people understood about you?",
] as const;

// Cost constants
export const COSTS = {
  SHUFFLE_DECK: 100,
  DAILY_MATCHES_REFILL: 99, // $0.99 in cents
  PREMIUM_MONTHLY: 1000, // $10.00 in cents
  PREMIUM_BONUS_CREDITS: 200,
} as const;

export const MAX_DAILY_MATCHES = 10;
export const DEFAULT_CALL_DURATION_SECONDS = 300; // 5 minutes
