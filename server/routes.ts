import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { WebSocketServer, WebSocket, type RawData } from "ws";
import type { IncomingMessage } from "node:http";
import { RtcTokenBuilder, RtcRole } from "agora-token";

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
  addKarma,
  useDailyMatch,
  refillDailyMatches,
  createCall,
  getCall,
  updateCall,
  getCallHistory,
  joinQueue,
  leaveQueue,
  findMatch,
  getQueuePosition,
  createReport,
  activatePremium,
  checkPremiumStatus,
} from "./storage";
import {
  CREDIT_PACKAGES,
  EXTENSION_OPTIONS,
  KARMA_LEVELS,
  KARMA_REWARDS,
  COSTS,
  MAX_DAILY_MATCHES,
  DEFAULT_CALL_DURATION_SECONDS,
} from "@shared/schema";

// Active WebSocket connections for matchmaking
const activeConnections = new Map<string, WebSocket>();
// Active calls tracking
const activeCalls = new Map<string, { callId: string; partnerId: string; endTime: number }>();
// Pending matches for users who weren't connected when match was found
const pendingMatches = new Map<string, { callId: string; partnerId: string; duration: number }>();

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
              await joinQueue({
                sessionId,
                mood: message.mood,
                cardId: message.cardId,
                isPriority: message.isPriority || false,
              });
              
              // Try to find a match immediately
              const match = await findMatch(message.mood, sessionId);
              if (match) {
                // Create the call
                const call = await createCall({
                  callerSessionId: sessionId,
                  listenerSessionId: match.sessionId,
                  callerMood: message.mood,
                  status: "connected",
                  startedAt: new Date(),
                });
                
                // Track active call
                const endTime = Date.now() + DEFAULT_CALL_DURATION_SECONDS * 1000;
                activeCalls.set(sessionId, { callId: call.id, partnerId: match.sessionId, endTime });
                activeCalls.set(match.sessionId, { callId: call.id, partnerId: sessionId, endTime });
                
                // Notify both users
                console.log("[WS] Match found! Notifying session:", sessionId, "and partner:", match.sessionId);
                console.log("[WS] Active connections:", Array.from(activeConnections.keys()).join(", "));
                ws.send(JSON.stringify({
                  type: "match_found",
                  callId: call.id,
                  partnerId: match.sessionId,
                  duration: DEFAULT_CALL_DURATION_SECONDS,
                }));
                console.log("[WS] Sent match_found to current user:", sessionId);
                
                const partnerWs = activeConnections.get(match.sessionId);
                console.log("[WS] Partner WebSocket lookup for:", match.sessionId, "found:", !!partnerWs, "state:", partnerWs?.readyState, "OPEN:", WebSocket.OPEN);
                if (partnerWs && partnerWs.readyState === WebSocket.OPEN) {
                  partnerWs.send(JSON.stringify({
                    type: "match_found",
                    callId: call.id,
                    partnerId: sessionId,
                    duration: DEFAULT_CALL_DURATION_SECONDS,
                  }));
                  console.log("[WS] Sent match_found to partner:", match.sessionId);
                } else {
                  console.log("[WS] WARNING: Could not send match_found to partner - storing as pending match");
                  // Store pending match so partner gets it when they reconnect
                  pendingMatches.set(match.sessionId, {
                    callId: call.id,
                    partnerId: sessionId,
                    duration: DEFAULT_CALL_DURATION_SECONDS,
                  });
                }
              } else {
                // Send queue position
                const position = await getQueuePosition(sessionId);
                ws.send(JSON.stringify({ type: "queue_position", position }));
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
                
                // Award karma for completing call
                await addKarma(sessionId, KARMA_REWARDS.CALL_COMPLETE, "call_complete", activeCall.callId);
                
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
                  const session = await getSession(sessionId);
                  if (session && session.credits >= extension.credits) {
                    await spendCredits(sessionId, extension.credits, "extension", `${extension.minutes} minute extension`, activeCall.callId);
                    await addKarma(sessionId, KARMA_REWARDS.CALL_EXTEND, "call_extend", activeCall.callId);
                    
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
          
          // Handle disconnection during call
          const activeCall = activeCalls.get(sessionId);
          if (activeCall) {
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
  // Karma APIs
  // ===============================
  
  // Get karma levels info
  app.get("/api/karma/levels", async (_req: Request, res: Response) => {
    res.json(KARMA_LEVELS);
  });
  
  // Get session karma with level
  app.get("/api/sessions/:id/karma", async (req: SessionRequest, res: Response) => {
    try {
      const session = await getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      // Find current level
      const level = [...KARMA_LEVELS].reverse().find(l => session.karmaPoints >= l.minKarma) || KARMA_LEVELS[0];
      const levelIndex = KARMA_LEVELS.findIndex(l => l.name === level.name);
      const nextLevel = KARMA_LEVELS[levelIndex + 1];
      
      res.json({
        karmaPoints: session.karmaPoints,
        level: level.name,
        levelIndex: levelIndex + 1,
        nextLevel: nextLevel?.name || null,
        pointsToNextLevel: nextLevel ? nextLevel.minKarma - session.karmaPoints : 0,
      });
    } catch (error) {
      console.error("Error getting karma:", error);
      res.status(500).json({ error: "Failed to get karma" });
    }
  });

  // Award karma
  app.post("/api/sessions/:id/karma/award", async (req: SessionRequest, res: Response) => {
    try {
      const { amount, type, callId } = req.body;
      const session = await addKarma(req.params.id, amount, type, callId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json({ karmaPoints: session.karmaPoints });
    } catch (error) {
      console.error("Error awarding karma:", error);
      res.status(500).json({ error: "Failed to award karma" });
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
      
      // Penalize reported user
      if (reportedSessionId) {
        await addKarma(reportedSessionId, KARMA_REWARDS.REPORTED, "reported", callId);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error creating report:", error);
      res.status(500).json({ error: "Failed to create report" });
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
