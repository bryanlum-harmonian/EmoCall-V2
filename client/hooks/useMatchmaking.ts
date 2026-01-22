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
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stateRef = useRef<MatchmakingState>("idle");
  const onMatchFoundRef = useRef(onMatchFound);
  const onCallEndedRef = useRef(onCallEnded);
  
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
        setState("idle");
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

            case "match_found":
              console.log("[Matchmaking] Match found! callId:", message.callId);
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
        console.log("[Matchmaking] Connection closed");
        wsRef.current = null;
        
        // Don't auto-reconnect - let joinQueue handle it
      };
    } catch (err: any) {
      console.error("[Matchmaking] Failed to create WebSocket:", err);
      setError(err.message || "Failed to connect");
      setState("error");
    }
  }, [sessionId, getWsUrl]);

  const joinQueue = useCallback((mood: string, cardId: string) => {
    console.log("[Matchmaking] Joining queue:", { mood, cardId });
    
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
        }
      }, 500);
      return;
    }

    sendJoinQueue();
  }, [connect]);

  const leaveQueue = useCallback(() => {
    console.log("[Matchmaking] Leaving queue");
    
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
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [sessionId, connect]);

  // Poll for match while in queue (fallback for WebSocket message delivery issues)
  useEffect(() => {
    if (state !== "in_queue") return;
    
    const checkMatchInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN && stateRef.current === "in_queue") {
        console.log("[Matchmaking] Polling for match...");
        wsRef.current.send(JSON.stringify({ type: "check_match" }));
      }
    }, 3000); // Check every 3 seconds
    
    return () => {
      clearInterval(checkMatchInterval);
    };
  }, [state]);

  return {
    state,
    queuePosition,
    error,
    matchResult,
    clearMatchResult,
    callEndedByPartner,
    clearCallEnded,
    joinQueue,
    leaveQueue,
    endCall,
  };
}
