import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { WebSocketServer, WebSocket, type RawData } from "ws";
import type { IncomingMessage } from "node:http";
import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from "node:crypto";

// Type for routes with :id parameter
interface SessionRequest extends Request {
  params: {
    id: string;
  };
}

import {
  getOrCreateSession,
  getSession,
  updateSession,
  addCredits,
  spendCredits,
  addToTimeBank,
  addAura,
  useDailyMatch,
  refillDailyMatches,
  performDailyCheckIn,
  completeFirstMission,
  createCall,
  getCall,
  updateCall,
  getCallHistory,
  joinQueue,
  leaveQueue,
  findMatch,
  findWaitingVenter,
  findWaitingListener,
  getQueuePosition,
  createReport,
  createCallRating,
  hasSubmittedRating,
  activatePremium,
  checkPremiumStatus,
  generateRestoreToken,
  validateAndRestoreSession,
  updateSessionCountry,
  getCountryRankings,
  shouldRefreshRankings,
  refreshCountryRankings,
  getCountryName,
} from "./storage";
import {
  CREDIT_PACKAGES,
  EXTENSION_OPTIONS,
  AURA_LEVELS,
  AURA_REWARDS,
  COSTS,
  MAX_DAILY_MATCHES,
  DEFAULT_CALL_DURATION_SECONDS,
  DAILY_VIBE_PROMPTS,
} from "@shared/schema";

// Active WebSocket connections for matchmaking
const activeConnections = new Map<string, WebSocket>();
// Active calls tracking (includes startTime to handle grace period on disconnect)
const activeCalls = new Map<string, { callId: string; partnerId: string; endTime: number; startTime: number }>();
// Pending matches for users who weren't connected when match was found
const pendingMatches = new Map<string, { callId: string; partnerId: string; duration: number }>();
// Grace period before ending call on disconnect (in milliseconds) - allows time for reconnect
const CALL_DISCONNECT_GRACE_PERIOD = 15000; // 15 seconds

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for real-time matchmaking
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  
  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    let sessionId: string | null = null;
    let pingInterval: NodeJS.Timeout | null = null;
    
    // Keep connection alive with ping/pong
    pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30000); // Ping every 30 seconds
    
    ws.on("pong", () => {
      // Connection is alive
    });
    
    ws.on("message", async (data: RawData) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case "register":
            sessionId = message.sessionId;
            if (sessionId) {
              console.log("[WS] Registering session:", sessionId, "- Total active connections:", activeConnections.size + 1);
              // Close any existing connection for this session
              const existingWs = activeConnections.get(sessionId);
              if (existingWs && existingWs !== ws && existingWs.readyState === WebSocket.OPEN) {
                console.log("[WS] Closing existing connection for session:", sessionId);
                existingWs.close();
              }
              activeConnections.set(sessionId, ws);
              
              // Check for pending matches
              const pendingMatch = pendingMatches.get(sessionId);
              if (pendingMatch) {
                console.log("[WS] Found pending match for session:", sessionId, "callId:", pendingMatch.callId);
                ws.send(JSON.stringify({
                  type: "match_found",
                  callId: pendingMatch.callId,
                  partnerId: pendingMatch.partnerId,
                  duration: pendingMatch.duration,
                }));
                pendingMatches.delete(sessionId);
              }
            }
            break;
            
          case "join_queue":
            if (sessionId && message.mood && message.cardId) {
              // Check if session is already in an active call (prevent re-join after match)
              const existingCall = activeCalls.get(sessionId);
              if (existingCall) {
                console.log("[WS] Session already in call, sending match info instead of joining queue");
                ws.send(JSON.stringify({
                  type: "match_found",
                  callId: existingCall.callId,
                  partnerId: existingCall.partnerId,
                  duration: Math.floor((existingCall.endTime - Date.now()) / 1000),
                }));
                break;
              }
              
              // Check for pending match first (in case they reconnected)
              const existingPendingMatch = pendingMatches.get(sessionId);
              if (existingPendingMatch) {
                console.log("[WS] Found pending match for session trying to join queue:", sessionId);
                ws.send(JSON.stringify({
                  type: "match_found",
                  callId: existingPendingMatch.callId,
                  partnerId: existingPendingMatch.partnerId,
                  duration: existingPendingMatch.duration,
                }));
                pendingMatches.delete(sessionId);
                break;
              }
              
              // SIMPLIFIED MATCHMAKING:
              // - Both users check for opposite mood first
              // - If no match found, wait in pool
              
              if (message.mood === "vent") {
                // Check if any listeners are waiting first
                console.log("[WS] Venter joining, checking for waiting listeners. Active connections:", activeConnections.size);
                const listener = await findWaitingListener(activeConnections);
                console.log("[WS] findWaitingListener result:", listener ? listener.sessionId : "none");
                
                if (listener) {
                  // Create the call - venter matched with waiting listener
                  const call = await createCall({
                    callerSessionId: sessionId,
                    listenerSessionId: listener.sessionId,
                    callerMood: "vent",
                    status: "connected",
                    startedAt: new Date(),
                  });
                  
                  // Track active call
                  const startTime = Date.now();
                  const endTime = startTime + DEFAULT_CALL_DURATION_SECONDS * 1000;
                  activeCalls.set(sessionId, { callId: call.id, partnerId: listener.sessionId, endTime, startTime });
                  activeCalls.set(listener.sessionId, { callId: call.id, partnerId: sessionId, endTime, startTime });
                  
                  // ALWAYS store pending match for BOTH users as backup for HTTP polling
                  // This ensures match delivery even if WebSocket messages are missed
                  pendingMatches.set(sessionId, {
                    callId: call.id,
                    partnerId: listener.sessionId,
                    duration: DEFAULT_CALL_DURATION_SECONDS,
                  });
                  pendingMatches.set(listener.sessionId, {
                    callId: call.id,
                    partnerId: sessionId,
                    duration: DEFAULT_CALL_DURATION_SECONDS,
                  });
                  console.log("[WS] Match found! Venter:", sessionId, "connected to Listener:", listener.sessionId);
                  console.log("[WS] Stored pending matches for both users");
                  
                  // Try to notify venter via WebSocket
                  try {
                    ws.send(JSON.stringify({
                      type: "match_found",
                      callId: call.id,
                      partnerId: listener.sessionId,
                      duration: DEFAULT_CALL_DURATION_SECONDS,
                    }));
                    console.log("[WS] Sent match_found to venter:", sessionId);
                  } catch (err) {
                    console.log("[WS] Failed to send to venter, will use HTTP polling");
                  }
                  
                  // Try to notify listener via WebSocket
                  const listenerWs = activeConnections.get(listener.sessionId);
                  if (listenerWs && listenerWs.readyState === WebSocket.OPEN) {
                    try {
                      listenerWs.send(JSON.stringify({
                        type: "match_found",
                        callId: call.id,
                        partnerId: sessionId,
                        duration: DEFAULT_CALL_DURATION_SECONDS,
                      }));
                      console.log("[WS] Sent match_found to listener:", listener.sessionId);
                    } catch (err) {
                      console.log("[WS] Failed to send to listener, will use HTTP polling");
                    }
                  } else {
                    console.log("[WS] Listener WebSocket not open, will use HTTP polling");
                  }
                } else {
                  // No listeners waiting - venter waits
                  await joinQueue({
                    sessionId,
                    mood: message.mood,
                    cardId: message.cardId,
                    isPriority: message.isPriority || false,
                  });
                  console.log("[WS] Venter joined waiting pool:", sessionId);
                  ws.send(JSON.stringify({ type: "waiting", mood: "vent" }));
                }
              } else {
                // Listen users instantly connect to any waiting Vent user
                const ventUser = await findWaitingVenter(activeConnections);
                
                if (ventUser) {
                  // Create the call
                  const call = await createCall({
                    callerSessionId: ventUser.sessionId,
                    listenerSessionId: sessionId,
                    callerMood: "vent",
                    status: "connected",
                    startedAt: new Date(),
                  });
                  
                  // Track active call
                  const startTime = Date.now();
                  const endTime = startTime + DEFAULT_CALL_DURATION_SECONDS * 1000;
                  activeCalls.set(sessionId, { callId: call.id, partnerId: ventUser.sessionId, endTime, startTime });
                  activeCalls.set(ventUser.sessionId, { callId: call.id, partnerId: sessionId, endTime, startTime });
                  
                  // ALWAYS store pending match for BOTH users as backup for HTTP polling
                  pendingMatches.set(sessionId, {
                    callId: call.id,
                    partnerId: ventUser.sessionId,
                    duration: DEFAULT_CALL_DURATION_SECONDS,
                  });
                  pendingMatches.set(ventUser.sessionId, {
                    callId: call.id,
                    partnerId: sessionId,
                    duration: DEFAULT_CALL_DURATION_SECONDS,
                  });
                  console.log("[WS] Match found! Listener:", sessionId, "connected to Venter:", ventUser.sessionId);
                  console.log("[WS] Stored pending matches for both users");
                  
                  // Try to notify listener (current user) via WebSocket
                  try {
                    ws.send(JSON.stringify({
                      type: "match_found",
                      callId: call.id,
                      partnerId: ventUser.sessionId,
                      duration: DEFAULT_CALL_DURATION_SECONDS,
                    }));
                    console.log("[WS] Sent match_found to listener:", sessionId);
                  } catch (err) {
                    console.log("[WS] Failed to send to listener, will use HTTP polling");
                  }
                  
                  // Try to notify venter via WebSocket
                  const venterWs = activeConnections.get(ventUser.sessionId);
                  if (venterWs && venterWs.readyState === WebSocket.OPEN) {
                    try {
                      venterWs.send(JSON.stringify({
                        type: "match_found",
                        callId: call.id,
                        partnerId: sessionId,
                        duration: DEFAULT_CALL_DURATION_SECONDS,
                      }));
                      console.log("[WS] Sent match_found to venter:", ventUser.sessionId);
                    } catch (err) {
                      console.log("[WS] Failed to send to venter, will use HTTP polling");
                    }
                  } else {
                    console.log("[WS] Venter WebSocket not open, will use HTTP polling");
                  }
                } else {
                  // No venters waiting - listener waits (rare case)
                  await joinQueue({
                    sessionId,
                    mood: message.mood,
                    cardId: message.cardId,
                    isPriority: message.isPriority || false,
                  });
                  console.log("[WS] No venters available, listener added to queue:", sessionId);
                  ws.send(JSON.stringify({ type: "waiting", mood: "listen" }));
                }
              }
            }
            break;
            
          case "leave_queue":
            if (sessionId) {
              await leaveQueue(sessionId);
            }
            break;
          
          case "check_match":
            // Allow clients to poll for pending matches
            if (sessionId) {
              const pendingMatch = pendingMatches.get(sessionId);
              if (pendingMatch) {
                console.log("[WS] Sending pending match to session:", sessionId);
                ws.send(JSON.stringify({
                  type: "match_found",
                  callId: pendingMatch.callId,
                  partnerId: pendingMatch.partnerId,
                  duration: pendingMatch.duration,
                }));
                pendingMatches.delete(sessionId);
              } else {
                // Check if already in an active call
                const activeCall = activeCalls.get(sessionId);
                if (activeCall) {
                  ws.send(JSON.stringify({
                    type: "match_found",
                    callId: activeCall.callId,
                    partnerId: activeCall.partnerId,
                    duration: DEFAULT_CALL_DURATION_SECONDS,
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
                await updateCall(activeCall.callId, {
                  status: "ended",
                  endedAt: new Date(),
                  endReason: message.reason || "normal",
                });
                
                // Award aura for completing call
                await addAura(sessionId, AURA_REWARDS.CALL_COMPLETE, "call_complete", activeCall.callId);
                
                // Calculate unused time for time bank refund
                if (message.remainingSeconds && message.remainingSeconds > 60) {
                  const refundMinutes = Math.floor(message.remainingSeconds / 60);
                  await addToTimeBank(sessionId, refundMinutes);
                }
                
                // Notify partner
                const partnerWs = activeConnections.get(activeCall.partnerId);
                console.log("[WS] Partner WebSocket found:", !!partnerWs, "state:", partnerWs?.readyState, "OPEN =", WebSocket.OPEN);
                if (partnerWs && partnerWs.readyState === WebSocket.OPEN) {
                  console.log("[WS] Sending call_ended to partner:", activeCall.partnerId);
                  partnerWs.send(JSON.stringify({ type: "call_ended", reason: message.reason }));
                } else {
                  console.log("[WS] WARNING: Partner WebSocket not available");
                }
                
                // Clean up
                activeCalls.delete(sessionId);
                activeCalls.delete(activeCall.partnerId);
              } else {
                console.log("[WS] WARNING: No active call found for session:", sessionId);
              }
            }
            break;
            
          case "extend_call":
            if (sessionId && message.minutes) {
              const activeCall = activeCalls.get(sessionId);
              if (activeCall) {
                const extension = EXTENSION_OPTIONS.find(e => e.minutes === message.minutes);
                if (extension) {
                  const MAX_CALL_DURATION_MS = 60 * 60 * 1000; // 60 minutes in milliseconds
                  const currentTotalDuration = activeCall.endTime - activeCall.startTime;
                  const newTotalDuration = currentTotalDuration + extension.minutes * 60 * 1000;
                  
                  // Reject extension if it would exceed 60-minute maximum
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
                  if (session && session.credits >= extension.credits) {
                    await spendCredits(sessionId, extension.credits, "extension", `${extension.minutes} minute extension`, activeCall.callId);
                    await addAura(sessionId, AURA_REWARDS.CALL_EXTEND, "call_extend", activeCall.callId);
                    
                    // Update call end time
                    const newEndTime = activeCall.endTime + extension.minutes * 60 * 1000;
                    activeCall.endTime = newEndTime;
                    const partnerCall = activeCalls.get(activeCall.partnerId);
                    if (partnerCall) {
                      partnerCall.endTime = newEndTime;
                    }
                    
                    // Notify both users
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
      // Clear ping interval
      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
      }
      
      if (sessionId) {
        console.log("[WS] Connection closed for session:", sessionId);
        // Only delete from activeConnections if THIS websocket is the current one
        // This prevents race condition when a new connection registers before old one closes
        const currentWs = activeConnections.get(sessionId);
        if (currentWs === ws) {
          activeConnections.delete(sessionId);
          // Don't leave queue on disconnect - they may reconnect
          // await leaveQueue(sessionId);
          
          // Handle disconnection during call with grace period
          const activeCall = activeCalls.get(sessionId);
          if (activeCall) {
            const callDuration = Date.now() - activeCall.startTime;
            
            // If call just started (within grace period), don't end it yet
            // Give time for user to reconnect (common on mobile)
            if (callDuration < CALL_DISCONNECT_GRACE_PERIOD) {
              console.log("[WS] Call just started, giving grace period for reconnection. Session:", sessionId, "Duration:", callDuration, "ms");
              // Capture sessionId for closure (we know it's not null here)
              const disconnectedSessionId = sessionId;
              // Schedule delayed check - if still disconnected after grace period, end the call
              setTimeout(async () => {
                const reconnectedWs = activeConnections.get(disconnectedSessionId);
                if (!reconnectedWs || reconnectedWs.readyState !== WebSocket.OPEN) {
                  // Still disconnected after grace period - end the call
                  console.log("[WS] Grace period expired, ending call for session:", disconnectedSessionId);
                  const stillActiveCall = activeCalls.get(disconnectedSessionId);
                  if (stillActiveCall) {
                    await updateCall(stillActiveCall.callId, {
                      status: "ended",
                      endedAt: new Date(),
                      endReason: "disconnected",
                    });
                    
                    const partnerWs = activeConnections.get(stillActiveCall.partnerId);
                    if (partnerWs && partnerWs.readyState === WebSocket.OPEN) {
                      partnerWs.send(JSON.stringify({ type: "call_ended", reason: "partner_disconnected" }));
                    }
                    
                    activeCalls.delete(disconnectedSessionId);
                    activeCalls.delete(stillActiveCall.partnerId);
                  }
                } else {
                  console.log("[WS] Session reconnected within grace period:", disconnectedSessionId);
                }
              }, CALL_DISCONNECT_GRACE_PERIOD - callDuration);
            } else {
              // Call has been active long enough, end immediately
              console.log("[WS] Call active for", callDuration, "ms, ending due to disconnect");
              await updateCall(activeCall.callId, {
                status: "ended",
                endedAt: new Date(),
                endReason: "disconnected",
              });
              
              const partnerWs = activeConnections.get(activeCall.partnerId);
              if (partnerWs && partnerWs.readyState === WebSocket.OPEN) {
                partnerWs.send(JSON.stringify({ type: "call_ended", reason: "partner_disconnected" }));
              }
              
              activeCalls.delete(sessionId);
              activeCalls.delete(activeCall.partnerId);
            }
          }
        }
        // If currentWs !== ws, a new connection has already replaced this one, so don't cleanup
      }
    });
    
    ws.on("error", (error) => {
      console.error("[WS] WebSocket error:", error);
    });
  });

  // ===============================
  // Session Management APIs
  // ===============================
  
  // Create or get session
  app.post("/api/sessions", async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.body;
      if (!deviceId) {
        return res.status(400).json({ error: "deviceId is required" });
      }
      const session = await getOrCreateSession(deviceId);
      
      // Detect country from IP if not already set
      if (!session.countryCode) {
        try {
          // Get client IP from headers (Replit proxy) or socket
          const forwardedFor = req.headers["x-forwarded-for"];
          const clientIp = typeof forwardedFor === "string" 
            ? forwardedFor.split(",")[0].trim() 
            : req.socket.remoteAddress;
          
          if (clientIp && clientIp !== "127.0.0.1" && clientIp !== "::1") {
            // Use ip-api.com for free geolocation (no API key needed)
            const geoRes = await fetch(`http://ip-api.com/json/${clientIp}?fields=countryCode`);
            if (geoRes.ok) {
              const geoData = await geoRes.json() as { countryCode?: string };
              if (geoData.countryCode) {
                const updatedSession = await updateSessionCountry(session.id, geoData.countryCode);
                return res.json(updatedSession || session);
              }
            }
          }
        } catch (geoError) {
          console.error("Error detecting country:", geoError);
          // Continue without country - not critical
        }
      }
      
      res.json(session);
    } catch (error) {
      console.error("Error creating session:", error);
      res.status(500).json({ error: "Failed to create session" });
    }
  });
  
  // Get session
  app.get("/api/sessions/:id", async (req: SessionRequest, res: Response) => {
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
  
  // Accept terms
  app.post("/api/sessions/:id/accept-terms", async (req: SessionRequest, res: Response) => {
    try {
      const session = await updateSession(req.params.id, {
        termsAcceptedAt: new Date(),
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

  // ===============================
  // Credits APIs
  // ===============================
  
  // Get credit packages
  app.get("/api/credits/packages", async (_req: Request, res: Response) => {
    res.json(CREDIT_PACKAGES);
  });
  
  // Purchase credits (mock for now, would integrate with Stripe)
  app.post("/api/sessions/:id/credits/purchase", async (req: SessionRequest, res: Response) => {
    try {
      const { packageId } = req.body;
      const pkg = CREDIT_PACKAGES.find(p => p.id === packageId);
      if (!pkg) {
        return res.status(400).json({ error: "Invalid package" });
      }
      
      // In production, this would verify Stripe payment
      const session = await addCredits(
        req.params.id,
        pkg.credits,
        "purchase",
        `${pkg.name} purchase`
      );
      
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error purchasing credits:", error);
      res.status(500).json({ error: "Failed to purchase credits" });
    }
  });
  
  // Spend credits (shuffle deck)
  app.post("/api/sessions/:id/credits/shuffle", async (req: SessionRequest, res: Response) => {
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
      
      // Refill daily matches
      const updated = await refillDailyMatches(req.params.id);
      res.json(updated);
    } catch (error) {
      console.error("Error shuffling deck:", error);
      res.status(500).json({ error: "Failed to shuffle deck" });
    }
  });

  // ===============================
  // Pending Match API (for polling when WebSocket is unreliable)
  // ===============================
  
  // Check for pending match (mobile fallback when WebSocket disconnects)
  app.get("/api/sessions/:id/pending-match", async (req: SessionRequest, res: Response) => {
    try {
      const sessionId = req.params.id;
      
      // Check pending matches map
      const pendingMatch = pendingMatches.get(sessionId);
      if (pendingMatch) {
        console.log("[API] Found pending match for session:", sessionId);
        pendingMatches.delete(sessionId);
        return res.json({
          hasMatch: true,
          callId: pendingMatch.callId,
          partnerId: pendingMatch.partnerId,
          duration: pendingMatch.duration,
        });
      }
      
      // Also check if session is already in an active call
      const activeCall = activeCalls.get(sessionId);
      if (activeCall) {
        console.log("[API] Session already in active call:", sessionId);
        return res.json({
          hasMatch: true,
          callId: activeCall.callId,
          partnerId: activeCall.partnerId,
          duration: Math.floor((activeCall.endTime - Date.now()) / 1000),
        });
      }
      
      res.json({ hasMatch: false });
    } catch (error) {
      console.error("Error checking pending match:", error);
      res.status(500).json({ error: "Failed to check pending match" });
    }
  });

  // ===============================
  // Daily Matches APIs
  // ===============================
  
  // Use a daily match
  app.post("/api/sessions/:id/matches/use", async (req: SessionRequest, res: Response) => {
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
  
  // Refill daily matches (costs 100 credits)
  app.post("/api/sessions/:id/matches/refill", async (req: SessionRequest, res: Response) => {
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

  // ===============================
  // Aura APIs (renamed from Karma for 2026 Gen Z appeal)
  // ===============================
  
  // Get aura levels info
  app.get("/api/aura/levels", async (_req: Request, res: Response) => {
    res.json(AURA_LEVELS);
  });
  
  // Legacy karma endpoint for backwards compatibility
  app.get("/api/karma/levels", async (_req: Request, res: Response) => {
    res.json(AURA_LEVELS);
  });
  
  // Get session aura with level
  app.get("/api/sessions/:id/aura", async (req: SessionRequest, res: Response) => {
    try {
      const session = await getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      // Find current level
      const level = [...AURA_LEVELS].reverse().find(l => session.auraPoints >= l.minAura) || AURA_LEVELS[0];
      const levelIndex = AURA_LEVELS.findIndex(l => l.name === level.name);
      const nextLevel = AURA_LEVELS[levelIndex + 1];
      
      res.json({
        auraPoints: session.auraPoints,
        level: level.name,
        levelIndex: levelIndex + 1,
        nextLevel: nextLevel?.name || null,
        pointsToNextLevel: nextLevel ? nextLevel.minAura - session.auraPoints : 0,
      });
    } catch (error) {
      console.error("Error getting aura:", error);
      res.status(500).json({ error: "Failed to get aura" });
    }
  });
  
  // Legacy karma endpoint for backwards compatibility
  app.get("/api/sessions/:id/karma", async (req: SessionRequest, res: Response) => {
    try {
      const session = await getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      const level = [...AURA_LEVELS].reverse().find(l => session.auraPoints >= l.minAura) || AURA_LEVELS[0];
      const levelIndex = AURA_LEVELS.findIndex(l => l.name === level.name);
      const nextLevel = AURA_LEVELS[levelIndex + 1];
      
      res.json({
        auraPoints: session.auraPoints,
        karmaPoints: session.auraPoints, // Legacy field
        level: level.name,
        levelIndex: levelIndex + 1,
        nextLevel: nextLevel?.name || null,
        pointsToNextLevel: nextLevel ? nextLevel.minAura - session.auraPoints : 0,
      });
    } catch (error) {
      console.error("Error getting aura:", error);
      res.status(500).json({ error: "Failed to get aura" });
    }
  });

  // Award aura
  app.post("/api/sessions/:id/aura/award", async (req: SessionRequest, res: Response) => {
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
  
  // Legacy karma award endpoint for backwards compatibility
  app.post("/api/sessions/:id/karma/award", async (req: SessionRequest, res: Response) => {
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

  // ===============================
  // Habit Loop APIs
  // ===============================
  
  // Daily check-in (+5 Aura, streak tracking)
  app.post("/api/sessions/:id/checkin", async (req: SessionRequest, res: Response) => {
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
        auraPoints: result.session.auraPoints,
      });
    } catch (error) {
      console.error("Error performing check-in:", error);
      res.status(500).json({ error: "Failed to check in" });
    }
  });
  
  // Complete first mission (+50 Aura for first call)
  app.post("/api/sessions/:id/first-mission", async (req: SessionRequest, res: Response) => {
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
        auraPoints: result.session.auraPoints,
      });
    } catch (error) {
      console.error("Error completing first mission:", error);
      res.status(500).json({ error: "Failed to complete first mission" });
    }
  });
  
  // Get today's daily vibe prompt (variable reward - different each day)
  app.get("/api/daily-vibe", async (_req: Request, res: Response) => {
    try {
      // Use day of year to select prompt (changes daily, repeats yearly)
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 0);
      const diff = now.getTime() - startOfYear.getTime();
      const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
      const promptIndex = dayOfYear % DAILY_VIBE_PROMPTS.length;
      
      res.json({
        prompt: DAILY_VIBE_PROMPTS[promptIndex],
        dayOfYear,
        totalPrompts: DAILY_VIBE_PROMPTS.length,
      });
    } catch (error) {
      console.error("Error getting daily vibe:", error);
      res.status(500).json({ error: "Failed to get daily vibe" });
    }
  });
  
  // Get habit loop status for a session
  app.get("/api/sessions/:id/habit-status", async (req: SessionRequest, res: Response) => {
    try {
      const session = await getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      const now = new Date();
      const today = now.toDateString();
      const lastCheckIn = session.lastCheckIn ? new Date(session.lastCheckIn) : null;
      const checkedInToday = lastCheckIn ? lastCheckIn.toDateString() === today : false;
      
      res.json({
        dailyStreak: session.dailyStreak,
        checkedInToday,
        firstCallCompleted: session.firstCallCompleted,
        showFirstMission: !session.firstCallCompleted,
        auraPoints: session.auraPoints,
      });
    } catch (error) {
      console.error("Error getting habit status:", error);
      res.status(500).json({ error: "Failed to get habit status" });
    }
  });

  // ===============================
  // Premium APIs
  // ===============================
  
  // Activate premium (mock - would integrate with Stripe subscription)
  app.post("/api/sessions/:id/premium/activate", async (req: SessionRequest, res: Response) => {
    try {
      const session = await activatePremium(
        req.params.id,
        30, // 30 days
        COSTS.PREMIUM_BONUS_CREDITS
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
  
  // Check premium status
  app.get("/api/sessions/:id/premium/status", async (req: SessionRequest, res: Response) => {
    try {
      const isPremium = await checkPremiumStatus(req.params.id);
      res.json({ isPremium });
    } catch (error) {
      console.error("Error checking premium:", error);
      res.status(500).json({ error: "Failed to check premium status" });
    }
  });
  
  // Update gender preference (premium feature)
  app.post("/api/sessions/:id/preferences/gender", async (req: SessionRequest, res: Response) => {
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

  // ===============================
  // Call History APIs
  // ===============================
  
  app.get("/api/sessions/:id/calls", async (req: SessionRequest, res: Response) => {
    try {
      const calls = await getCallHistory(req.params.id);
      res.json(calls);
    } catch (error) {
      console.error("Error getting call history:", error);
      res.status(500).json({ error: "Failed to get call history" });
    }
  });

  // ===============================
  // Report APIs
  // ===============================
  
  app.post("/api/reports", async (req: Request, res: Response) => {
    try {
      const { reporterSessionId, reportedSessionId, callId, reasons, otherReason, reason } = req.body;
      
      await createReport({
        reporterSessionId,
        reportedSessionId,
        callId,
        reasons,
        otherReason,
        reason, // Legacy field for backwards compatibility
      });
      
      // Penalize reported user (deduct aura)
      if (reportedSessionId) {
        await addAura(reportedSessionId, AURA_REWARDS.REPORTED, "reported", callId);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error creating report:", error);
      res.status(500).json({ error: "Failed to create report" });
    }
  });

  // ===============================
  // Country Rankings API
  // ===============================
  
  // Get global country rankings (cached, refreshed every 12 hours)
  app.get("/api/rankings/countries", async (_req: Request, res: Response) => {
    try {
      // Check if we need to refresh the cache
      const needsRefresh = await shouldRefreshRankings();
      
      if (needsRefresh) {
        console.log("[Rankings] Refreshing country rankings cache...");
        const rankings = await refreshCountryRankings();
        return res.json({
          rankings,
          lastUpdated: new Date().toISOString(),
          nextUpdate: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        });
      }
      
      const rankings = await getCountryRankings();
      const lastUpdated = rankings[0]?.lastUpdatedAt || new Date();
      
      res.json({
        rankings,
        lastUpdated: new Date(lastUpdated).toISOString(),
        nextUpdate: new Date(new Date(lastUpdated).getTime() + 12 * 60 * 60 * 1000).toISOString(),
      });
    } catch (error) {
      console.error("Error getting country rankings:", error);
      res.status(500).json({ error: "Failed to get rankings" });
    }
  });
  
  // Force refresh rankings (admin use)
  app.post("/api/rankings/refresh", async (_req: Request, res: Response) => {
    try {
      console.log("[Rankings] Force refreshing country rankings...");
      const rankings = await refreshCountryRankings();
      res.json({
        rankings,
        lastUpdated: new Date().toISOString(),
        message: "Rankings refreshed successfully",
      });
    } catch (error) {
      console.error("Error refreshing rankings:", error);
      res.status(500).json({ error: "Failed to refresh rankings" });
    }
  });
  
  // Get user's country info
  app.get("/api/sessions/:id/country", async (req: SessionRequest, res: Response) => {
    try {
      const session = await getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      if (!session.countryCode) {
        return res.json({ countryCode: null, countryName: null, rank: null });
      }
      
      const rankings = await getCountryRankings();
      const countryRanking = rankings.find(r => r.countryCode === session.countryCode);
      
      res.json({
        countryCode: session.countryCode,
        countryName: getCountryName(session.countryCode),
        rank: countryRanking?.rank || null,
        totalAura: countryRanking?.totalAura || 0,
        userCount: countryRanking?.userCount || 0,
      });
    } catch (error) {
      console.error("Error getting session country:", error);
      res.status(500).json({ error: "Failed to get country info" });
    }
  });

  // ===============================
  // Call Ratings API
  // ===============================

  app.post("/api/calls/:callId/ratings", async (req: Request, res: Response) => {
    try {
      const callId = req.params.callId as string;
      const { sessionId, voiceQuality, strangerQuality, overallExperience, wouldCallAgain, feedback } = req.body;

      if (!sessionId || !voiceQuality || !strangerQuality || !overallExperience) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Validate ratings are 1-5
      if ([voiceQuality, strangerQuality, overallExperience].some(r => r < 1 || r > 5)) {
        return res.status(400).json({ error: "Ratings must be between 1 and 5" });
      }

      // Check if user already rated this call
      const alreadyRated = await hasSubmittedRating(sessionId, callId);
      if (alreadyRated) {
        return res.status(400).json({ error: "You have already rated this call" });
      }

      // Create the rating
      const rating = await createCallRating({
        callId,
        sessionId,
        voiceQuality,
        strangerQuality,
        overallExperience,
        wouldCallAgain,
        feedback,
        auraAwarded: 100,
      });

      // Award 100 aura for submitting feedback
      await addAura(sessionId, 100, "feedback", callId);

      const session = await getSession(sessionId);

      res.json({
        success: true,
        rating,
        auraAwarded: 100,
        newAuraTotal: session?.auraPoints || 0,
      });
    } catch (error) {
      console.error("Error creating call rating:", error);
      res.status(500).json({ error: "Failed to submit rating" });
    }
  });

  // ===============================
  // Extension Options API
  // ===============================
  
  app.get("/api/extensions", async (_req: Request, res: Response) => {
    res.json(EXTENSION_OPTIONS);
  });

  // ===============================
  // Time Bank API
  // ===============================
  
  app.get("/api/sessions/:id/timebank", async (req: SessionRequest, res: Response) => {
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

  // ===============================
  // Backup & Restore APIs
  // ===============================

  // Generate a backup file with encrypted session UUID and restore token
  app.post("/api/sessions/:id/generate-backup", async (req: SessionRequest, res: Response) => {
    try {
      const { pin } = req.body;
      
      if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
        return res.status(400).json({ error: "A 6-digit PIN is required" });
      }
      
      const session = await getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      // Check if session was already transferred
      if (session.transferredAt) {
        return res.status(400).json({ error: "This session has already been transferred to another device" });
      }
      
      // Generate a restore token and save it
      const restoreToken = await generateRestoreToken(req.params.id);
      
      // Create the backup payload
      const backupData = {
        sessionId: req.params.id,
        restoreToken,
        createdAt: new Date().toISOString(),
        version: 1,
      };
      
      // Encrypt the backup data with the PIN
      const salt = randomBytes(16);
      const key = scryptSync(pin, salt, 32);
      const iv = randomBytes(16);
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      
      const jsonData = JSON.stringify(backupData);
      let encrypted = cipher.update(jsonData, "utf8", "base64");
      encrypted += cipher.final("base64");
      const authTag = cipher.getAuthTag();
      
      // Combine salt + iv + authTag + encrypted data
      const encryptedPackage = {
        s: salt.toString("base64"),
        i: iv.toString("base64"),
        t: authTag.toString("base64"),
        d: encrypted,
        v: 1, // Version for future compatibility
      };
      
      res.json({
        backupData: Buffer.from(JSON.stringify(encryptedPackage)).toString("base64"),
        fileName: `emocall-backup-${new Date().toISOString().split("T")[0]}.enc`,
      });
    } catch (error) {
      console.error("Error generating backup:", error);
      res.status(500).json({ error: "Failed to generate backup" });
    }
  });

  // Restore session from backup file
  app.post("/api/sessions/restore", async (req: Request, res: Response) => {
    try {
      const { backupData, pin, newSessionId } = req.body;
      
      if (!backupData || !pin || !newSessionId) {
        return res.status(400).json({ error: "Backup data, PIN, and new session ID are required" });
      }
      
      if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
        return res.status(400).json({ error: "Invalid PIN format" });
      }
      
      // Decode and decrypt the backup data
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
      
      // Decrypt with the PIN
      const key = scryptSync(pin, salt, 32);
      const decipher = createDecipheriv("aes-256-gcm", key, iv);
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
      
      // Validate and restore the session
      const result = await validateAndRestoreSession(oldSessionId, restoreToken, newSessionId);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      res.json({
        success: true,
        message: "Session restored successfully",
        session: result.session,
      });
    } catch (error) {
      console.error("Error restoring session:", error);
      res.status(500).json({ error: "Failed to restore session" });
    }
  });

  // ===============================
  // Agora Voice Token API
  // ===============================

  app.post("/api/agora/token", async (req: Request, res: Response) => {
    try {
      const { channelName, uid, role } = req.body;

      if (!channelName) {
        return res.status(400).json({ error: "Channel name is required" });
      }

      const appId = process.env.AGORA_APP_ID;
      const appCertificate = process.env.AGORA_APP_CERTIFICATE;

      if (!appId || !appCertificate) {
        console.error("Agora credentials not configured");
        return res.status(500).json({ error: "Voice calling not configured" });
      }

      // Dynamic import for ESM compatibility in production builds
      const agoraToken = await import("agora-token");
      const { RtcTokenBuilder, RtcRole } = agoraToken;

      const userUid = uid || 0;
      const userRole = role === "publisher" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
      const expirationTimeInSeconds = 3600;
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

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
        uid: userUid,
      });
    } catch (error) {
      console.error("Error generating Agora token:", error);
      res.status(500).json({ error: "Failed to generate voice token" });
    }
  });

  return httpServer;
}
