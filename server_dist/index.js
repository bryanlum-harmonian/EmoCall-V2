var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import "dotenv/config";
import express from "express";

// server/routes.ts
import { createServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { randomBytes as randomBytes2, createCipheriv, createDecipheriv, scryptSync } from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import multer from "multer";
import agoraToken from "agora-token";

// server/storage.ts
import { eq, and, desc, sql as sql2 } from "drizzle-orm";
import { randomBytes } from "node:crypto";

// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  AURA_LEVELS: () => AURA_LEVELS,
  AURA_REWARDS: () => AURA_REWARDS,
  COSTS: () => COSTS,
  CREDIT_PACKAGES: () => CREDIT_PACKAGES,
  DAILY_VIBE_PROMPTS: () => DAILY_VIBE_PROMPTS,
  DEFAULT_AURA: () => DEFAULT_AURA,
  DEFAULT_CALL_DURATION_SECONDS: () => DEFAULT_CALL_DURATION_SECONDS,
  EXTENSION_OPTIONS: () => EXTENSION_OPTIONS,
  MAX_DAILY_MATCHES: () => MAX_DAILY_MATCHES,
  REFERRAL_REWARD_MINUTES: () => REFERRAL_REWARD_MINUTES,
  TIME_PACKAGES: () => TIME_PACKAGES,
  auraTransactions: () => auraTransactions,
  bugReports: () => bugReports,
  callRatings: () => callRatings,
  calls: () => calls,
  countryRankings: () => countryRankings,
  creditTransactions: () => creditTransactions,
  insertAuraTransactionSchema: () => insertAuraTransactionSchema,
  insertBugReportSchema: () => insertBugReportSchema,
  insertCallRatingSchema: () => insertCallRatingSchema,
  insertCallSchema: () => insertCallSchema,
  insertCountryRankingSchema: () => insertCountryRankingSchema,
  insertCreditTransactionSchema: () => insertCreditTransactionSchema,
  insertMatchmakingQueueSchema: () => insertMatchmakingQueueSchema,
  insertReportSchema: () => insertReportSchema,
  insertSessionSchema: () => insertSessionSchema,
  matchmakingQueue: () => matchmakingQueue,
  reports: () => reports,
  selectCallSchema: () => selectCallSchema,
  selectSessionSchema: () => selectSessionSchema,
  sessions: () => sessions
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
var sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deviceId: text("device_id").notNull().unique(),
  credits: integer("credits").notNull().default(0),
  // Legacy - keeping for backwards compatibility
  auraPoints: integer("aura_points").notNull().default(1e3),
  isSoftBanned: boolean("is_soft_banned").notNull().default(false),
  // Auto-softban when aura reaches 0
  timeBankMinutes: real("time_bank_minutes").notNull().default(5),
  // Default 5 minutes for new users
  dailyMatchesLeft: integer("daily_matches_left").notNull().default(10),
  dailyMatchesResetAt: timestamp("daily_matches_reset_at").notNull().default(sql`NOW()`),
  isPremium: boolean("is_premium").notNull().default(false),
  premiumExpiresAt: timestamp("premium_expires_at"),
  genderPreference: text("gender_preference"),
  termsAcceptedAt: timestamp("terms_accepted_at"),
  // Habit Loop fields
  dailyStreak: integer("daily_streak").notNull().default(0),
  lastCheckIn: timestamp("last_check_in"),
  lastMoodCheck: text("last_mood_check"),
  // 'vent' or 'listen'
  firstCallCompleted: boolean("first_call_completed").notNull().default(false),
  // Backup & Restore fields
  restoreToken: text("restore_token"),
  // Server-generated token for validating restores
  transferredAt: timestamp("transferred_at"),
  // When this session was transferred to another device
  transferredToSessionId: text("transferred_to_session_id"),
  // Session ID it was transferred to
  // Country tracking for global rankings
  countryCode: text("country_code"),
  // ISO 3166-1 alpha-2 country code (e.g., "MY", "US")
  // Referral Program fields
  referralCode: text("referral_code").unique(),
  // Unique 6-char code for sharing
  referredByCode: text("referred_by_code"),
  // The code this user used to sign up
  referralCount: integer("referral_count").notNull().default(0),
  // Number of successful referrals
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`)
});
var insertSessionSchema = createInsertSchema(sessions);
var selectSessionSchema = createSelectSchema(sessions);
var calls = pgTable("calls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callerSessionId: varchar("caller_session_id").notNull(),
  listenerSessionId: varchar("listener_session_id"),
  callerMood: text("caller_mood").notNull(),
  // 'vent' or 'listen'
  status: text("status").notNull().default("pending"),
  // pending, connected, ended, reported
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  durationSeconds: integer("duration_seconds").default(0),
  extensionsUsed: integer("extensions_used").default(0),
  creditsSpent: integer("credits_spent").default(0),
  endReason: text("end_reason"),
  // normal, extension_declined, reported, disconnected
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`)
});
var insertCallSchema = createInsertSchema(calls);
var selectCallSchema = createSelectSchema(calls);
var creditTransactions = pgTable("credit_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  amount: integer("amount").notNull(),
  // positive = credit, negative = debit
  type: text("type").notNull(),
  // purchase, extension, shuffle, premium_bonus, refund
  description: text("description"),
  callId: varchar("call_id"),
  stripePaymentId: text("stripe_payment_id"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`)
});
var insertCreditTransactionSchema = createInsertSchema(creditTransactions);
var auraTransactions = pgTable("aura_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  amount: integer("amount").notNull(),
  // positive = earn, negative = penalty
  type: text("type").notNull(),
  // call_complete, call_extend, reported
  callId: varchar("call_id"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`)
});
var insertAuraTransactionSchema = createInsertSchema(auraTransactions);
var reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reporterSessionId: varchar("reporter_session_id").notNull(),
  reportedSessionId: varchar("reported_session_id"),
  callId: varchar("call_id"),
  reasons: text("reasons").array(),
  // Array of reason IDs
  otherReason: text("other_reason"),
  // Custom text from "Other" option
  reason: text("reason"),
  // Legacy field, keeping for backwards compatibility
  status: text("status").notNull().default("pending"),
  // pending, reviewed, resolved
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`)
});
var insertReportSchema = createInsertSchema(reports);
var callRatings = pgTable("call_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callId: varchar("call_id").notNull(),
  sessionId: varchar("session_id").notNull(),
  voiceQuality: integer("voice_quality").notNull(),
  // 1-5 stars
  strangerQuality: integer("stranger_quality").notNull(),
  // 1-5 stars
  overallExperience: integer("overall_experience").notNull(),
  // 1-5 stars
  wouldCallAgain: boolean("would_call_again"),
  // Optional: would you call again?
  feedback: text("feedback"),
  // Optional: written feedback
  auraAwarded: integer("aura_awarded").notNull().default(100),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`)
});
var insertCallRatingSchema = createInsertSchema(callRatings);
var countryRankings = pgTable("country_rankings", {
  countryCode: text("country_code").primaryKey(),
  // ISO 3166-1 alpha-2 (e.g., "MY", "US")
  countryName: text("country_name").notNull(),
  totalAura: integer("total_aura").notNull().default(0),
  userCount: integer("user_count").notNull().default(0),
  rank: integer("rank").notNull().default(0),
  lastUpdatedAt: timestamp("last_updated_at").notNull().default(sql`NOW()`)
});
var insertCountryRankingSchema = createInsertSchema(countryRankings);
var bugReports = pgTable("bug_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id"),
  description: text("description").notNull(),
  deviceInfo: text("device_info"),
  // Platform, OS version, app version
  attachments: text("attachments").array(),
  // Array of file URLs for screenshots/videos
  status: text("status").notNull().default("pending"),
  // pending, reviewed, resolved
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`)
});
var insertBugReportSchema = createInsertSchema(bugReports);
var matchmakingQueue = pgTable("matchmaking_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().unique(),
  mood: text("mood").notNull(),
  // 'vent' or 'listen'
  cardId: text("card_id"),
  isPriority: boolean("is_priority").notNull().default(false),
  genderPreference: text("gender_preference"),
  status: text("status").notNull().default("waiting"),
  // 'waiting' or 'matched'
  lastHeartbeat: timestamp("last_heartbeat").notNull().default(sql`NOW()`),
  joinedAt: timestamp("joined_at").notNull().default(sql`NOW()`)
});
var insertMatchmakingQueueSchema = createInsertSchema(matchmakingQueue);
var TIME_PACKAGES = [
  { id: "emocall_starter_25", name: "Starter Pack", minutes: 25, priceUsd: 0.99 },
  { id: "emocall_weekender_150", name: "Weekender Pack", minutes: 150, priceUsd: 4.99 },
  { id: "emocall_power_350", name: "Power User Pack", minutes: 350, priceUsd: 9.99 }
];
var CREDIT_PACKAGES = TIME_PACKAGES;
var EXTENSION_OPTIONS = [
  { minutes: 10, cost: 10 },
  // 10 minutes costs 10 minutes from time bank
  { minutes: 20, cost: 20 },
  { minutes: 30, cost: 30 },
  { minutes: 60, cost: 60 }
];
var AURA_LEVELS = [
  { name: "New Soul", minAura: 0 },
  { name: "Kind Listener", minAura: 50 },
  { name: "Empathetic Soul", minAura: 150 },
  { name: "Trusted Companion", minAura: 300 },
  { name: "Guardian Angel", minAura: 500 },
  { name: "Heart of Gold", minAura: 1e3 }
];
var AURA_REWARDS = {
  CALL_MINUTE: 1,
  // +1 per minute during call
  CALL_COMPLETE: 100,
  // +100 for completing a full 60-minute call
  CALL_EXTEND_LONG: 50,
  // +50 for extending 30+ minutes
  CALL_EXTEND_SHORT: 20,
  // +20 for extending 5-29 minutes
  CALL_EXTEND: 50,
  // Legacy - use CALL_EXTEND_LONG/SHORT instead
  REPORTED: -500,
  // -500 for getting reported / unsafe conversation
  DAILY_CHECKIN: 5,
  // +5 for daily check-in
  FIRST_MISSION: 50
  // +50 for completing first call ever
};
var DEFAULT_AURA = 1e3;
var DAILY_VIBE_PROMPTS = [
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
  "What's something you wish people understood about you?"
];
var COSTS = {
  SHUFFLE_DECK: 5,
  // 5 minutes to shuffle deck
  DAILY_MATCHES_REFILL: 99,
  // $0.99 in cents (for IAP)
  PREMIUM_MONTHLY: 1e3,
  // $10.00 in cents
  PREMIUM_BONUS_MINUTES: 30
  // 30 minutes bonus for premium
};
var REFERRAL_REWARD_MINUTES = 60;
var MAX_DAILY_MATCHES = 10;
var DEFAULT_CALL_DURATION_SECONDS = 300;

// server/db.ts
var { Pool } = pg;
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}
var pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Cloud SQL requires SSL in production
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});
var db = drizzle(pool, { schema: schema_exports });

// server/storage.ts
function generateReferralCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}
async function getOrCreateSession(deviceId) {
  const existing = await db.query.sessions.findFirst({
    where: eq(sessions.deviceId, deviceId)
  });
  if (existing) {
    const now = /* @__PURE__ */ new Date();
    const resetAt = new Date(existing.dailyMatchesResetAt);
    const isNewDay = now.toDateString() !== resetAt.toDateString();
    if (isNewDay) {
      const [updated] = await db.update(sessions).set({
        dailyMatchesLeft: MAX_DAILY_MATCHES,
        dailyMatchesResetAt: now,
        updatedAt: now
      }).where(eq(sessions.id, existing.id)).returning();
      return updated;
    }
    return existing;
  }
  let referralCode = generateReferralCode();
  let attempts = 0;
  while (attempts < 5) {
    const existing2 = await db.query.sessions.findFirst({
      where: eq(sessions.referralCode, referralCode)
    });
    if (!existing2) break;
    referralCode = generateReferralCode();
    attempts++;
  }
  const [newSession] = await db.insert(sessions).values({
    deviceId,
    referralCode,
    timeBankMinutes: 5,
    // Default 5 minutes for new users
    auraPoints: DEFAULT_AURA
    // Default 1000 aura for new users
  }).returning();
  return newSession;
}
async function getSession(sessionId) {
  return db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId)
  });
}
async function updateSession(sessionId, updates) {
  const [updated] = await db.update(sessions).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(sessions.id, sessionId)).returning();
  return updated;
}
async function addCredits(sessionId, amount, type, description, stripePaymentId) {
  const session = await getSession(sessionId);
  if (!session) return void 0;
  await db.insert(creditTransactions).values({
    sessionId,
    amount,
    type,
    description,
    stripePaymentId
  });
  const [updated] = await db.update(sessions).set({
    credits: session.credits + amount,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq(sessions.id, sessionId)).returning();
  return updated;
}
async function spendCredits(sessionId, amount, type, description, callId) {
  const session = await getSession(sessionId);
  if (!session || session.credits < amount) return void 0;
  await db.insert(creditTransactions).values({
    sessionId,
    amount: -amount,
    type,
    description,
    callId
  });
  const [updated] = await db.update(sessions).set({
    credits: session.credits - amount,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq(sessions.id, sessionId)).returning();
  return updated;
}
async function addToTimeBank(sessionId, minutes) {
  const session = await getSession(sessionId);
  if (!session) return void 0;
  const [updated] = await db.update(sessions).set({
    timeBankMinutes: session.timeBankMinutes + minutes,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq(sessions.id, sessionId)).returning();
  return updated;
}
async function addAura(sessionId, amount, type, callId) {
  const session = await getSession(sessionId);
  if (!session) return void 0;
  await db.insert(auraTransactions).values({
    sessionId,
    amount,
    type,
    callId
  });
  const newAura = Math.max(0, session.auraPoints + amount);
  const shouldSoftBan = newAura === 0 && !session.isSoftBanned;
  const [updated] = await db.update(sessions).set({
    auraPoints: newAura,
    isSoftBanned: shouldSoftBan ? true : session.isSoftBanned,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq(sessions.id, sessionId)).returning();
  return updated;
}
async function isSessionSoftBanned(sessionId) {
  const session = await getSession(sessionId);
  return session?.isSoftBanned ?? false;
}
async function performDailyCheckIn(sessionId, auraReward) {
  const session = await getSession(sessionId);
  if (!session) return { alreadyCheckedIn: false, streakIncreased: false };
  const now = /* @__PURE__ */ new Date();
  const today = now.toDateString();
  const lastCheckIn = session.lastCheckIn ? new Date(session.lastCheckIn) : null;
  const lastCheckInDay = lastCheckIn ? lastCheckIn.toDateString() : null;
  if (lastCheckInDay === today) {
    return { session, alreadyCheckedIn: true, streakIncreased: false };
  }
  let newStreak = 1;
  let streakIncreased = true;
  if (lastCheckIn) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    if (lastCheckInDay === yesterdayStr) {
      newStreak = session.dailyStreak + 1;
    } else {
      newStreak = 1;
      streakIncreased = false;
    }
  }
  await db.insert(auraTransactions).values({
    sessionId,
    amount: auraReward,
    type: "daily_checkin"
  });
  const [updated] = await db.update(sessions).set({
    dailyStreak: newStreak,
    lastCheckIn: now,
    auraPoints: session.auraPoints + auraReward,
    updatedAt: now
  }).where(eq(sessions.id, sessionId)).returning();
  return { session: updated, alreadyCheckedIn: false, streakIncreased };
}
async function completeFirstMission(sessionId, auraReward) {
  const session = await getSession(sessionId);
  if (!session) return { wasFirstCall: false };
  if (session.firstCallCompleted) {
    return { session, wasFirstCall: false };
  }
  await db.insert(auraTransactions).values({
    sessionId,
    amount: auraReward,
    type: "first_mission"
  });
  const [updated] = await db.update(sessions).set({
    firstCallCompleted: true,
    auraPoints: session.auraPoints + auraReward,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq(sessions.id, sessionId)).returning();
  return { session: updated, wasFirstCall: true };
}
async function useDailyMatch(sessionId) {
  const session = await getSession(sessionId);
  if (!session || session.dailyMatchesLeft <= 0) return void 0;
  const [updated] = await db.update(sessions).set({
    dailyMatchesLeft: session.dailyMatchesLeft - 1,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq(sessions.id, sessionId)).returning();
  return updated;
}
var REFILL_MATCHES_COST = 100;
async function refillDailyMatches(sessionId) {
  const session = await getSession(sessionId);
  if (!session) {
    return { error: "Session not found" };
  }
  if (session.credits < REFILL_MATCHES_COST) {
    return { error: "Not enough credits" };
  }
  const [updated] = await db.update(sessions).set({
    dailyMatchesLeft: MAX_DAILY_MATCHES,
    credits: session.credits - REFILL_MATCHES_COST,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq(sessions.id, sessionId)).returning();
  return { session: updated };
}
async function createCall(data) {
  const [call] = await db.insert(calls).values(data).returning();
  return call;
}
async function updateCall(callId, updates) {
  const [updated] = await db.update(calls).set(updates).where(eq(calls.id, callId)).returning();
  return updated;
}
async function getCallHistory(sessionId, limit = 20) {
  return db.query.calls.findMany({
    where: eq(calls.callerSessionId, sessionId),
    orderBy: [desc(calls.createdAt)],
    limit
  });
}
var HEARTBEAT_TIMEOUT_MS = 15e3;
async function cleanupStaleQueueEntries() {
  const staleThreshold = new Date(Date.now() - HEARTBEAT_TIMEOUT_MS);
  const result = await db.delete(matchmakingQueue).where(sql2`${matchmakingQueue.lastHeartbeat} < ${staleThreshold}`).returning();
  if (result.length > 0) {
    console.log("[Storage] Cleaned up", result.length, "stale queue entries");
  }
  return result.length;
}
async function updateQueueHeartbeat(sessionId) {
  const result = await db.update(matchmakingQueue).set({ lastHeartbeat: /* @__PURE__ */ new Date() }).where(eq(matchmakingQueue.sessionId, sessionId)).returning();
  return result.length > 0;
}
async function markQueueEntryMatched(sessionId) {
  const result = await db.update(matchmakingQueue).set({ status: "matched" }).where(and(
    eq(matchmakingQueue.sessionId, sessionId),
    eq(matchmakingQueue.status, "waiting")
  )).returning();
  return result.length > 0;
}
async function joinQueue(data) {
  await cleanupStaleQueueEntries();
  await db.delete(matchmakingQueue).where(eq(matchmakingQueue.sessionId, data.sessionId));
  await db.insert(matchmakingQueue).values({
    ...data,
    status: "waiting",
    lastHeartbeat: /* @__PURE__ */ new Date()
  });
}
async function leaveQueue(sessionId) {
  await db.delete(matchmakingQueue).where(eq(matchmakingQueue.sessionId, sessionId));
}
async function findAndLockWaitingUser(mood, activeConnections2, excludeSessionId) {
  const users = await db.query.matchmakingQueue.findMany({
    where: and(
      eq(matchmakingQueue.mood, mood),
      eq(matchmakingQueue.status, "waiting")
    ),
    orderBy: [desc(matchmakingQueue.isPriority), matchmakingQueue.joinedAt]
  });
  console.log(`[Storage] Looking for ${mood}er, found`, users.length, "waiting in queue");
  console.log(`[Storage] activeConnections size:`, activeConnections2.size);
  console.log(`[Storage] activeConnections keys:`, Array.from(activeConnections2.keys()).join(", "));
  if (users.length > 0) {
    console.log(`[Storage] Queue users:`, users.map((u) => u.sessionId).join(", "));
  }
  for (const user of users) {
    if (excludeSessionId && user.sessionId === excludeSessionId) {
      console.log(`[Storage] Skipping self:`, user.sessionId);
      continue;
    }
    const connection = activeConnections2.get(user.sessionId);
    console.log(`[Storage] Checking connection for ${user.sessionId}:`, connection ? `readyState=${connection.readyState}` : "NOT FOUND in activeConnections");
    if (!connection || connection.readyState !== 1) {
      console.log(`[Storage] Skipping ${mood}er without active connection:`, user.sessionId, "- connection:", connection ? "exists but wrong state" : "missing (may be reconnecting)");
      continue;
    }
    const claimed = await markQueueEntryMatched(user.sessionId);
    if (claimed) {
      console.log(`[Storage] Atomically claimed ${mood}er:`, user.sessionId);
      return { sessionId: user.sessionId, cardId: user.cardId };
    } else {
      console.log(`[Storage] Race condition: ${mood}er already claimed:`, user.sessionId);
      continue;
    }
  }
  return null;
}
async function findWaitingVenter(activeConnections2, excludeSessionId) {
  return findAndLockWaitingUser("vent", activeConnections2, excludeSessionId);
}
async function findWaitingListener(activeConnections2, excludeSessionId) {
  return findAndLockWaitingUser("listen", activeConnections2, excludeSessionId);
}
async function createReport(data) {
  await db.insert(reports).values(data);
}
async function createBugReport(data) {
  await db.insert(bugReports).values(data);
}
async function createCallRating(data) {
  const [rating] = await db.insert(callRatings).values(data).returning();
  return rating;
}
async function getCallRatingBySessionAndCall(sessionId, callId) {
  return await db.query.callRatings.findFirst({
    where: and(
      eq(callRatings.sessionId, sessionId),
      eq(callRatings.callId, callId)
    )
  });
}
async function hasSubmittedRating(sessionId, callId) {
  const existing = await getCallRatingBySessionAndCall(sessionId, callId);
  return !!existing;
}
async function activatePremium(sessionId, durationDays, bonusCredits) {
  const session = await getSession(sessionId);
  if (!session) return void 0;
  const expiresAt = /* @__PURE__ */ new Date();
  expiresAt.setDate(expiresAt.getDate() + durationDays);
  await addCredits(sessionId, bonusCredits, "premium_bonus", "Premium subscription bonus");
  const [updated] = await db.update(sessions).set({
    isPremium: true,
    premiumExpiresAt: expiresAt,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq(sessions.id, sessionId)).returning();
  return updated;
}
async function checkPremiumStatus(sessionId) {
  const session = await getSession(sessionId);
  if (!session) return false;
  if (!session.isPremium) return false;
  if (session.premiumExpiresAt && new Date(session.premiumExpiresAt) < /* @__PURE__ */ new Date()) {
    await db.update(sessions).set({ isPremium: false, updatedAt: /* @__PURE__ */ new Date() }).where(eq(sessions.id, sessionId));
    return false;
  }
  return true;
}
async function generateRestoreToken(sessionId) {
  const restoreToken = randomBytes(32).toString("hex");
  await db.update(sessions).set({
    restoreToken,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq(sessions.id, sessionId));
  return restoreToken;
}
async function validateAndRestoreSession(oldSessionId, restoreToken, newSessionId) {
  const oldSession = await getSession(oldSessionId);
  if (!oldSession) {
    return { success: false, error: "Original session not found" };
  }
  if (oldSession.transferredAt) {
    return { success: false, error: "This session has already been transferred to another device" };
  }
  if (!oldSession.restoreToken || oldSession.restoreToken !== restoreToken) {
    return { success: false, error: "Invalid restore token" };
  }
  const newSession = await getSession(newSessionId);
  if (!newSession) {
    return { success: false, error: "New session not found" };
  }
  const now = /* @__PURE__ */ new Date();
  const [updatedNewSession] = await db.update(sessions).set({
    credits: oldSession.credits,
    auraPoints: oldSession.auraPoints,
    timeBankMinutes: oldSession.timeBankMinutes,
    dailyMatchesLeft: oldSession.dailyMatchesLeft,
    dailyMatchesResetAt: oldSession.dailyMatchesResetAt,
    isPremium: oldSession.isPremium,
    premiumExpiresAt: oldSession.premiumExpiresAt,
    genderPreference: oldSession.genderPreference,
    termsAcceptedAt: oldSession.termsAcceptedAt,
    dailyStreak: oldSession.dailyStreak,
    lastCheckIn: oldSession.lastCheckIn,
    lastMoodCheck: oldSession.lastMoodCheck,
    firstCallCompleted: oldSession.firstCallCompleted,
    updatedAt: now
  }).where(eq(sessions.id, newSessionId)).returning();
  await db.update(sessions).set({
    transferredAt: now,
    transferredToSessionId: newSessionId,
    restoreToken: null,
    // Invalidate the token
    updatedAt: now
  }).where(eq(sessions.id, oldSessionId));
  return { success: true, session: updatedNewSession };
}
var COUNTRY_NAMES = {
  AF: "Afghanistan",
  AL: "Albania",
  DZ: "Algeria",
  AD: "Andorra",
  AO: "Angola",
  AR: "Argentina",
  AM: "Armenia",
  AU: "Australia",
  AT: "Austria",
  AZ: "Azerbaijan",
  BS: "Bahamas",
  BH: "Bahrain",
  BD: "Bangladesh",
  BB: "Barbados",
  BY: "Belarus",
  BE: "Belgium",
  BZ: "Belize",
  BJ: "Benin",
  BT: "Bhutan",
  BO: "Bolivia",
  BA: "Bosnia",
  BW: "Botswana",
  BR: "Brazil",
  BN: "Brunei",
  BG: "Bulgaria",
  KH: "Cambodia",
  CM: "Cameroon",
  CA: "Canada",
  CL: "Chile",
  CN: "China",
  CO: "Colombia",
  CR: "Costa Rica",
  HR: "Croatia",
  CU: "Cuba",
  CY: "Cyprus",
  CZ: "Czechia",
  DK: "Denmark",
  DO: "Dominican Republic",
  EC: "Ecuador",
  EG: "Egypt",
  SV: "El Salvador",
  EE: "Estonia",
  ET: "Ethiopia",
  FI: "Finland",
  FR: "France",
  GE: "Georgia",
  DE: "Germany",
  GH: "Ghana",
  GR: "Greece",
  GT: "Guatemala",
  HK: "Hong Kong",
  HU: "Hungary",
  IS: "Iceland",
  IN: "India",
  ID: "Indonesia",
  IR: "Iran",
  IQ: "Iraq",
  IE: "Ireland",
  IL: "Israel",
  IT: "Italy",
  JM: "Jamaica",
  JP: "Japan",
  JO: "Jordan",
  KZ: "Kazakhstan",
  KE: "Kenya",
  KR: "South Korea",
  KW: "Kuwait",
  LV: "Latvia",
  LB: "Lebanon",
  LT: "Lithuania",
  LU: "Luxembourg",
  MY: "Malaysia",
  MV: "Maldives",
  MX: "Mexico",
  MA: "Morocco",
  MM: "Myanmar",
  NP: "Nepal",
  NL: "Netherlands",
  NZ: "New Zealand",
  NG: "Nigeria",
  NO: "Norway",
  OM: "Oman",
  PK: "Pakistan",
  PA: "Panama",
  PY: "Paraguay",
  PE: "Peru",
  PH: "Philippines",
  PL: "Poland",
  PT: "Portugal",
  QA: "Qatar",
  RO: "Romania",
  RU: "Russia",
  SA: "Saudi Arabia",
  RS: "Serbia",
  SG: "Singapore",
  SK: "Slovakia",
  SI: "Slovenia",
  ZA: "South Africa",
  ES: "Spain",
  LK: "Sri Lanka",
  SE: "Sweden",
  CH: "Switzerland",
  TW: "Taiwan",
  TH: "Thailand",
  TR: "Turkey",
  UA: "Ukraine",
  AE: "UAE",
  GB: "United Kingdom",
  US: "United States",
  UY: "Uruguay",
  UZ: "Uzbekistan",
  VE: "Venezuela",
  VN: "Vietnam",
  ZW: "Zimbabwe"
};
function getCountryName(code) {
  return COUNTRY_NAMES[code.toUpperCase()] || code;
}
async function updateSessionCountry(sessionId, countryCode) {
  const [updated] = await db.update(sessions).set({ countryCode: countryCode.toUpperCase(), updatedAt: /* @__PURE__ */ new Date() }).where(eq(sessions.id, sessionId)).returning();
  return updated;
}
async function getCountryRankings() {
  return db.query.countryRankings.findMany({
    orderBy: [desc(countryRankings.totalAura)]
  });
}
async function shouldRefreshRankings() {
  const result = await db.query.countryRankings.findFirst();
  if (!result) return true;
  const now = /* @__PURE__ */ new Date();
  const lastUpdate = new Date(result.lastUpdatedAt);
  const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1e3 * 60 * 60);
  return hoursSinceUpdate >= 12;
}
async function refreshCountryRankings() {
  const now = /* @__PURE__ */ new Date();
  const aggregation = await db.execute(sql2`
    SELECT 
      country_code,
      SUM(aura_points) as total_aura,
      COUNT(*) as user_count
    FROM sessions
    WHERE country_code IS NOT NULL AND country_code != ''
    GROUP BY country_code
    ORDER BY total_aura DESC
  `);
  await db.delete(countryRankings);
  const rankings = [];
  let rank = 1;
  for (const row of aggregation.rows) {
    const countryCode = row.country_code;
    const totalAura = parseInt(row.total_aura) || 0;
    const userCount = parseInt(row.user_count) || 0;
    const [inserted] = await db.insert(countryRankings).values({
      countryCode,
      countryName: getCountryName(countryCode),
      totalAura,
      userCount,
      rank,
      lastUpdatedAt: now
    }).returning();
    rankings.push(inserted);
    rank++;
  }
  return rankings;
}
async function getSessionByReferralCode(code) {
  return db.query.sessions.findFirst({
    where: eq(sessions.referralCode, code.toUpperCase())
  });
}
async function redeemReferralCode(sessionId, referralCode) {
  const session = await getSession(sessionId);
  if (!session) {
    return { success: false, message: "Session not found" };
  }
  if (session.referredByCode) {
    return { success: false, message: "You have already used a referral code" };
  }
  const code = referralCode.toUpperCase().trim();
  if (session.referralCode === code) {
    return { success: false, message: "You cannot use your own referral code" };
  }
  const referrer = await getSessionByReferralCode(code);
  if (!referrer) {
    return { success: false, message: "Invalid referral code" };
  }
  await db.update(sessions).set({
    referredByCode: code,
    timeBankMinutes: (session.timeBankMinutes || 0) + REFERRAL_REWARD_MINUTES,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq(sessions.id, sessionId));
  await db.update(sessions).set({
    referralCount: (referrer.referralCount || 0) + 1,
    timeBankMinutes: (referrer.timeBankMinutes || 0) + REFERRAL_REWARD_MINUTES,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq(sessions.id, referrer.id));
  return {
    success: true,
    message: `Success! You and your friend both received ${REFERRAL_REWARD_MINUTES} minutes!`
  };
}
async function purchaseTimePackage(sessionId, packageId) {
  const session = await getSession(sessionId);
  if (!session) {
    return { success: false, message: "Session not found" };
  }
  const pkg = TIME_PACKAGES.find((p) => p.id === packageId);
  if (!pkg) {
    return { success: false, message: "Invalid package" };
  }
  const newBalance = (session.timeBankMinutes || 0) + pkg.minutes;
  await db.update(sessions).set({
    timeBankMinutes: newBalance,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq(sessions.id, sessionId));
  await db.insert(creditTransactions).values({
    sessionId,
    amount: pkg.minutes,
    type: "purchase",
    description: `Purchased ${pkg.name} (${pkg.minutes} minutes)`
  });
  return {
    success: true,
    message: `Added ${pkg.minutes} minutes to your Time Bank!`,
    minutesAdded: pkg.minutes
  };
}
async function deductTimeBank(sessionId, minutes, reason) {
  const session = await getSession(sessionId);
  if (!session) {
    return { success: false, newBalance: 0 };
  }
  const currentBalance = session.timeBankMinutes || 0;
  if (currentBalance < minutes) {
    return { success: false, newBalance: currentBalance };
  }
  const newBalance = currentBalance - minutes;
  await db.update(sessions).set({
    timeBankMinutes: newBalance,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq(sessions.id, sessionId));
  await db.insert(creditTransactions).values({
    sessionId,
    amount: -minutes,
    type: "extension",
    description: reason
  });
  return { success: true, newBalance };
}

// server/routes.ts
var { RtcTokenBuilder, RtcRole } = agoraToken;
var activeConnections = /* @__PURE__ */ new Map();
var activeCalls = /* @__PURE__ */ new Map();
var pendingMatches = /* @__PURE__ */ new Map();
var callReadyUsers = /* @__PURE__ */ new Map();
var callParticipants = /* @__PURE__ */ new Map();
var CALL_DISCONNECT_GRACE_PERIOD = 15e3;
var uploadsDir = path.join(process.cwd(), "server", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
var storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `bug-${uniqueSuffix}${ext}`);
  }
});
var upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
    // 50MB max per file
    files: 5
    // Max 5 files at once
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/quicktime",
      "video/webm"
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only images and videos are allowed."));
    }
  }
});
async function cleanupSessionState(sessionId, reason = "cleanup") {
  console.log(`[Cleanup] Cleaning session state for ${sessionId}, reason: ${reason}`);
  await leaveQueue(sessionId);
  pendingMatches.delete(sessionId);
  console.log(`[Cleanup] Session ${sessionId} cleaned up`);
}
async function createMatch(venterSessionId, listenerSessionId, venterWs, listenerWs) {
  console.log("[Match] Creating match between venter:", venterSessionId, "and listener:", listenerSessionId);
  await leaveQueue(venterSessionId);
  await leaveQueue(listenerSessionId);
  pendingMatches.delete(venterSessionId);
  pendingMatches.delete(listenerSessionId);
  const call = await createCall({
    callerSessionId: venterSessionId,
    listenerSessionId,
    callerMood: "vent",
    status: "pending",
    // Status is pending until both users signal ready
    startedAt: /* @__PURE__ */ new Date()
  });
  callParticipants.set(call.id, { venter: venterSessionId, listener: listenerSessionId });
  callReadyUsers.set(call.id, /* @__PURE__ */ new Set());
  const matchDataForVenter = {
    callId: call.id,
    partnerId: listenerSessionId,
    duration: DEFAULT_CALL_DURATION_SECONDS,
    startedAt: ""
    // Will be set in call_started message
  };
  const matchDataForListener = {
    callId: call.id,
    partnerId: venterSessionId,
    duration: DEFAULT_CALL_DURATION_SECONDS,
    startedAt: ""
    // Will be set in call_started message
  };
  pendingMatches.set(venterSessionId, matchDataForVenter);
  pendingMatches.set(listenerSessionId, matchDataForListener);
  console.log("[Match] Match created! callId:", call.id, "waiting for both users to signal ready");
  const CALL_READY_TIMEOUT = 3e4;
  setTimeout(() => {
    const readyUsers = callReadyUsers.get(call.id);
    const participants = callParticipants.get(call.id);
    if (readyUsers && participants && readyUsers.size < 2) {
      console.log(`[Match] Timeout! Call ${call.id} only has ${readyUsers.size} ready users after ${CALL_READY_TIMEOUT / 1e3}s. Cleaning up.`);
      const timeoutMessage = JSON.stringify({ type: "call_ended", reason: "connection_timeout" });
      const venterWsStored = activeConnections.get(participants.venter);
      const listenerWsStored = activeConnections.get(participants.listener);
      if (venterWsStored && venterWsStored.readyState === WebSocket.OPEN) {
        try {
          venterWsStored.send(timeoutMessage);
        } catch (e) {
        }
      }
      if (listenerWsStored && listenerWsStored.readyState === WebSocket.OPEN) {
        try {
          listenerWsStored.send(timeoutMessage);
        } catch (e) {
        }
      }
      callParticipants.delete(call.id);
      callReadyUsers.delete(call.id);
      pendingMatches.delete(venterSessionId);
      pendingMatches.delete(listenerSessionId);
      activeCalls.delete(venterSessionId);
      activeCalls.delete(listenerSessionId);
      console.log(`[Match] Cleaned up timed-out call ${call.id}`);
    }
  }, CALL_READY_TIMEOUT);
  const matchFoundMessage = (partnerId) => JSON.stringify({
    type: "match_found",
    callId: call.id,
    partnerId,
    duration: DEFAULT_CALL_DURATION_SECONDS
    // Note: startedAt not included - timer doesn't start until call_started message
  });
  if (venterWs && venterWs.readyState === WebSocket.OPEN) {
    try {
      venterWs.send(matchFoundMessage(listenerSessionId));
      console.log("[Match] Sent match_found to venter:", venterSessionId);
    } catch (err) {
      console.log("[Match] Failed to send to venter, will use HTTP polling");
    }
  } else {
    console.log("[Match] Venter WebSocket not open, will use HTTP polling");
  }
  if (listenerWs && listenerWs.readyState === WebSocket.OPEN) {
    try {
      listenerWs.send(matchFoundMessage(venterSessionId));
      console.log("[Match] Sent match_found to listener:", listenerSessionId);
    } catch (err) {
      console.log("[Match] Failed to send to listener, will use HTTP polling");
    }
  } else {
    console.log("[Match] Listener WebSocket not open, will use HTTP polling");
  }
  return { callId: call.id, success: true };
}
async function registerRoutes(app2) {
  const httpServer = createServer(app2);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  wss.on("connection", (ws, req) => {
    let sessionId = null;
    let pingInterval = null;
    pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 3e4);
    ws.on("pong", () => {
    });
    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        switch (message.type) {
          case "register":
            sessionId = message.sessionId;
            if (sessionId) {
              console.log("[WS] Registering session:", sessionId, "- Total active connections:", activeConnections.size + 1);
              const existingWs = activeConnections.get(sessionId);
              if (existingWs && existingWs !== ws && existingWs.readyState === WebSocket.OPEN) {
                console.log("[WS] Closing existing connection for session:", sessionId);
                try {
                  existingWs.send(JSON.stringify({ type: "connection_replaced" }));
                } catch (e) {
                }
                setTimeout(() => {
                  if (existingWs.readyState === WebSocket.OPEN) {
                    existingWs.close();
                  }
                }, 50);
              }
              activeConnections.set(sessionId, ws);
              const pendingMatch = pendingMatches.get(sessionId);
              if (pendingMatch) {
                console.log("[WS] Found pending match for session:", sessionId, "callId:", pendingMatch.callId);
                ws.send(JSON.stringify({
                  type: "match_found",
                  callId: pendingMatch.callId,
                  partnerId: pendingMatch.partnerId,
                  duration: pendingMatch.duration,
                  startedAt: pendingMatch.startedAt
                }));
                pendingMatches.delete(sessionId);
              }
              const activeCall = activeCalls.get(sessionId);
              if (activeCall) {
                const remainingMs = activeCall.endTime - Date.now();
                if (remainingMs > 0) {
                  console.log("[WS] User reconnected during active call, re-sending call_started:", sessionId);
                  ws.send(JSON.stringify({
                    type: "call_started",
                    callId: activeCall.callId,
                    startedAt: new Date(activeCall.startTime).toISOString(),
                    duration: Math.floor(remainingMs / 1e3)
                  }));
                }
              }
            }
            break;
          case "join_queue":
            console.log("[WS] join_queue received - sessionId:", sessionId, "mood:", message.mood, "cardId:", message.cardId);
            if (sessionId && message.mood && message.cardId) {
              console.log("[WS] join_queue processing from:", sessionId, "mood:", message.mood);
              const isBanned = await isSessionSoftBanned(sessionId);
              if (isBanned) {
                console.log("[WS] Session is soft banned, rejecting queue join:", sessionId);
                ws.send(JSON.stringify({
                  type: "queue_rejected",
                  reason: "soft_banned",
                  message: "Your aura has reached 0. You have been temporarily restricted from making calls."
                }));
                break;
              }
              const existingCall = activeCalls.get(sessionId);
              if (existingCall) {
                console.log("[WS] Session already in call, sending match info instead of joining queue");
                ws.send(JSON.stringify({
                  type: "match_found",
                  callId: existingCall.callId,
                  partnerId: existingCall.partnerId,
                  duration: Math.floor((existingCall.endTime - Date.now()) / 1e3),
                  startedAt: new Date(existingCall.startTime).toISOString()
                }));
                break;
              }
              const existingPendingMatch = pendingMatches.get(sessionId);
              if (existingPendingMatch) {
                console.log("[WS] Found pending match for session trying to join queue:", sessionId);
                ws.send(JSON.stringify({
                  type: "match_found",
                  callId: existingPendingMatch.callId,
                  partnerId: existingPendingMatch.partnerId,
                  duration: existingPendingMatch.duration,
                  startedAt: existingPendingMatch.startedAt
                }));
                pendingMatches.delete(sessionId);
                break;
              }
              const isVenter = message.mood === "vent";
              const oppositeMood = isVenter ? "listen" : "vent";
              console.log(`[WS] ${isVenter ? "Venter" : "Listener"} joining, checking for waiting ${oppositeMood}ers. Active connections:`, activeConnections.size);
              const oppositeUser = isVenter ? await findWaitingListener(activeConnections) : await findWaitingVenter(activeConnections);
              console.log(`[WS] find${isVenter ? "Listener" : "Venter"} result:`, oppositeUser ? oppositeUser.sessionId : "none");
              if (oppositeUser) {
                const venterSessionId = isVenter ? sessionId : oppositeUser.sessionId;
                const listenerSessionId = isVenter ? oppositeUser.sessionId : sessionId;
                const venterWs = isVenter ? ws : activeConnections.get(oppositeUser.sessionId);
                const listenerWs = isVenter ? activeConnections.get(oppositeUser.sessionId) : ws;
                await createMatch(venterSessionId, listenerSessionId, venterWs, listenerWs);
              } else {
                await leaveQueue(sessionId);
                await joinQueue({
                  sessionId,
                  mood: message.mood,
                  cardId: message.cardId,
                  isPriority: message.isPriority || false
                });
                console.log(`[WS] ${isVenter ? "Venter" : "Listener"} joined waiting pool:`, sessionId);
                ws.send(JSON.stringify({ type: "waiting", mood: message.mood }));
              }
            }
            break;
          case "leave_queue":
            if (sessionId) {
              console.log("[WS] leave_queue received from:", sessionId);
              await cleanupSessionState(sessionId, "user_left_queue");
            }
            break;
          case "heartbeat":
            console.log(`[WS] heartbeat received from: ${sessionId}`);
            if (sessionId) {
              const updated = await updateQueueHeartbeat(sessionId);
              console.log(`[WS] heartbeat update result for ${sessionId}:`, updated);
              if (updated) {
                ws.send(JSON.stringify({ type: "heartbeat_ack" }));
              }
            }
            break;
          case "call_ready":
            if (sessionId && message.callId) {
              const callId = message.callId;
              const participants = callParticipants.get(callId);
              const readySet = callReadyUsers.get(callId);
              if (participants && readySet) {
                console.log(`[WS] call_ready received from ${sessionId} for call ${callId}`);
                readySet.add(sessionId);
                const bothReady = readySet.has(participants.venter) && readySet.has(participants.listener);
                if (bothReady) {
                  console.log(`[WS] Both users ready for call ${callId} - starting timer NOW`);
                  const startTime = Date.now();
                  const startedAtISO = new Date(startTime).toISOString();
                  const endTime = startTime + DEFAULT_CALL_DURATION_SECONDS * 1e3;
                  activeCalls.set(participants.venter, { callId, partnerId: participants.listener, endTime, startTime });
                  activeCalls.set(participants.listener, { callId, partnerId: participants.venter, endTime, startTime });
                  await updateCall(callId, {
                    status: "connected",
                    startedAt: new Date(startTime)
                  });
                  const callStartedMessage = JSON.stringify({
                    type: "call_started",
                    callId,
                    startedAt: startedAtISO,
                    duration: DEFAULT_CALL_DURATION_SECONDS
                  });
                  const venterWs = activeConnections.get(participants.venter);
                  const listenerWs = activeConnections.get(participants.listener);
                  if (venterWs && venterWs.readyState === WebSocket.OPEN) {
                    venterWs.send(callStartedMessage);
                    console.log(`[WS] Sent call_started to venter ${participants.venter}`);
                  }
                  if (listenerWs && listenerWs.readyState === WebSocket.OPEN) {
                    listenerWs.send(callStartedMessage);
                    console.log(`[WS] Sent call_started to listener ${participants.listener}`);
                  }
                  callReadyUsers.delete(callId);
                  callParticipants.delete(callId);
                  pendingMatches.delete(participants.venter);
                  pendingMatches.delete(participants.listener);
                } else {
                  ws.send(JSON.stringify({ type: "waiting_for_partner", callId }));
                  console.log(`[WS] Waiting for partner to be ready for call ${callId}`);
                }
              } else {
                console.log(`[WS] call_ready for unknown call ${callId} from ${sessionId}`);
              }
            }
            break;
          case "check_match":
            if (sessionId) {
              const pendingMatch = pendingMatches.get(sessionId);
              if (pendingMatch) {
                console.log("[WS] Sending pending match to session:", sessionId);
                ws.send(JSON.stringify({
                  type: "match_found",
                  callId: pendingMatch.callId,
                  partnerId: pendingMatch.partnerId,
                  duration: pendingMatch.duration,
                  startedAt: pendingMatch.startedAt
                }));
                pendingMatches.delete(sessionId);
              } else {
                const activeCall = activeCalls.get(sessionId);
                if (activeCall) {
                  ws.send(JSON.stringify({
                    type: "match_found",
                    callId: activeCall.callId,
                    partnerId: activeCall.partnerId,
                    duration: DEFAULT_CALL_DURATION_SECONDS,
                    startedAt: new Date(activeCall.startTime).toISOString()
                  }));
                }
              }
            }
            break;
          case "end_call":
            console.log("[WS] Received end_call from session:", sessionId, "reason:", message.reason);
            if (sessionId) {
              const activeCall = activeCalls.get(sessionId);
              console.log("[WS] Active call found:", !!activeCall, activeCall ? `partnerId: ${activeCall.partnerId}` : "no active call");
              if (activeCall) {
                const partnerId = activeCall.partnerId;
                await updateCall(activeCall.callId, {
                  status: "ended",
                  endedAt: /* @__PURE__ */ new Date(),
                  endReason: message.reason || "normal"
                });
                const callDurationMs = Date.now() - activeCall.startTime;
                const callDurationMinutes = callDurationMs / (60 * 1e3);
                if (callDurationMinutes >= 60) {
                  await addAura(sessionId, AURA_REWARDS.CALL_COMPLETE, "call_complete", activeCall.callId);
                }
                if (message.remainingSeconds && message.remainingSeconds > 60) {
                  const refundMinutes = Math.floor(message.remainingSeconds / 60);
                  await addToTimeBank(sessionId, refundMinutes);
                }
                const partnerWs = activeConnections.get(partnerId);
                console.log("[WS] Partner WebSocket found:", !!partnerWs, "state:", partnerWs?.readyState, "OPEN =", WebSocket.OPEN);
                if (partnerWs && partnerWs.readyState === WebSocket.OPEN) {
                  console.log("[WS] Sending call_ended to partner:", partnerId);
                  partnerWs.send(JSON.stringify({ type: "call_ended", reason: message.reason }));
                } else {
                  console.log("[WS] WARNING: Partner WebSocket not available");
                }
                activeCalls.delete(sessionId);
                activeCalls.delete(partnerId);
                pendingMatches.delete(sessionId);
                pendingMatches.delete(partnerId);
                await leaveQueue(sessionId);
                await leaveQueue(partnerId);
                console.log("[WS] Cleaned up all state for both sessions after call end");
              } else {
                console.log("[WS] WARNING: No active call found for session:", sessionId);
                await cleanupSessionState(sessionId, "end_call_no_active_call");
              }
            }
            break;
          case "extend_call":
            if (sessionId && message.minutes) {
              const activeCall = activeCalls.get(sessionId);
              if (activeCall) {
                const extension = EXTENSION_OPTIONS.find((e) => e.minutes === message.minutes);
                if (extension) {
                  const MAX_CALL_DURATION_MS = 60 * 60 * 1e3;
                  const currentTotalDuration = activeCall.endTime - activeCall.startTime;
                  const newTotalDuration = currentTotalDuration + extension.minutes * 60 * 1e3;
                  if (newTotalDuration > MAX_CALL_DURATION_MS) {
                    console.log("[WS] Extension rejected: would exceed 60-minute maximum");
                    ws.send(JSON.stringify({
                      type: "extension_rejected",
                      reason: "max_duration",
                      message: "Beautiful moments don't need to last forever. This call has reached the 60-minute maximum."
                    }));
                    break;
                  }
                  const session = await getSession(sessionId);
                  if (session && (session.timeBankMinutes || 0) >= extension.minutes) {
                    await deductTimeBank(sessionId, extension.minutes, `${extension.minutes} minute extension`);
                    const extensionAura = extension.minutes >= 30 ? AURA_REWARDS.CALL_EXTEND_LONG : AURA_REWARDS.CALL_EXTEND_SHORT;
                    await addAura(sessionId, extensionAura, "call_extend", activeCall.callId);
                    const newEndTime = activeCall.endTime + extension.minutes * 60 * 1e3;
                    activeCall.endTime = newEndTime;
                    const partnerCall = activeCalls.get(activeCall.partnerId);
                    if (partnerCall) {
                      partnerCall.endTime = newEndTime;
                    }
                    ws.send(JSON.stringify({ type: "call_extended", minutes: extension.minutes }));
                    const partnerWs = activeConnections.get(activeCall.partnerId);
                    if (partnerWs && partnerWs.readyState === WebSocket.OPEN) {
                      partnerWs.send(JSON.stringify({ type: "call_extended", minutes: extension.minutes }));
                    }
                  }
                }
              }
            }
            break;
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });
    ws.on("close", async () => {
      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
      }
      if (sessionId) {
        console.log("[WS] Connection closed for session:", sessionId);
        const currentWs = activeConnections.get(sessionId);
        if (currentWs === ws) {
          activeConnections.delete(sessionId);
          const activeCall = activeCalls.get(sessionId);
          if (activeCall) {
            const callDuration = Date.now() - activeCall.startTime;
            if (callDuration < CALL_DISCONNECT_GRACE_PERIOD) {
              console.log("[WS] Call just started, giving grace period for reconnection. Session:", sessionId, "Duration:", callDuration, "ms");
              const disconnectedSessionId = sessionId;
              setTimeout(async () => {
                const reconnectedWs = activeConnections.get(disconnectedSessionId);
                if (!reconnectedWs || reconnectedWs.readyState !== WebSocket.OPEN) {
                  console.log("[WS] Grace period expired, ending call for session:", disconnectedSessionId);
                  const stillActiveCall = activeCalls.get(disconnectedSessionId);
                  if (stillActiveCall) {
                    const partnerId = stillActiveCall.partnerId;
                    await updateCall(stillActiveCall.callId, {
                      status: "ended",
                      endedAt: /* @__PURE__ */ new Date(),
                      endReason: "disconnected"
                    });
                    const partnerWs = activeConnections.get(partnerId);
                    if (partnerWs && partnerWs.readyState === WebSocket.OPEN) {
                      partnerWs.send(JSON.stringify({ type: "call_ended", reason: "partner_disconnected" }));
                    }
                    activeCalls.delete(disconnectedSessionId);
                    activeCalls.delete(partnerId);
                    pendingMatches.delete(disconnectedSessionId);
                    pendingMatches.delete(partnerId);
                    await leaveQueue(disconnectedSessionId);
                    await leaveQueue(partnerId);
                  }
                } else {
                  console.log("[WS] Session reconnected within grace period:", disconnectedSessionId);
                }
              }, CALL_DISCONNECT_GRACE_PERIOD - callDuration);
            } else {
              console.log("[WS] Call active for", callDuration, "ms, ending due to disconnect");
              const partnerId = activeCall.partnerId;
              await updateCall(activeCall.callId, {
                status: "ended",
                endedAt: /* @__PURE__ */ new Date(),
                endReason: "disconnected"
              });
              const partnerWs = activeConnections.get(partnerId);
              if (partnerWs && partnerWs.readyState === WebSocket.OPEN) {
                partnerWs.send(JSON.stringify({ type: "call_ended", reason: "partner_disconnected" }));
              }
              activeCalls.delete(sessionId);
              activeCalls.delete(partnerId);
              pendingMatches.delete(sessionId);
              pendingMatches.delete(partnerId);
              await leaveQueue(sessionId);
              await leaveQueue(partnerId);
            }
          } else {
            const pendingMatch = pendingMatches.get(sessionId);
            if (pendingMatch) {
              console.log(`[WS] Session ${sessionId} disconnected with pending match, keeping state for reconnect`);
            } else {
              console.log(`[WS] Session ${sessionId} disconnected while in queue/idle, keeping queue entry for reconnect`);
            }
          }
        }
      }
    });
    ws.on("error", (error) => {
      console.error("[WS] WebSocket error:", error);
    });
  });
  app2.post("/api/sessions", async (req, res) => {
    try {
      const { deviceId } = req.body;
      if (!deviceId) {
        return res.status(400).json({ error: "deviceId is required" });
      }
      const session = await getOrCreateSession(deviceId);
      if (!session.countryCode) {
        try {
          const forwardedFor = req.headers["x-forwarded-for"];
          const clientIp = typeof forwardedFor === "string" ? forwardedFor.split(",")[0].trim() : req.socket.remoteAddress;
          if (clientIp && clientIp !== "127.0.0.1" && clientIp !== "::1") {
            const geoRes = await fetch(`http://ip-api.com/json/${clientIp}?fields=countryCode`);
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              if (geoData.countryCode) {
                const updatedSession = await updateSessionCountry(session.id, geoData.countryCode);
                return res.json(updatedSession || session);
              }
            }
          }
        } catch (geoError) {
          console.error("Error detecting country:", geoError);
        }
      }
      res.json(session);
    } catch (error) {
      console.error("Error creating session:", error);
      res.status(500).json({ error: "Failed to create session" });
    }
  });
  app2.get("/api/sessions/:id", async (req, res) => {
    try {
      const session = await getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error getting session:", error);
      res.status(500).json({ error: "Failed to get session" });
    }
  });
  app2.post("/api/sessions/:id/accept-terms", async (req, res) => {
    try {
      const session = await updateSession(req.params.id, {
        termsAcceptedAt: /* @__PURE__ */ new Date()
      });
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error accepting terms:", error);
      res.status(500).json({ error: "Failed to accept terms" });
    }
  });
  app2.get("/api/time/packages", async (_req, res) => {
    res.json(TIME_PACKAGES);
  });
  app2.post("/api/sessions/:id/referral/redeem", async (req, res) => {
    try {
      const { code } = req.body;
      if (!code || typeof code !== "string") {
        return res.status(400).json({ error: "Referral code is required" });
      }
      const result = await redeemReferralCode(req.params.id, code);
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      const session = await getSession(req.params.id);
      res.json({ message: result.message, session });
    } catch (error) {
      console.error("Error redeeming referral code:", error);
      res.status(500).json({ error: "Failed to redeem referral code" });
    }
  });
  app2.post("/api/sessions/:id/credits/purchase", async (req, res) => {
    try {
      const { packageId } = req.body;
      const pkg = TIME_PACKAGES.find((p) => p.id === packageId);
      if (!pkg) {
        return res.status(400).json({ error: "Invalid package" });
      }
      const result = await purchaseTimePackage(req.params.id, packageId);
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      const session = await getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error purchasing time:", error);
      res.status(500).json({ error: "Failed to purchase credits" });
    }
  });
  app2.post("/api/sessions/:id/credits/shuffle", async (req, res) => {
    try {
      const session = await spendCredits(
        req.params.id,
        COSTS.SHUFFLE_DECK,
        "shuffle",
        "Deck shuffle"
      );
      if (!session) {
        return res.status(400).json({ error: "Insufficient credits or session not found" });
      }
      const updated = await refillDailyMatches(req.params.id);
      res.json(updated);
    } catch (error) {
      console.error("Error shuffling deck:", error);
      res.status(500).json({ error: "Failed to shuffle deck" });
    }
  });
  app2.get("/api/sessions/:id/pending-match", async (req, res) => {
    try {
      const sessionId = req.params.id;
      const pendingMatch = pendingMatches.get(sessionId);
      if (pendingMatch) {
        console.log("[API] Found pending match for session:", sessionId);
        pendingMatches.delete(sessionId);
        return res.json({
          hasMatch: true,
          callId: pendingMatch.callId,
          partnerId: pendingMatch.partnerId,
          duration: pendingMatch.duration
        });
      }
      const activeCall = activeCalls.get(sessionId);
      if (activeCall) {
        console.log("[API] Session already in active call:", sessionId);
        return res.json({
          hasMatch: true,
          callId: activeCall.callId,
          partnerId: activeCall.partnerId,
          duration: Math.floor((activeCall.endTime - Date.now()) / 1e3)
        });
      }
      res.json({ hasMatch: false });
    } catch (error) {
      console.error("Error checking pending match:", error);
      res.status(500).json({ error: "Failed to check pending match" });
    }
  });
  app2.post("/api/sessions/:id/matches/use", async (req, res) => {
    try {
      const session = await useDailyMatch(req.params.id);
      if (!session) {
        return res.status(400).json({ error: "No daily matches left or session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error using daily match:", error);
      res.status(500).json({ error: "Failed to use daily match" });
    }
  });
  app2.post("/api/sessions/:id/matches/refill", async (req, res) => {
    try {
      const result = await refillDailyMatches(req.params.id);
      if (result.error) {
        const status = result.error === "Session not found" ? 404 : 400;
        return res.status(status).json({ error: result.error });
      }
      res.json(result.session);
    } catch (error) {
      console.error("Error refilling matches:", error);
      res.status(500).json({ error: "Failed to refill matches" });
    }
  });
  app2.get("/api/aura/levels", async (_req, res) => {
    res.json(AURA_LEVELS);
  });
  app2.get("/api/karma/levels", async (_req, res) => {
    res.json(AURA_LEVELS);
  });
  app2.get("/api/sessions/:id/aura", async (req, res) => {
    try {
      const session = await getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      const level = [...AURA_LEVELS].reverse().find((l) => session.auraPoints >= l.minAura) || AURA_LEVELS[0];
      const levelIndex = AURA_LEVELS.findIndex((l) => l.name === level.name);
      const nextLevel = AURA_LEVELS[levelIndex + 1];
      res.json({
        auraPoints: session.auraPoints,
        level: level.name,
        levelIndex: levelIndex + 1,
        nextLevel: nextLevel?.name || null,
        pointsToNextLevel: nextLevel ? nextLevel.minAura - session.auraPoints : 0
      });
    } catch (error) {
      console.error("Error getting aura:", error);
      res.status(500).json({ error: "Failed to get aura" });
    }
  });
  app2.get("/api/sessions/:id/karma", async (req, res) => {
    try {
      const session = await getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      const level = [...AURA_LEVELS].reverse().find((l) => session.auraPoints >= l.minAura) || AURA_LEVELS[0];
      const levelIndex = AURA_LEVELS.findIndex((l) => l.name === level.name);
      const nextLevel = AURA_LEVELS[levelIndex + 1];
      res.json({
        auraPoints: session.auraPoints,
        karmaPoints: session.auraPoints,
        // Legacy field
        level: level.name,
        levelIndex: levelIndex + 1,
        nextLevel: nextLevel?.name || null,
        pointsToNextLevel: nextLevel ? nextLevel.minAura - session.auraPoints : 0
      });
    } catch (error) {
      console.error("Error getting aura:", error);
      res.status(500).json({ error: "Failed to get aura" });
    }
  });
  app2.post("/api/sessions/:id/aura/award", async (req, res) => {
    try {
      const { amount, type, callId } = req.body;
      const session = await addAura(req.params.id, amount, type, callId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json({ auraPoints: session.auraPoints });
    } catch (error) {
      console.error("Error awarding aura:", error);
      res.status(500).json({ error: "Failed to award aura" });
    }
  });
  app2.post("/api/sessions/:id/karma/award", async (req, res) => {
    try {
      const { amount, type, callId } = req.body;
      const session = await addAura(req.params.id, amount, type, callId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json({ auraPoints: session.auraPoints, karmaPoints: session.auraPoints });
    } catch (error) {
      console.error("Error awarding aura:", error);
      res.status(500).json({ error: "Failed to award aura" });
    }
  });
  app2.post("/api/sessions/:id/checkin", async (req, res) => {
    try {
      const result = await performDailyCheckIn(
        req.params.id,
        AURA_REWARDS.DAILY_CHECKIN
      );
      if (!result.session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json({
        success: !result.alreadyCheckedIn,
        alreadyCheckedIn: result.alreadyCheckedIn,
        streakIncreased: result.streakIncreased,
        auraAwarded: result.alreadyCheckedIn ? 0 : AURA_REWARDS.DAILY_CHECKIN,
        dailyStreak: result.session.dailyStreak,
        auraPoints: result.session.auraPoints
      });
    } catch (error) {
      console.error("Error performing check-in:", error);
      res.status(500).json({ error: "Failed to check in" });
    }
  });
  app2.post("/api/sessions/:id/first-mission", async (req, res) => {
    try {
      const result = await completeFirstMission(
        req.params.id,
        AURA_REWARDS.FIRST_MISSION
      );
      if (!result.session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json({
        success: result.wasFirstCall,
        wasFirstCall: result.wasFirstCall,
        auraAwarded: result.wasFirstCall ? AURA_REWARDS.FIRST_MISSION : 0,
        auraPoints: result.session.auraPoints
      });
    } catch (error) {
      console.error("Error completing first mission:", error);
      res.status(500).json({ error: "Failed to complete first mission" });
    }
  });
  app2.get("/api/daily-vibe", async (_req, res) => {
    try {
      const now = /* @__PURE__ */ new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 0);
      const diff = now.getTime() - startOfYear.getTime();
      const dayOfYear = Math.floor(diff / (1e3 * 60 * 60 * 24));
      const promptIndex = dayOfYear % DAILY_VIBE_PROMPTS.length;
      res.json({
        prompt: DAILY_VIBE_PROMPTS[promptIndex],
        dayOfYear,
        totalPrompts: DAILY_VIBE_PROMPTS.length
      });
    } catch (error) {
      console.error("Error getting daily vibe:", error);
      res.status(500).json({ error: "Failed to get daily vibe" });
    }
  });
  app2.get("/api/sessions/:id/habit-status", async (req, res) => {
    try {
      const session = await getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      const now = /* @__PURE__ */ new Date();
      const today = now.toDateString();
      const lastCheckIn = session.lastCheckIn ? new Date(session.lastCheckIn) : null;
      const checkedInToday = lastCheckIn ? lastCheckIn.toDateString() === today : false;
      res.json({
        dailyStreak: session.dailyStreak,
        checkedInToday,
        firstCallCompleted: session.firstCallCompleted,
        showFirstMission: !session.firstCallCompleted,
        auraPoints: session.auraPoints
      });
    } catch (error) {
      console.error("Error getting habit status:", error);
      res.status(500).json({ error: "Failed to get habit status" });
    }
  });
  app2.post("/api/sessions/:id/premium/activate", async (req, res) => {
    try {
      const session = await activatePremium(
        req.params.id,
        30,
        // 30 days
        COSTS.PREMIUM_BONUS_MINUTES
      );
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error activating premium:", error);
      res.status(500).json({ error: "Failed to activate premium" });
    }
  });
  app2.get("/api/sessions/:id/premium/status", async (req, res) => {
    try {
      const isPremium = await checkPremiumStatus(req.params.id);
      res.json({ isPremium });
    } catch (error) {
      console.error("Error checking premium:", error);
      res.status(500).json({ error: "Failed to check premium status" });
    }
  });
  app2.post("/api/sessions/:id/preferences/gender", async (req, res) => {
    try {
      const { genderPreference } = req.body;
      const isPremium = await checkPremiumStatus(req.params.id);
      if (!isPremium) {
        return res.status(403).json({ error: "Premium required for gender preference" });
      }
      const session = await updateSession(req.params.id, { genderPreference });
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error updating preference:", error);
      res.status(500).json({ error: "Failed to update preference" });
    }
  });
  app2.get("/api/sessions/:id/calls", async (req, res) => {
    try {
      const calls2 = await getCallHistory(req.params.id);
      res.json(calls2);
    } catch (error) {
      console.error("Error getting call history:", error);
      res.status(500).json({ error: "Failed to get call history" });
    }
  });
  app2.post("/api/reports", async (req, res) => {
    try {
      const { reporterSessionId, reportedSessionId, callId, reasons, otherReason, reason } = req.body;
      await createReport({
        reporterSessionId,
        reportedSessionId,
        callId,
        reasons,
        otherReason,
        reason
        // Legacy field for backwards compatibility
      });
      if (reportedSessionId) {
        await addAura(reportedSessionId, AURA_REWARDS.REPORTED, "reported", callId);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error creating report:", error);
      res.status(500).json({ error: "Failed to create report" });
    }
  });
  app2.use("/uploads", (req, res, next) => {
    const filePath = path.join(uploadsDir, req.path);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: "File not found" });
    }
  });
  app2.post("/api/upload", upload.array("files", 5), (req, res) => {
    try {
      const files = req.files;
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const urls = files.map((file) => `${baseUrl}/uploads/${file.filename}`);
      console.log(`[Upload] ${files.length} file(s) uploaded:`, urls);
      res.json({ urls });
    } catch (error) {
      console.error("Error uploading files:", error);
      res.status(500).json({ error: "Failed to upload files" });
    }
  });
  app2.post("/api/bug-reports", async (req, res) => {
    try {
      const { sessionId, description, deviceInfo, attachments } = req.body;
      if (!description || typeof description !== "string" || description.trim().length === 0) {
        return res.status(400).json({ error: "Description is required" });
      }
      let validatedAttachments = null;
      if (attachments && Array.isArray(attachments)) {
        validatedAttachments = attachments.filter((a) => typeof a === "string");
      }
      await createBugReport({
        sessionId: sessionId || null,
        description: description.trim(),
        deviceInfo: deviceInfo || null,
        attachments: validatedAttachments
      });
      console.log("[Bug Report] New bug report submitted:", description.substring(0, 50) + "...", validatedAttachments?.length ? `with ${validatedAttachments.length} attachments` : "");
      res.json({ success: true });
    } catch (error) {
      console.error("Error creating bug report:", error);
      res.status(500).json({ error: "Failed to submit bug report" });
    }
  });
  app2.get("/api/rankings/countries", async (_req, res) => {
    try {
      const needsRefresh = await shouldRefreshRankings();
      if (needsRefresh) {
        console.log("[Rankings] Refreshing country rankings cache...");
        const rankings2 = await refreshCountryRankings();
        return res.json({
          rankings: rankings2,
          lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
          nextUpdate: new Date(Date.now() + 12 * 60 * 60 * 1e3).toISOString()
        });
      }
      const rankings = await getCountryRankings();
      const lastUpdated = rankings[0]?.lastUpdatedAt || /* @__PURE__ */ new Date();
      res.json({
        rankings,
        lastUpdated: new Date(lastUpdated).toISOString(),
        nextUpdate: new Date(new Date(lastUpdated).getTime() + 12 * 60 * 60 * 1e3).toISOString()
      });
    } catch (error) {
      console.error("Error getting country rankings:", error);
      res.status(500).json({ error: "Failed to get rankings" });
    }
  });
  app2.post("/api/rankings/refresh", async (_req, res) => {
    try {
      console.log("[Rankings] Force refreshing country rankings...");
      const rankings = await refreshCountryRankings();
      res.json({
        rankings,
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
        message: "Rankings refreshed successfully"
      });
    } catch (error) {
      console.error("Error refreshing rankings:", error);
      res.status(500).json({ error: "Failed to refresh rankings" });
    }
  });
  app2.get("/api/sessions/:id/country", async (req, res) => {
    try {
      const session = await getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      if (!session.countryCode) {
        return res.json({ countryCode: null, countryName: null, rank: null });
      }
      const rankings = await getCountryRankings();
      const countryRanking = rankings.find((r) => r.countryCode === session.countryCode);
      res.json({
        countryCode: session.countryCode,
        countryName: getCountryName(session.countryCode),
        rank: countryRanking?.rank || null,
        totalAura: countryRanking?.totalAura || 0,
        userCount: countryRanking?.userCount || 0
      });
    } catch (error) {
      console.error("Error getting session country:", error);
      res.status(500).json({ error: "Failed to get country info" });
    }
  });
  app2.post("/api/calls/:callId/ratings", async (req, res) => {
    try {
      const callId = req.params.callId;
      const { sessionId, voiceQuality, strangerQuality, overallExperience, wouldCallAgain, feedback } = req.body;
      if (!sessionId || !voiceQuality || !strangerQuality || !overallExperience) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      if ([voiceQuality, strangerQuality, overallExperience].some((r) => r < 1 || r > 5)) {
        return res.status(400).json({ error: "Ratings must be between 1 and 5" });
      }
      const alreadyRated = await hasSubmittedRating(sessionId, callId);
      if (alreadyRated) {
        return res.status(400).json({ error: "You have already rated this call" });
      }
      const rating = await createCallRating({
        callId,
        sessionId,
        voiceQuality,
        strangerQuality,
        overallExperience,
        wouldCallAgain,
        feedback,
        auraAwarded: 100
      });
      await addAura(sessionId, 100, "feedback", callId);
      const session = await getSession(sessionId);
      res.json({
        success: true,
        rating,
        auraAwarded: 100,
        newAuraTotal: session?.auraPoints || 0
      });
    } catch (error) {
      console.error("Error creating call rating:", error);
      res.status(500).json({ error: "Failed to submit rating" });
    }
  });
  app2.get("/api/extensions", async (_req, res) => {
    res.json(EXTENSION_OPTIONS);
  });
  app2.get("/api/sessions/:id/timebank", async (req, res) => {
    try {
      const session = await getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json({ timeBankMinutes: session.timeBankMinutes });
    } catch (error) {
      console.error("Error getting time bank:", error);
      res.status(500).json({ error: "Failed to get time bank" });
    }
  });
  app2.post("/api/sessions/:id/generate-backup", async (req, res) => {
    try {
      const { pin } = req.body;
      if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
        return res.status(400).json({ error: "A 6-digit PIN is required" });
      }
      const session = await getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      if (session.transferredAt) {
        return res.status(400).json({ error: "This session has already been transferred to another device" });
      }
      const restoreToken = await generateRestoreToken(req.params.id);
      const backupData = {
        sessionId: req.params.id,
        restoreToken,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        version: 1
      };
      const salt = randomBytes2(16);
      const key = scryptSync(pin, salt, 32);
      const iv = randomBytes2(16);
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      const jsonData = JSON.stringify(backupData);
      let encrypted = cipher.update(jsonData, "utf8", "base64");
      encrypted += cipher.final("base64");
      const authTag = cipher.getAuthTag();
      const encryptedPackage = {
        s: salt.toString("base64"),
        i: iv.toString("base64"),
        t: authTag.toString("base64"),
        d: encrypted,
        v: 1
        // Version for future compatibility
      };
      res.json({
        backupData: Buffer.from(JSON.stringify(encryptedPackage)).toString("base64"),
        fileName: `emocall-backup-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.enc`
      });
    } catch (error) {
      console.error("Error generating backup:", error);
      res.status(500).json({ error: "Failed to generate backup" });
    }
  });
  app2.post("/api/sessions/restore", async (req, res) => {
    try {
      const { backupData, pin, newSessionId } = req.body;
      if (!backupData || !pin || !newSessionId) {
        return res.status(400).json({ error: "Backup data, PIN, and new session ID are required" });
      }
      if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
        return res.status(400).json({ error: "Invalid PIN format" });
      }
      let encryptedPackage;
      try {
        encryptedPackage = JSON.parse(Buffer.from(backupData, "base64").toString("utf8"));
      } catch {
        return res.status(400).json({ error: "Invalid backup file format" });
      }
      const salt = Buffer.from(encryptedPackage.s, "base64");
      const iv = Buffer.from(encryptedPackage.i, "base64");
      const authTag = Buffer.from(encryptedPackage.t, "base64");
      const encrypted = encryptedPackage.d;
      const key = scryptSync(pin, salt, 32);
      const decipher = createDecipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
      decipher.setAuthTag(authTag);
      let decrypted;
      try {
        decrypted = decipher.update(encrypted, "base64", "utf8");
        decrypted += decipher.final("utf8");
      } catch {
        return res.status(400).json({ error: "Incorrect PIN or corrupted backup file" });
      }
      let backupPayload;
      try {
        backupPayload = JSON.parse(decrypted);
      } catch {
        return res.status(400).json({ error: "Corrupted backup data" });
      }
      const { sessionId: oldSessionId, restoreToken } = backupPayload;
      const result = await validateAndRestoreSession(oldSessionId, restoreToken, newSessionId);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.json({
        success: true,
        message: "Session restored successfully",
        session: result.session
      });
    } catch (error) {
      console.error("Error restoring session:", error);
      res.status(500).json({ error: "Failed to restore session" });
    }
  });
  app2.post("/api/agora/token", async (req, res) => {
    try {
      const { channelName, uid, role } = req.body;
      if (!channelName) {
        return res.status(400).json({ error: "Channel name is required" });
      }
      const appId = process.env.AGORA_APP_ID?.trim();
      const appCertificate = process.env.AGORA_APP_CERTIFICATE?.trim();
      if (!appId || !appCertificate) {
        console.error("[Agora] Credentials missing or empty");
        return res.status(500).json({ error: "Voice calling not configured" });
      }
      let userUid = 0;
      if (uid) {
        const parsed = parseInt(uid);
        if (!isNaN(parsed)) {
          userUid = parsed;
        }
      }
      const userRole = role === "publisher" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
      const expirationTimeInSeconds = 3600;
      const currentTimestamp = Math.floor(Date.now() / 1e3);
      const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
      console.log(`[Agora] Generating token. Channel: ${channelName}, UID: ${userUid}, expires at: ${privilegeExpiredTs}`);
      const token = RtcTokenBuilder.buildTokenWithUid(
        appId,
        appCertificate,
        channelName,
        userUid,
        userRole,
        privilegeExpiredTs,
        privilegeExpiredTs
      );
      res.json({
        token,
        appId,
        channelName,
        uid: userUid
      });
    } catch (error) {
      console.error("[Agora] Critical Token Generation Error:", error);
      res.status(500).json({ error: "Failed to generate voice token" });
    }
  });
  return httpServer;
}

// server/index.ts
import * as fs2 from "fs";
import * as path2 from "path";
var app = express();
var log = console.log;
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origins = /* @__PURE__ */ new Set();
    if (process.env.ALLOWED_ORIGINS) {
      process.env.ALLOWED_ORIGINS.split(",").forEach((d) => {
        origins.add(d.trim());
      });
    }
    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }
    const origin = req.header("origin");
    const isLocalhost = origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:");
    const isExpoGo = !origin || origin?.startsWith("exp://") || origin?.startsWith("exps://");
    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header("Access-Control-Allow-Headers", "Content-Type");
      res.header("Access-Control-Allow-Credentials", "true");
    } else if (isExpoGo) {
      res.header("Access-Control-Allow-Origin", "*");
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header("Access-Control-Allow-Headers", "Content-Type");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express.urlencoded({ extended: false }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path3 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path3.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    });
    next();
  });
}
function getAppName() {
  try {
    const appJsonPath = path2.resolve(process.cwd(), "app.json");
    const appJsonContent = fs2.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}
function serveExpoManifest(platform, res) {
  const manifestPath = path2.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs2.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifest = fs2.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}
function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;
  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);
  const html = landingPageTemplate.replace(/BASE_URL_PLACEHOLDER/g, baseUrl).replace(/EXPS_URL_PLACEHOLDER/g, expsUrl).replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
function configureExpoAndLanding(app2) {
  const templatePath = path2.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const landingPageTemplate = fs2.readFileSync(templatePath, "utf-8");
  const appName = getAppName();
  const privacyPolicyPath = path2.resolve(
    process.cwd(),
    "server",
    "templates",
    "privacy-policy.html"
  );
  const privacyPolicyTemplate = fs2.readFileSync(privacyPolicyPath, "utf-8");
  const termsOfServicePath = path2.resolve(
    process.cwd(),
    "server",
    "templates",
    "terms-of-service.html"
  );
  const termsOfServiceTemplate = fs2.readFileSync(termsOfServicePath, "utf-8");
  log("Serving static Expo files with dynamic manifest routing");
  app2.get("/privacy", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(privacyPolicyTemplate);
  });
  app2.get("/terms", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(termsOfServiceTemplate);
  });
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }
    if (req.path === "/") {
      const webIndexPath = path2.resolve(process.cwd(), "static-build", "web", "index.html");
      if (fs2.existsSync(webIndexPath)) {
        return res.redirect("/app");
      }
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName
      });
    }
    next();
  });
  const webDir = path2.resolve(process.cwd(), "static-build", "web");
  app2.use("/app", express.static(webDir));
  app2.use("/_expo", express.static(path2.resolve(webDir, "_expo")));
  app2.get("/favicon.ico", (_req, res) => {
    const faviconPath = path2.resolve(webDir, "favicon.ico");
    if (fs2.existsSync(faviconPath)) {
      return res.sendFile(faviconPath);
    }
    return res.status(404).send("Not found");
  });
  app2.use("/assets", express.static(path2.resolve(webDir, "assets")));
  app2.use("/app/assets", express.static(path2.resolve(webDir, "assets")));
  app2.use("/app", (req, res, next) => {
    const webIndexPath = path2.resolve(webDir, "index.html");
    if (fs2.existsSync(webIndexPath)) {
      return res.sendFile(webIndexPath);
    }
    return next();
  });
  app2.use(express.static(path2.resolve(process.cwd(), "static-build")));
  log("Expo routing: Checking expo-platform header on / and /manifest");
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status).json({ message });
  });
}
(async () => {
  log("=== Environment Check ===");
  log(`NODE_ENV: ${process.env.NODE_ENV}`);
  log(`DATABASE_URL exists: ${!!process.env.DATABASE_URL}`);
  log(`DATABASE_URL length: ${process.env.DATABASE_URL?.length || 0}`);
  log(`AGORA_APP_ID exists: ${!!process.env.AGORA_APP_ID}`);
  log(`AGORA_APP_CERTIFICATE exists: ${!!process.env.AGORA_APP_CERTIFICATE}`);
  log("========================");
  if (process.env.NODE_ENV === "production") {
    try {
      log("Running database migrations...");
      const { execSync } = await import("child_process");
      execSync("npx drizzle-kit push", { stdio: "inherit" });
      log("Database migrations completed successfully");
    } catch (error) {
      log("Warning: Database migration failed:", error);
      log("Continuing with server startup...");
    }
  }
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  configureExpoAndLanding(app);
  const server = await registerRoutes(app);
  setupErrorHandler(app);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true
    },
    () => {
      log(`express server serving on port ${port}`);
    }
  );
})();
