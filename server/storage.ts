import { eq, and, desc, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db } from "./db";
import {
  sessions,
  calls,
  creditTransactions,
  auraTransactions,
  reports,
  bugReports,
  matchmakingQueue,
  callRatings,
  countryRankings,
  type Session,
  type InsertSession,
  type Call,
  type InsertCall,
  type InsertCreditTransaction,
  type InsertAuraTransaction,
  type InsertReport,
  type InsertBugReport,
  type InsertMatchmakingQueue,
  type InsertCallRating,
  type CallRating,
  type CountryRanking,
  MAX_DAILY_MATCHES,
  REFERRAL_REWARD_MINUTES,
  TIME_PACKAGES,
} from "@shared/schema";

// Generate a unique 6-character referral code
function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excludes confusing chars like 0, O, 1, I
  let code = '';
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

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

  // Generate unique referral code, retry if collision
  let referralCode = generateReferralCode();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await db.query.sessions.findFirst({
      where: eq(sessions.referralCode, referralCode),
    });
    if (!existing) break;
    referralCode = generateReferralCode();
    attempts++;
  }

  const [newSession] = await db
    .insert(sessions)
    .values({ 
      deviceId,
      referralCode,
      timeBankMinutes: 5, // Default 5 minutes for new users
    })
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

// Heartbeat timeout - users without heartbeat for this long are considered stale
const HEARTBEAT_TIMEOUT_MS = 15000; // 15 seconds

// Clean up stale queue entries (no heartbeat for 15+ seconds)
export async function cleanupStaleQueueEntries(): Promise<number> {
  const staleThreshold = new Date(Date.now() - HEARTBEAT_TIMEOUT_MS);
  const result = await db.delete(matchmakingQueue)
    .where(sql`${matchmakingQueue.lastHeartbeat} < ${staleThreshold}`)
    .returning();
  
  if (result.length > 0) {
    console.log("[Storage] Cleaned up", result.length, "stale queue entries");
  }
  return result.length;
}

// Update heartbeat for a session in the queue
export async function updateQueueHeartbeat(sessionId: string): Promise<boolean> {
  const result = await db.update(matchmakingQueue)
    .set({ lastHeartbeat: new Date() })
    .where(eq(matchmakingQueue.sessionId, sessionId))
    .returning();
  return result.length > 0;
}

// Mark a queue entry as matched (prevents double-booking)
export async function markQueueEntryMatched(sessionId: string): Promise<boolean> {
  const result = await db.update(matchmakingQueue)
    .set({ status: "matched" })
    .where(and(
      eq(matchmakingQueue.sessionId, sessionId),
      eq(matchmakingQueue.status, "waiting")
    ))
    .returning();
  return result.length > 0;
}

export async function joinQueue(data: InsertMatchmakingQueue): Promise<void> {
  // Clean up stale entries first (garbage collection)
  await cleanupStaleQueueEntries();
  
  // Remove any existing entry for this session
  await db.delete(matchmakingQueue).where(eq(matchmakingQueue.sessionId, data.sessionId));
  // Add to queue with default status='waiting' and current lastHeartbeat
  await db.insert(matchmakingQueue).values({
    ...data,
    status: "waiting",
    lastHeartbeat: new Date(),
  });
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

// ATOMIC MATCH FINDING
// This uses a proper transaction pattern to prevent race conditions:
// 1. Clean up stale entries first (garbage collection)
// 2. Find waiting user with status='waiting' AND active heartbeat
// 3. Atomically mark as 'matched' to prevent double-booking
// 4. Only return if atomic update succeeded

async function findAndLockWaitingUser(
  mood: "vent" | "listen",
  activeConnections: Map<string, { readyState: number }>,
  excludeSessionId?: string
): Promise<{ sessionId: string; cardId: string | null } | null> {
  // Skip aggressive cleanup - it causes race conditions with just-joined users
  // Cleanup now only happens on queue join to remove old entries

  // Get all users of this mood with status='waiting'
  const users = await db.query.matchmakingQueue.findMany({
    where: and(
      eq(matchmakingQueue.mood, mood),
      eq(matchmakingQueue.status, "waiting")
    ),
    orderBy: [desc(matchmakingQueue.isPriority), matchmakingQueue.joinedAt],
  });

  console.log(`[Storage] Looking for ${mood}er, found`, users.length, "waiting in queue");
  console.log(`[Storage] activeConnections size:`, activeConnections.size);
  console.log(`[Storage] activeConnections keys:`, Array.from(activeConnections.keys()).join(", "));
  if (users.length > 0) {
    console.log(`[Storage] Queue users:`, users.map(u => u.sessionId).join(", "));
  }

  // Step 3: Try to atomically claim each candidate
  for (const user of users) {
    // Skip self
    if (excludeSessionId && user.sessionId === excludeSessionId) {
      console.log(`[Storage] Skipping self:`, user.sessionId);
      continue;
    }
    
    // Check for active WebSocket connection
    const connection = activeConnections.get(user.sessionId);
    console.log(`[Storage] Checking connection for ${user.sessionId}:`, connection ? `readyState=${connection.readyState}` : "NOT FOUND in activeConnections");
    if (!connection || connection.readyState !== 1) {
      // User doesn't have active connection - they may be reconnecting
      // Don't delete their queue entry (heartbeat timeout handles cleanup)
      // Just skip them for now and try the next candidate
      console.log(`[Storage] Skipping ${mood}er without active connection:`, user.sessionId, "- connection:", connection ? "exists but wrong state" : "missing (may be reconnecting)");
      continue;
    }
    
    // Step 4: ATOMIC UPDATE - Try to claim this user
    // This will only succeed if status is still 'waiting' (prevents double-booking)
    const claimed = await markQueueEntryMatched(user.sessionId);
    
    if (claimed) {
      console.log(`[Storage] Atomically claimed ${mood}er:`, user.sessionId);
      return { sessionId: user.sessionId, cardId: user.cardId };
    } else {
      // Someone else claimed this user first - try next candidate
      console.log(`[Storage] Race condition: ${mood}er already claimed:`, user.sessionId);
      continue;
    }
  }

  return null;
}

// Find any waiting Venter in the queue
// Uses atomic locking to prevent double-booking in concurrent scenarios
export async function findWaitingVenter(
  activeConnections: Map<string, { readyState: number }>,
  excludeSessionId?: string
): Promise<{ sessionId: string; cardId: string | null } | null> {
  return findAndLockWaitingUser("vent", activeConnections, excludeSessionId);
}

// Find any waiting Listener in the queue  
// Uses atomic locking to prevent double-booking in concurrent scenarios
export async function findWaitingListener(
  activeConnections: Map<string, { readyState: number }>,
  excludeSessionId?: string
): Promise<{ sessionId: string; cardId: string | null } | null> {
  return findAndLockWaitingUser("listen", activeConnections, excludeSessionId);
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

// Bug Reports
export async function createBugReport(data: InsertBugReport): Promise<void> {
  await db.insert(bugReports).values(data);
}

// Call Ratings
export async function createCallRating(data: InsertCallRating): Promise<CallRating> {
  const [rating] = await db.insert(callRatings).values(data).returning();
  return rating;
}

export async function getCallRatingBySessionAndCall(
  sessionId: string,
  callId: string
): Promise<CallRating | undefined> {
  return await db.query.callRatings.findFirst({
    where: and(
      eq(callRatings.sessionId, sessionId),
      eq(callRatings.callId, callId)
    ),
  });
}

export async function hasSubmittedRating(
  sessionId: string,
  callId: string
): Promise<boolean> {
  const existing = await getCallRatingBySessionAndCall(sessionId, callId);
  return !!existing;
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

// Country code to name mapping
const COUNTRY_NAMES: Record<string, string> = {
  AF: "Afghanistan", AL: "Albania", DZ: "Algeria", AD: "Andorra", AO: "Angola",
  AR: "Argentina", AM: "Armenia", AU: "Australia", AT: "Austria", AZ: "Azerbaijan",
  BS: "Bahamas", BH: "Bahrain", BD: "Bangladesh", BB: "Barbados", BY: "Belarus",
  BE: "Belgium", BZ: "Belize", BJ: "Benin", BT: "Bhutan", BO: "Bolivia",
  BA: "Bosnia", BW: "Botswana", BR: "Brazil", BN: "Brunei", BG: "Bulgaria",
  KH: "Cambodia", CM: "Cameroon", CA: "Canada", CL: "Chile", CN: "China",
  CO: "Colombia", CR: "Costa Rica", HR: "Croatia", CU: "Cuba", CY: "Cyprus",
  CZ: "Czechia", DK: "Denmark", DO: "Dominican Republic", EC: "Ecuador", EG: "Egypt",
  SV: "El Salvador", EE: "Estonia", ET: "Ethiopia", FI: "Finland", FR: "France",
  GE: "Georgia", DE: "Germany", GH: "Ghana", GR: "Greece", GT: "Guatemala",
  HK: "Hong Kong", HU: "Hungary", IS: "Iceland", IN: "India", ID: "Indonesia",
  IR: "Iran", IQ: "Iraq", IE: "Ireland", IL: "Israel", IT: "Italy",
  JM: "Jamaica", JP: "Japan", JO: "Jordan", KZ: "Kazakhstan", KE: "Kenya",
  KR: "South Korea", KW: "Kuwait", LV: "Latvia", LB: "Lebanon", LT: "Lithuania",
  LU: "Luxembourg", MY: "Malaysia", MV: "Maldives", MX: "Mexico", MA: "Morocco",
  MM: "Myanmar", NP: "Nepal", NL: "Netherlands", NZ: "New Zealand", NG: "Nigeria",
  NO: "Norway", OM: "Oman", PK: "Pakistan", PA: "Panama", PY: "Paraguay",
  PE: "Peru", PH: "Philippines", PL: "Poland", PT: "Portugal", QA: "Qatar",
  RO: "Romania", RU: "Russia", SA: "Saudi Arabia", RS: "Serbia", SG: "Singapore",
  SK: "Slovakia", SI: "Slovenia", ZA: "South Africa", ES: "Spain", LK: "Sri Lanka",
  SE: "Sweden", CH: "Switzerland", TW: "Taiwan", TH: "Thailand", TR: "Turkey",
  UA: "Ukraine", AE: "UAE", GB: "United Kingdom", US: "United States", UY: "Uruguay",
  UZ: "Uzbekistan", VE: "Venezuela", VN: "Vietnam", ZW: "Zimbabwe",
};

export function getCountryName(code: string): string {
  return COUNTRY_NAMES[code.toUpperCase()] || code;
}

// Update session with country code
export async function updateSessionCountry(
  sessionId: string,
  countryCode: string
): Promise<Session | undefined> {
  const [updated] = await db
    .update(sessions)
    .set({ countryCode: countryCode.toUpperCase(), updatedAt: new Date() })
    .where(eq(sessions.id, sessionId))
    .returning();
  return updated;
}

// Get cached country rankings
export async function getCountryRankings(): Promise<CountryRanking[]> {
  return db.query.countryRankings.findMany({
    orderBy: [desc(countryRankings.totalAura)],
  });
}

// Check if rankings need refresh (older than 12 hours)
export async function shouldRefreshRankings(): Promise<boolean> {
  const result = await db.query.countryRankings.findFirst();
  if (!result) return true;
  
  const now = new Date();
  const lastUpdate = new Date(result.lastUpdatedAt);
  const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
  
  return hoursSinceUpdate >= 12;
}

// Refresh country rankings from session data
export async function refreshCountryRankings(): Promise<CountryRanking[]> {
  const now = new Date();
  
  // Aggregate aura points by country
  const aggregation = await db.execute(sql`
    SELECT 
      country_code,
      SUM(aura_points) as total_aura,
      COUNT(*) as user_count
    FROM sessions
    WHERE country_code IS NOT NULL AND country_code != ''
    GROUP BY country_code
    ORDER BY total_aura DESC
  `);
  
  // Clear existing rankings
  await db.delete(countryRankings);
  
  // Insert new rankings with rank positions
  const rankings: CountryRanking[] = [];
  let rank = 1;
  
  for (const row of aggregation.rows as any[]) {
    const countryCode = row.country_code as string;
    const totalAura = parseInt(row.total_aura as string) || 0;
    const userCount = parseInt(row.user_count as string) || 0;
    
    const [inserted] = await db
      .insert(countryRankings)
      .values({
        countryCode,
        countryName: getCountryName(countryCode),
        totalAura,
        userCount,
        rank,
        lastUpdatedAt: now,
      })
      .returning();
    
    rankings.push(inserted);
    rank++;
  }
  
  return rankings;
}

// ==========================================
// Referral Program Functions
// ==========================================

// Find a session by referral code
export async function getSessionByReferralCode(code: string): Promise<Session | undefined> {
  return db.query.sessions.findFirst({
    where: eq(sessions.referralCode, code.toUpperCase()),
  });
}

// Redeem a referral code - returns success status and message
export async function redeemReferralCode(
  sessionId: string,
  referralCode: string
): Promise<{ success: boolean; message: string }> {
  const session = await getSession(sessionId);
  if (!session) {
    return { success: false, message: "Session not found" };
  }

  // Check if already used a referral code
  if (session.referredByCode) {
    return { success: false, message: "You have already used a referral code" };
  }

  // Normalize code to uppercase
  const code = referralCode.toUpperCase().trim();

  // Check if trying to use own code
  if (session.referralCode === code) {
    return { success: false, message: "You cannot use your own referral code" };
  }

  // Find the referrer
  const referrer = await getSessionByReferralCode(code);
  if (!referrer) {
    return { success: false, message: "Invalid referral code" };
  }

  // Update current user: set referredByCode and add minutes
  await db
    .update(sessions)
    .set({
      referredByCode: code,
      timeBankMinutes: (session.timeBankMinutes || 0) + REFERRAL_REWARD_MINUTES,
      updatedAt: new Date(),
    })
    .where(eq(sessions.id, sessionId));

  // Update referrer: increment referralCount and add minutes
  await db
    .update(sessions)
    .set({
      referralCount: (referrer.referralCount || 0) + 1,
      timeBankMinutes: (referrer.timeBankMinutes || 0) + REFERRAL_REWARD_MINUTES,
      updatedAt: new Date(),
    })
    .where(eq(sessions.id, referrer.id));

  return { 
    success: true, 
    message: `Success! You and your friend both received ${REFERRAL_REWARD_MINUTES} minutes!` 
  };
}

// ==========================================
// Time Bank Functions
// ==========================================

// Purchase time package - adds minutes to time bank
export async function purchaseTimePackage(
  sessionId: string,
  packageId: string
): Promise<{ success: boolean; message: string; minutesAdded?: number }> {
  const session = await getSession(sessionId);
  if (!session) {
    return { success: false, message: "Session not found" };
  }

  const pkg = TIME_PACKAGES.find(p => p.id === packageId);
  if (!pkg) {
    return { success: false, message: "Invalid package" };
  }

  const newBalance = (session.timeBankMinutes || 0) + pkg.minutes;

  await db
    .update(sessions)
    .set({
      timeBankMinutes: newBalance,
      updatedAt: new Date(),
    })
    .where(eq(sessions.id, sessionId));

  // Log the transaction
  await db.insert(creditTransactions).values({
    sessionId,
    amount: pkg.minutes,
    type: "purchase",
    description: `Purchased ${pkg.name} (${pkg.minutes} minutes)`,
  });

  return { 
    success: true, 
    message: `Added ${pkg.minutes} minutes to your Time Bank!`,
    minutesAdded: pkg.minutes
  };
}

// Deduct minutes from time bank (for call extensions)
export async function deductTimeBank(
  sessionId: string,
  minutes: number,
  reason: string
): Promise<{ success: boolean; newBalance: number }> {
  const session = await getSession(sessionId);
  if (!session) {
    return { success: false, newBalance: 0 };
  }

  const currentBalance = session.timeBankMinutes || 0;
  if (currentBalance < minutes) {
    return { success: false, newBalance: currentBalance };
  }

  const newBalance = currentBalance - minutes;

  await db
    .update(sessions)
    .set({
      timeBankMinutes: newBalance,
      updatedAt: new Date(),
    })
    .where(eq(sessions.id, sessionId));

  // Log the deduction
  await db.insert(creditTransactions).values({
    sessionId,
    amount: -minutes,
    type: "extension",
    description: reason,
  });

  return { success: true, newBalance };
}

// Add minutes to time bank (for rewards, bonuses, etc.)
export async function addTimeBank(
  sessionId: string,
  minutes: number,
  reason: string
): Promise<{ success: boolean; newBalance: number }> {
  const session = await getSession(sessionId);
  if (!session) {
    return { success: false, newBalance: 0 };
  }

  const newBalance = (session.timeBankMinutes || 0) + minutes;

  await db
    .update(sessions)
    .set({
      timeBankMinutes: newBalance,
      updatedAt: new Date(),
    })
    .where(eq(sessions.id, sessionId));

  // Log the addition
  await db.insert(creditTransactions).values({
    sessionId,
    amount: minutes,
    type: "bonus",
    description: reason,
  });

  return { success: true, newBalance };
}
