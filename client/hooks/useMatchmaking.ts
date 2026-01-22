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
  joinQueue: (mood: string, cardId: string) => void;
  leaveQueue: () => void;
  endCall: (reason?: string, remainingSeconds?: number) => void;
}

export function useMatchmaking({ sessionId, onMatchFound, onCallEnded }: UseMatchmakingOptions): UseMatchmakingReturn {
  const [state, setState] = useState<MatchmakingState>("idle");
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stateRef = useRef<MatchmakingState>("idle");
  const onMatchFoundRef = useRef(onMatchFound);
  const onCallEndedRef = useRef(onCallEnded);
  
  // Keep refs in sync with latest values
  stateRef.current = state;
  onMatchFoundRef.current = onMatchFound;
  onCallEndedRef.current = onCallEnded;

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
              setState("matched");
              setQueuePosition(null);
              if (onMatchFoundRef.current) {
                onMatchFoundRef.current({
                  callId: message.callId,
                  partnerId: message.partnerId,
                  duration: message.duration,
                });
              }
              break;

            case "call_ended":
              console.log("[Matchmaking] Call ended by partner:", message.reason);
              setState("idle");
              if (onCallEndedRef.current) {
                onCallEndedRef.current(message.reason || "partner_ended");
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
    
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.log("[Matchmaking] Not connected, connecting first...");
      connect();
      // Retry after connection
      setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: "join_queue",
            mood,
            cardId,
            isPriority: false,
          }));
          setState("in_queue");
        }
      }, 1000);
      return;
    }

    wsRef.current.send(JSON.stringify({
      type: "join_queue",
      mood,
      cardId,
      isPriority: false,
    }));
    setState("in_queue");
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
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "end_call",
        reason: reason || "normal",
        remainingSeconds,
      }));
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

  return {
    state,
    queuePosition,
    error,
    joinQueue,
    leaveQueue,
    endCall,
  };
}
