import { eq, and, desc } from "drizzle-orm";
import { db } from "./db";
import {
  sessions,
  calls,
  creditTransactions,
  karmaTransactions,
  reports,
  matchmakingQueue,
  type Session,
  type InsertSession,
  type Call,
  type InsertCall,
  type InsertCreditTransaction,
  type InsertKarmaTransaction,
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

// Karma Management
export async function addKarma(
  sessionId: string,
  amount: number,
  type: string,
  callId?: string
): Promise<Session | undefined> {
  const session = await getSession(sessionId);
  if (!session) return undefined;

  // Record transaction
  await db.insert(karmaTransactions).values({
    sessionId,
    amount,
    type,
    callId,
  });

  // Update karma (don't go below 0)
  const newKarma = Math.max(0, session.karmaPoints + amount);
  const [updated] = await db
    .update(sessions)
    .set({
      karmaPoints: newKarma,
      updatedAt: new Date(),
    })
    .where(eq(sessions.id, sessionId))
    .returning();

  return updated;
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

// Find any waiting Venter who has an active WebSocket connection
export async function findWaitingVenter(
  activeConnections: Map<string, { readyState: number }>
): Promise<{ sessionId: string; cardId: string | null } | null> {
  // Get all venters waiting in queue, prioritized by priority then join time
  const venters = await db.query.matchmakingQueue.findMany({
    where: eq(matchmakingQueue.mood, "vent"),
    orderBy: [desc(matchmakingQueue.isPriority), matchmakingQueue.joinedAt],
  });

  // Find first venter with active WebSocket connection
  for (const venter of venters) {
    const ws = activeConnections.get(venter.sessionId);
    // WebSocket.OPEN = 1
    if (ws && ws.readyState === 1) {
      // Remove from queue
      await leaveQueue(venter.sessionId);
      return { sessionId: venter.sessionId, cardId: venter.cardId };
    } else {
      // Remove stale entry
      console.log("[Storage] Removing stale venter from queue:", venter.sessionId);
      await leaveQueue(venter.sessionId);
    }
  }

  return null;
}

// Find any waiting Listener who has an active WebSocket connection
export async function findWaitingListener(
  activeConnections: Map<string, { readyState: number }>
): Promise<{ sessionId: string; cardId: string | null } | null> {
  // Get all listeners waiting in queue, prioritized by priority then join time
  const listeners = await db.query.matchmakingQueue.findMany({
    where: eq(matchmakingQueue.mood, "listen"),
    orderBy: [desc(matchmakingQueue.isPriority), matchmakingQueue.joinedAt],
  });

  // Find first listener with active WebSocket connection
  for (const listener of listeners) {
    const ws = activeConnections.get(listener.sessionId);
    // WebSocket.OPEN = 1
    if (ws && ws.readyState === 1) {
      // Remove from queue
      await leaveQueue(listener.sessionId);
      return { sessionId: listener.sessionId, cardId: listener.cardId };
    } else {
      // Remove stale entry
      console.log("[Storage] Removing stale listener from queue:", listener.sessionId);
      await leaveQueue(listener.sessionId);
    }
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
