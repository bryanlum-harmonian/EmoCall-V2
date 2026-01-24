import { useState, useEffect, useRef, useCallback } from "react";
import { getApiUrl } from "@/lib/query-client";

type MatchmakingState = "idle" | "connecting" | "in_queue" | "matched" | "error";

interface MatchResult {
  callId: string;
  partnerId: string;
  duration: number;
}

interface UseMatchmakingOptions {
  sessionId: string | null;
  onMatchFound?: (match: MatchResult) => void;
  onCallEnded?: (reason: string) => void;
}

interface UseMatchmakingReturn {
  state: MatchmakingState;
  queuePosition: number | null;
  error: string | null;
  matchResult: MatchResult | null;
  clearMatchResult: () => void;
  callEndedByPartner: string | null;
  clearCallEnded: () => void;
  isConnected: boolean;
  joinQueue: (mood: string, cardId: string) => void;
  leaveQueue: () => void;
  endCall: (reason?: string, remainingSeconds?: number) => void;
}

export function useMatchmaking({ sessionId, onMatchFound, onCallEnded }: UseMatchmakingOptions): UseMatchmakingReturn {
  const [state, setState] = useState<MatchmakingState>("idle");
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [callEndedByPartner, setCallEndedByPartner] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stateRef = useRef<MatchmakingState>("idle");
  const onMatchFoundRef = useRef(onMatchFound);
  const onCallEndedRef = useRef(onCallEnded);
  // Store current queue info for auto-rejoin after reconnect
  const currentQueueRef = useRef<{ mood: string; cardId: string } | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;
  // Heartbeat interval ref for cleanup
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Track intentional connection replacement to prevent auto-reconnect
  const connectionReplacedRef = useRef(false);
  // Debounce: track last connection attempt time to prevent rapid reconnections
  const lastConnectAttemptRef = useRef<number>(0);
  const minConnectIntervalMs = 500;
  
  // Keep refs in sync with latest values
  stateRef.current = state;
  onMatchFoundRef.current = onMatchFound;
  onCallEndedRef.current = onCallEnded;
  
  const clearMatchResult = useCallback(() => {
    setMatchResult(null);
  }, []);
  
  const clearCallEnded = useCallback(() => {
    setCallEndedByPartner(null);
  }, []);

  const getWsUrl = useCallback(() => {
    const apiUrl = getApiUrl();
    const url = new URL(apiUrl);
    const wsProtocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.protocol = wsProtocol;
    url.pathname = "/ws";
    console.log("[Matchmaking] WebSocket URL:", url.toString());
    return url.toString();
  }, []);

  const connect = useCallback(() => {
    if (!sessionId) {
      console.log("[Matchmaking] No sessionId, skipping connection");
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log("[Matchmaking] Already connected");
      return;
    }
    
    // Debounce: prevent rapid reconnection attempts
    const now = Date.now();
    if (now - lastConnectAttemptRef.current < minConnectIntervalMs) {
      console.log("[Matchmaking] Debouncing rapid connect attempt");
      return;
    }
    lastConnectAttemptRef.current = now;
    
    // Reset connection_replaced flag for new connection
    connectionReplacedRef.current = false;

    setState("connecting");
    setError(null);

    const wsUrl = getWsUrl();
    console.log("[Matchmaking] Connecting to:", wsUrl);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[Matchmaking] Connected, registering session:", sessionId);
        ws.send(JSON.stringify({ type: "register", sessionId }));
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        
        // If we were in queue before disconnect, re-join the queue
        if (currentQueueRef.current && stateRef.current === "in_queue") {
          console.log("[Matchmaking] Re-joining queue after reconnect:", currentQueueRef.current);
          setTimeout(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN && currentQueueRef.current) {
              wsRef.current.send(JSON.stringify({
                type: "join_queue",
                mood: currentQueueRef.current.mood,
                cardId: currentQueueRef.current.cardId,
                isPriority: false,
              }));
            }
          }, 100);
        } else {
          setState("idle");
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log("[Matchmaking] Received:", message.type, message);

          switch (message.type) {
            case "queue_position":
              setQueuePosition(message.position);
              setState("in_queue");
              break;

            case "waiting":
              // Simplified matchmaking - just waiting for a match
              console.log("[Matchmaking] Waiting for", message.mood === "vent" ? "listener" : "venter");
              setState("in_queue");
              setQueuePosition(null); // No position tracking
              break;

            case "match_found":
              console.log("[Matchmaking] Match found! callId:", message.callId);
              // Clear queue info since we're matched
              currentQueueRef.current = null;
              const match = {
                callId: message.callId,
                partnerId: message.partnerId,
                duration: message.duration,
              };
              setState("matched");
              setQueuePosition(null);
              setMatchResult(match);
              if (onMatchFoundRef.current) {
                onMatchFoundRef.current(match);
              }
              break;

            case "call_ended":
              console.log("[Matchmaking] Call ended by partner:", message.reason);
              const endReason = message.reason || "partner_ended";
              setState("idle");
              setCallEndedByPartner(endReason);
              if (onCallEndedRef.current) {
                onCallEndedRef.current(endReason);
              }
              break;

            case "error":
              console.error("[Matchmaking] Server error:", message.message);
              setError(message.message);
              setState("error");
              break;
              
            case "connection_replaced":
              // Another tab/device connected with this session - don't auto-reconnect
              console.log("[Matchmaking] Connection replaced by another connection");
              connectionReplacedRef.current = true;
              break;
          }
        } catch (err) {
          console.error("[Matchmaking] Failed to parse message:", err);
        }
      };

      ws.onerror = (event) => {
        console.error("[Matchmaking] WebSocket error:", event);
        setError("Connection error");
        setState("error");
      };

      ws.onclose = () => {
        console.log("[Matchmaking] Connection closed, state:", stateRef.current);
        wsRef.current = null;
        setIsConnected(false);
        
        // Don't auto-reconnect if this connection was intentionally replaced
        if (connectionReplacedRef.current) {
          console.log("[Matchmaking] Connection was replaced, not auto-reconnecting");
          connectionReplacedRef.current = false;
          return;
        }
        
        // Auto-reconnect if we were in queue or matched (call in progress)
        if (stateRef.current === "in_queue" || stateRef.current === "matched") {
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++;
            const delay = Math.min(1000 * reconnectAttemptsRef.current, 5000);
            console.log("[Matchmaking] Auto-reconnecting in", delay, "ms (attempt", reconnectAttemptsRef.current, ")");
            
            reconnectTimeoutRef.current = setTimeout(() => {
              if (stateRef.current === "in_queue" || stateRef.current === "matched") {
                connect();
              }
            }, delay);
          } else {
            console.log("[Matchmaking] Max reconnect attempts reached");
            setError("Connection lost. Please try again.");
            setState("error");
          }
        }
      };
    } catch (err: any) {
      console.error("[Matchmaking] Failed to create WebSocket:", err);
      setError(err.message || "Failed to connect");
      setState("error");
    }
  }, [sessionId, getWsUrl]);

  const joinQueue = useCallback((mood: string, cardId: string) => {
    console.log("[Matchmaking] Joining queue:", { mood, cardId });
    
    // Store queue info for auto-rejoin after reconnect
    currentQueueRef.current = { mood, cardId };
    reconnectAttemptsRef.current = 0;
    
    const sendJoinQueue = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log("[Matchmaking] Sending join_queue message");
        wsRef.current.send(JSON.stringify({
          type: "join_queue",
          mood,
          cardId,
          isPriority: false,
        }));
        setState("in_queue");
        return true;
      }
      return false;
    };
    
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.log("[Matchmaking] Not connected, connecting first...");
      setState("in_queue"); // Set state early so onopen can re-join
      connect();
      
      // Poll for connection with increasing delays (up to 5 seconds total)
      let attempts = 0;
      const maxAttempts = 10;
      const pollInterval = setInterval(() => {
        attempts++;
        console.log("[Matchmaking] Checking connection, attempt:", attempts);
        
        if (sendJoinQueue()) {
          clearInterval(pollInterval);
        } else if (attempts >= maxAttempts) {
          console.log("[Matchmaking] Failed to connect after max attempts");
          clearInterval(pollInterval);
          setState("error");
          setError("Failed to connect to matchmaking server");
          currentQueueRef.current = null;
        }
      }, 500);
      return;
    }

    sendJoinQueue();
  }, [connect]);

  const leaveQueue = useCallback(() => {
    console.log("[Matchmaking] Leaving queue");
    
    // Clear queue info to prevent auto-rejoin
    currentQueueRef.current = null;
    
    // Cancel any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "leave_queue" }));
    }
    setState("idle");
    setQueuePosition(null);
  }, []);

  const endCall = useCallback((reason?: string, remainingSeconds?: number) => {
    console.log("[Matchmaking] Ending call:", { reason, remainingSeconds });
    console.log("[Matchmaking] WebSocket state:", wsRef.current?.readyState, "OPEN =", WebSocket.OPEN);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log("[Matchmaking] Sending end_call message via WebSocket");
      wsRef.current.send(JSON.stringify({
        type: "end_call",
        reason: reason || "normal",
        remainingSeconds,
      }));
    } else {
      console.log("[Matchmaking] WARNING: WebSocket not open, cannot send end_call");
    }
    setState("idle");
  }, []);

  // Connect when sessionId is available
  useEffect(() => {
    if (sessionId) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [sessionId, connect]);

  // Send heartbeats while in queue (every 5 seconds)
  // This keeps our queue entry fresh and prevents being cleaned up as "stale"
  useEffect(() => {
    if (state !== "in_queue") {
      // Clear heartbeat when not in queue
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      return;
    }
    
    // Start heartbeat interval
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN && stateRef.current === "in_queue") {
        wsRef.current.send(JSON.stringify({ type: "heartbeat" }));
      }
    }, 5000); // Every 5 seconds
    
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [state]);

  // Poll for match while in queue (HTTP fallback for unreliable WebSocket on mobile)
  useEffect(() => {
    if (state !== "in_queue" || !sessionId) return;
    
    const checkMatchInterval = setInterval(async () => {
      if (stateRef.current !== "in_queue") return;
      
      // First try WebSocket if connected
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log("[Matchmaking] Polling via WebSocket...");
        wsRef.current.send(JSON.stringify({ type: "check_match" }));
      }
      
      // Also poll HTTP API as a fallback (more reliable on mobile)
      try {
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/api/sessions/${sessionId}/pending-match`);
        if (response.ok) {
          const data = await response.json();
          if (data.hasMatch && stateRef.current === "in_queue") {
            console.log("[Matchmaking] HTTP poll found match! callId:", data.callId);
            currentQueueRef.current = null;
            const match = {
              callId: data.callId,
              partnerId: data.partnerId,
              duration: data.duration,
            };
            setState("matched");
            setQueuePosition(null);
            setMatchResult(match);
            if (onMatchFoundRef.current) {
              onMatchFoundRef.current(match);
            }
          }
        }
      } catch (err) {
        console.log("[Matchmaking] HTTP poll error (will retry):", err);
      }
    }, 1000); // Check every 1 second for faster match detection
    
    return () => {
      clearInterval(checkMatchInterval);
    };
  }, [state, sessionId]);

  return {
    state,
    queuePosition,
    error,
    matchResult,
    clearMatchResult,
    callEndedByPartner,
    clearCallEnded,
    isConnected,
    joinQueue,
    leaveQueue,
    endCall,
  };
}
