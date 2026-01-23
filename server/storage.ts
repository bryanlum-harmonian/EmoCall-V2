import { eq, and, desc } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db } from "./db";
import {
  sessions,
  calls,
  creditTransactions,
  auraTransactions,
  reports,
  matchmakingQueue,
  type Session,
  type InsertSession,
  type Call,
  type InsertCall,
  type InsertCreditTransaction,
  type InsertAuraTransaction,
  type InsertReport,
  type InsertMatchmakingQueue,
  MAX_DAILY_MATCHES,
} from "@shared/schema";

// Session Management
export async function getOrCreateSession(deviceId: string): Promise<Session> {
  const existing = await db.query.sessions.findFirst({
    where: eq(sessions.deviceId, deviceId),
  });

  if (existing) {
    // Check if daily matches need reset (new day)
    const now = new Date();
    const resetAt = new Date(existing.dailyMatchesResetAt);
    const isNewDay = now.toDateString() !== resetAt.toDateString();
    
    if (isNewDay) {
      const [updated] = await db
        .update(sessions)
        .set({
          dailyMatchesLeft: MAX_DAILY_MATCHES,
          dailyMatchesResetAt: now,
          updatedAt: now,
        })
        .where(eq(sessions.id, existing.id))
        .returning();
      return updated;
    }
    return existing;
  }

  const [newSession] = await db
    .insert(sessions)
    .values({ deviceId })
    .returning();
  return newSession;
}

export async function getSession(sessionId: string): Promise<Session | undefined> {
  return db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
  });
}

export async function updateSession(
  sessionId: string,
  updates: Partial<InsertSession>
): Promise<Session | undefined> {
  const [updated] = await db
    .update(sessions)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(sessions.id, sessionId))
    .returning();
  return updated;
}

// Credits Management
export async function addCredits(
  sessionId: string,
  amount: number,
  type: string,
  description?: string,
  stripePaymentId?: string
): Promise<Session | undefined> {
  const session = await getSession(sessionId);
  if (!session) return undefined;

  // Record transaction
  await db.insert(creditTransactions).values({
    sessionId,
    amount,
    type,
    description,
    stripePaymentId,
  });

  // Update balance
  const [updated] = await db
    .update(sessions)
    .set({
      credits: session.credits + amount,
      updatedAt: new Date(),
    })
    .where(eq(sessions.id, sessionId))
    .returning();

  return updated;
}

export async function spendCredits(
  sessionId: string,
  amount: number,
  type: string,
  description?: string,
  callId?: string
): Promise<Session | undefined> {
  const session = await getSession(sessionId);
  if (!session || session.credits < amount) return undefined;

  // Record transaction (negative amount)
  await db.insert(creditTransactions).values({
    sessionId,
    amount: -amount,
    type,
    description,
    callId,
  });

  // Update balance
  const [updated] = await db
    .update(sessions)
    .set({
      credits: session.credits - amount,
      updatedAt: new Date(),
    })
    .where(eq(sessions.id, sessionId))
    .returning();

  return updated;
}

// Time Bank Management
export async function addToTimeBank(
  sessionId: string,
  minutes: number
): Promise<Session | undefined> {
  const session = await getSession(sessionId);
  if (!session) return undefined;

  const [updated] = await db
    .update(sessions)
    .set({
      timeBankMinutes: session.timeBankMinutes + minutes,
      updatedAt: new Date(),
    })
    .where(eq(sessions.id, sessionId))
    .returning();

  return updated;
}

// Aura Management (renamed from Karma for 2026 Gen Z appeal)
export async function addAura(
  sessionId: string,
  amount: number,
  type: string,
  callId?: string
): Promise<Session | undefined> {
  const session = await getSession(sessionId);
  if (!session) return undefined;

  // Record transaction
  await db.insert(auraTransactions).values({
    sessionId,
    amount,
    type,
    callId,
  });

  // Update aura (don't go below 0)
  const newAura = Math.max(0, session.auraPoints + amount);
  const [updated] = await db
    .update(sessions)
    .set({
      auraPoints: newAura,
      updatedAt: new Date(),
    })
    .where(eq(sessions.id, sessionId))
    .returning();

  return updated;
}

// Daily Check-In for Habit Loop
export async function performDailyCheckIn(
  sessionId: string,
  auraReward: number
): Promise<{ session?: Session; alreadyCheckedIn: boolean; streakIncreased: boolean }> {
  const session = await getSession(sessionId);
  if (!session) return { alreadyCheckedIn: false, streakIncreased: false };

  const now = new Date();
  const today = now.toDateString();
  const lastCheckIn = session.lastCheckIn ? new Date(session.lastCheckIn) : null;
  const lastCheckInDay = lastCheckIn ? lastCheckIn.toDateString() : null;

  // Already checked in today
  if (lastCheckInDay === today) {
    return { session, alreadyCheckedIn: true, streakIncreased: false };
  }

  // Calculate new streak
  let newStreak = 1;
  let streakIncreased = true;
  
  if (lastCheckIn) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    
    if (lastCheckInDay === yesterdayStr) {
      // Consecutive day - increment streak
      newStreak = session.dailyStreak + 1;
    } else {
      // Streak broken - reset to 1
      newStreak = 1;
      streakIncreased = false;
    }
  }

  // Record aura transaction for check-in
  await db.insert(auraTransactions).values({
    sessionId,
    amount: auraReward,
    type: "daily_checkin",
  });

  // Update session
  const [updated] = await db
    .update(sessions)
    .set({
      dailyStreak: newStreak,
      lastCheckIn: now,
      auraPoints: session.auraPoints + auraReward,
      updatedAt: now,
    })
    .where(eq(sessions.id, sessionId))
    .returning();

  return { session: updated, alreadyCheckedIn: false, streakIncreased };
}

// First Mission completion (+50 Aura for first call ever)
export async function completeFirstMission(
  sessionId: string,
  auraReward: number
): Promise<{ session?: Session; wasFirstCall: boolean }> {
  const session = await getSession(sessionId);
  if (!session) return { wasFirstCall: false };

  // Already completed first mission
  if (session.firstCallCompleted) {
    return { session, wasFirstCall: false };
  }

  // Record aura transaction
  await db.insert(auraTransactions).values({
    sessionId,
    amount: auraReward,
    type: "first_mission",
  });

  // Mark first call completed and add aura
  const [updated] = await db
    .update(sessions)
    .set({
      firstCallCompleted: true,
      auraPoints: session.auraPoints + auraReward,
      updatedAt: new Date(),
    })
    .where(eq(sessions.id, sessionId))
    .returning();

  return { session: updated, wasFirstCall: true };
}

// Daily Matches Management
export async function useDailyMatch(sessionId: string): Promise<Session | undefined> {
  const session = await getSession(sessionId);
  if (!session || session.dailyMatchesLeft <= 0) return undefined;

  const [updated] = await db
    .update(sessions)
    .set({
      dailyMatchesLeft: session.dailyMatchesLeft - 1,
      updatedAt: new Date(),
    })
    .where(eq(sessions.id, sessionId))
    .returning();

  return updated;
}

const REFILL_MATCHES_COST = 100;

export async function refillDailyMatches(sessionId: string): Promise<{ session?: Session; error?: string }> {
  const session = await getSession(sessionId);
  if (!session) {
    return { error: "Session not found" };
  }
  
  if (session.credits < REFILL_MATCHES_COST) {
    return { error: "Not enough credits" };
  }
  
  const [updated] = await db
    .update(sessions)
    .set({
      dailyMatchesLeft: MAX_DAILY_MATCHES,
      credits: session.credits - REFILL_MATCHES_COST,
      updatedAt: new Date(),
    })
    .where(eq(sessions.id, sessionId))
    .returning();

  return { session: updated };
}

// Call Management
export async function createCall(data: InsertCall): Promise<Call> {
  const [call] = await db.insert(calls).values(data).returning();
  return call;
}

export async function getCall(callId: string): Promise<Call | undefined> {
  return db.query.calls.findFirst({
    where: eq(calls.id, callId),
  });
}

export async function updateCall(
  callId: string,
  updates: Partial<InsertCall>
): Promise<Call | undefined> {
  const [updated] = await db
    .update(calls)
    .set(updates)
    .where(eq(calls.id, callId))
    .returning();
  return updated;
}

export async function getCallHistory(sessionId: string, limit = 20): Promise<Call[]> {
  return db.query.calls.findMany({
    where: eq(calls.callerSessionId, sessionId),
    orderBy: [desc(calls.createdAt)],
    limit,
  });
}

// Matchmaking Queue
export async function joinQueue(data: InsertMatchmakingQueue): Promise<void> {
  // Remove any existing entry for this session
  await db.delete(matchmakingQueue).where(eq(matchmakingQueue.sessionId, data.sessionId));
  // Add to queue
  await db.insert(matchmakingQueue).values(data);
}

export async function leaveQueue(sessionId: string): Promise<void> {
  await db.delete(matchmakingQueue).where(eq(matchmakingQueue.sessionId, sessionId));
}

export async function findMatch(
  mood: string,
  sessionId: string
): Promise<{ sessionId: string; cardId: string | null } | null> {
  // Find someone with opposite mood
  const oppositeMood = mood === "vent" ? "listen" : "vent";
  
  // Priority users first, then by join time
  const allMatches = await db.query.matchmakingQueue.findMany({
    where: eq(matchmakingQueue.mood, oppositeMood),
    orderBy: [desc(matchmakingQueue.isPriority), matchmakingQueue.joinedAt],
  });

  const match = allMatches.find(m => m.sessionId !== sessionId);

  if (match) {
    // Remove matched user from queue
    await leaveQueue(match.sessionId);
    return { sessionId: match.sessionId, cardId: match.cardId };
  }

  return null;
}

// Find any waiting Venter in the queue
// Note: We no longer require active WebSocket - match will be delivered via HTTP polling
export async function findWaitingVenter(
  activeConnections: Map<string, { readyState: number }>
): Promise<{ sessionId: string; cardId: string | null } | null> {
  // Get the first venter waiting in queue, prioritized by priority then join time
  const venter = await db.query.matchmakingQueue.findFirst({
    where: eq(matchmakingQueue.mood, "vent"),
    orderBy: [desc(matchmakingQueue.isPriority), matchmakingQueue.joinedAt],
  });

  if (venter) {
    // Remove from queue
    await leaveQueue(venter.sessionId);
    return { sessionId: venter.sessionId, cardId: venter.cardId };
  }

  return null;
}

// Find any waiting Listener in the queue
// Note: We no longer require active WebSocket - match will be delivered via HTTP polling
export async function findWaitingListener(
  activeConnections: Map<string, { readyState: number }>
): Promise<{ sessionId: string; cardId: string | null } | null> {
  // Get the first listener waiting in queue, prioritized by priority then join time
  const listener = await db.query.matchmakingQueue.findFirst({
    where: eq(matchmakingQueue.mood, "listen"),
    orderBy: [desc(matchmakingQueue.isPriority), matchmakingQueue.joinedAt],
  });

  if (listener) {
    // Remove from queue
    await leaveQueue(listener.sessionId);
    return { sessionId: listener.sessionId, cardId: listener.cardId };
  }

  return null;
}

export async function getQueuePosition(sessionId: string): Promise<number> {
  const entry = await db.query.matchmakingQueue.findFirst({
    where: eq(matchmakingQueue.sessionId, sessionId),
  });
  
  if (!entry) return -1;

  const allEntries = await db.query.matchmakingQueue.findMany({
    where: eq(matchmakingQueue.mood, entry.mood),
    orderBy: [desc(matchmakingQueue.isPriority), matchmakingQueue.joinedAt],
  });

  return allEntries.findIndex(e => e.sessionId === sessionId) + 1;
}

// Reports
export async function createReport(data: InsertReport): Promise<void> {
  await db.insert(reports).values(data);
}

// Premium Management
export async function activatePremium(
  sessionId: string,
  durationDays: number,
  bonusCredits: number
): Promise<Session | undefined> {
  const session = await getSession(sessionId);
  if (!session) return undefined;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + durationDays);

  // Add bonus credits
  await addCredits(sessionId, bonusCredits, "premium_bonus", "Premium subscription bonus");

  const [updated] = await db
    .update(sessions)
    .set({
      isPremium: true,
      premiumExpiresAt: expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(sessions.id, sessionId))
    .returning();

  return updated;
}

export async function checkPremiumStatus(sessionId: string): Promise<boolean> {
  const session = await getSession(sessionId);
  if (!session) return false;

  if (!session.isPremium) return false;

  if (session.premiumExpiresAt && new Date(session.premiumExpiresAt) < new Date()) {
    // Premium expired, deactivate
    await db
      .update(sessions)
      .set({ isPremium: false, updatedAt: new Date() })
      .where(eq(sessions.id, sessionId));
    return false;
  }

  return true;
}

// Backup & Restore Functions
export async function generateRestoreToken(sessionId: string): Promise<string> {
  const restoreToken = randomBytes(32).toString("hex");
  
  await db
    .update(sessions)
    .set({
      restoreToken,
      updatedAt: new Date(),
    })
    .where(eq(sessions.id, sessionId));
  
  return restoreToken;
}

export async function validateAndRestoreSession(
  oldSessionId: string,
  restoreToken: string,
  newSessionId: string
): Promise<{ success: boolean; error?: string; session?: Session }> {
  // Get the old session
  const oldSession = await getSession(oldSessionId);
  if (!oldSession) {
    return { success: false, error: "Original session not found" };
  }
  
  // Check if already transferred
  if (oldSession.transferredAt) {
    return { success: false, error: "This session has already been transferred to another device" };
  }
  
  // Validate the restore token
  if (!oldSession.restoreToken || oldSession.restoreToken !== restoreToken) {
    return { success: false, error: "Invalid restore token" };
  }
  
  // Get the new session (must exist - created when user opened the app)
  const newSession = await getSession(newSessionId);
  if (!newSession) {
    return { success: false, error: "New session not found" };
  }
  
  // Copy all data from old session to new session
  const now = new Date();
  const [updatedNewSession] = await db
    .update(sessions)
    .set({
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
      updatedAt: now,
    })
    .where(eq(sessions.id, newSessionId))
    .returning();
  
  // Mark old session as transferred
  await db
    .update(sessions)
    .set({
      transferredAt: now,
      transferredToSessionId: newSessionId,
      restoreToken: null, // Invalidate the token
      updatedAt: now,
    })
    .where(eq(sessions.id, oldSessionId));
  
  return { success: true, session: updatedNewSession };
}
