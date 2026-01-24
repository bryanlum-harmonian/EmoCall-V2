import { useState, useEffect, useRef, useCallback } from "react";
import { getApiUrl } from "@/lib/query-client";

type MatchmakingState = "idle" | "connecting" | "in_queue" | "matched" | "waiting_for_partner" | "call_started" | "error";

interface MatchResult {
  callId: string;
  partnerId: string;
  duration: number;
  startedAt?: string;
}

interface UseMatchmakingOptions {
  sessionId: string | null;
  onMatchFound?: (match: MatchResult) => void;
  onCallEnded?: (reason: string) => void;
  onCallStarted?: (startedAt: string, duration: number) => void;
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
  signalReady: (callId: string) => void;
  callStartedAt: string | null;
}

export function useMatchmaking({ sessionId, onMatchFound, onCallEnded, onCallStarted }: UseMatchmakingOptions): UseMatchmakingReturn {
  const [state, setState] = useState<MatchmakingState>("idle");
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [callEndedByPartner, setCallEndedByPartner] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [callStartedAt, setCallStartedAt] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stateRef = useRef<MatchmakingState>("idle");
  const onMatchFoundRef = useRef(onMatchFound);
  const onCallEndedRef = useRef(onCallEnded);
  const onCallStartedRef = useRef(onCallStarted);
  const sessionIdRef = useRef(sessionId);
  const currentQueueRef = useRef<{ mood: string; cardId: string } | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionReplacedRef = useRef(false);
  const pendingCallReadyRef = useRef<string | null>(null);
  const currentCallIdRef = useRef<string | null>(null);
  const isConnectingRef = useRef(false);
  
  // Keep refs in sync
  stateRef.current = state;
  sessionIdRef.current = sessionId;
  onMatchFoundRef.current = onMatchFound;
  onCallEndedRef.current = onCallEnded;
  onCallStartedRef.current = onCallStarted;
  
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
    return url.toString();
  }, []);

  // Core connect function - stored in ref to avoid effect dependency issues
  const connectRef = useRef<(() => void) | undefined>(undefined);
  
  connectRef.current = () => {
    const currentSessionId = sessionIdRef.current;
    if (!currentSessionId) {
      console.log("[Matchmaking] No sessionId, skipping connection");
      return;
    }

    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current) {
      console.log("[Matchmaking] Already connecting, skipping");
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log("[Matchmaking] Already connected");
      return;
    }
    
    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      console.log("[Matchmaking] Connection in progress, skipping");
      return;
    }
    
    isConnectingRef.current = true;
    connectionReplacedRef.current = false;

    if (stateRef.current === "idle") {
      setState("connecting");
    }
    setError(null);

    const wsUrl = getWsUrl();
    console.log("[Matchmaking] Connecting to:", wsUrl);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[Matchmaking] Connected, registering session:", currentSessionId);
        isConnectingRef.current = false;
        ws.send(JSON.stringify({ type: "register", sessionId: currentSessionId }));
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        
        // If there's a pending call_ready, send it
        if (pendingCallReadyRef.current) {
          const callId = pendingCallReadyRef.current;
          console.log("[Matchmaking] Sending pending call_ready for call:", callId);
          ws.send(JSON.stringify({ type: "call_ready", callId }));
          pendingCallReadyRef.current = null;
        }
        
        // If we were in queue, re-join automatically
        if (currentQueueRef.current && (stateRef.current === "in_queue" || stateRef.current === "connecting")) {
          console.log("[Matchmaking] Re-joining queue after reconnect:", currentQueueRef.current);
          ws.send(JSON.stringify({
            type: "join_queue",
            mood: currentQueueRef.current.mood,
            cardId: currentQueueRef.current.cardId,
            isPriority: false,
          }));
        } else if (stateRef.current === "connecting") {
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
              console.log("[Matchmaking] Waiting for", message.mood === "vent" ? "listener" : "venter");
              setState("in_queue");
              setQueuePosition(null);
              break;

            case "match_found":
              console.log("[Matchmaking] Match found! callId:", message.callId);
              currentQueueRef.current = null;
              if (pendingCallReadyRef.current && pendingCallReadyRef.current !== message.callId) {
                console.log("[Matchmaking] Clearing stale pending call_ready");
                pendingCallReadyRef.current = null;
              }
              currentCallIdRef.current = message.callId;
              const match = {
                callId: message.callId,
                partnerId: message.partnerId,
                duration: message.duration,
                startedAt: message.startedAt,
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
              currentCallIdRef.current = null;
              pendingCallReadyRef.current = null;
              setState("idle");
              setCallEndedByPartner(message.reason || "partner_ended");
              if (onCallEndedRef.current) {
                onCallEndedRef.current(message.reason || "partner_ended");
              }
              break;

            case "error":
              console.error("[Matchmaking] Server error:", message.message);
              setError(message.message);
              setState("error");
              break;
              
            case "connection_replaced":
              console.log("[Matchmaking] Connection replaced by another connection");
              connectionReplacedRef.current = true;
              break;
              
            case "waiting_for_partner":
              console.log("[Matchmaking] Waiting for partner to be ready");
              setState("waiting_for_partner");
              break;
              
            case "call_started":
              console.log("[Matchmaking] Call started! startedAt:", message.startedAt);
              setState("call_started");
              setCallStartedAt(message.startedAt);
              if (onCallStartedRef.current) {
                onCallStartedRef.current(message.startedAt, message.duration);
              }
              break;
              
            case "heartbeat_ack":
              break;
          }
        } catch (err) {
          console.error("[Matchmaking] Failed to parse message:", err);
        }
      };

      ws.onerror = (event) => {
        console.error("[Matchmaking] WebSocket error:", event);
        isConnectingRef.current = false;
        setError("Connection error");
        if (stateRef.current === "connecting") {
          setState("error");
        }
      };

      ws.onclose = () => {
        console.log("[Matchmaking] Connection closed, state:", stateRef.current);
        wsRef.current = null;
        isConnectingRef.current = false;
        setIsConnected(false);
        
        // Don't auto-reconnect if this connection was replaced
        if (connectionReplacedRef.current) {
          console.log("[Matchmaking] Connection was replaced, not auto-reconnecting");
          connectionReplacedRef.current = false;
          return;
        }
        
        // Auto-reconnect if we should maintain connection
        const shouldReconnect = 
          stateRef.current === "in_queue" || 
          stateRef.current === "matched" ||
          stateRef.current === "waiting_for_partner" ||
          stateRef.current === "call_started";
          
        if (shouldReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * reconnectAttemptsRef.current, 5000);
          console.log("[Matchmaking] Auto-reconnecting in", delay, "ms (attempt", reconnectAttemptsRef.current, ")");
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (connectRef.current) {
              connectRef.current();
            }
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.log("[Matchmaking] Max reconnect attempts reached");
          setError("Connection lost. Please try again.");
          setState("error");
        }
      };
    } catch (err: any) {
      console.error("[Matchmaking] Failed to create WebSocket:", err);
      isConnectingRef.current = false;
      setError(err.message || "Failed to connect");
      setState("error");
    }
  };

  const joinQueue = useCallback((mood: string, cardId: string) => {
    console.log("[Matchmaking] Joining queue:", { mood, cardId });
    
    currentQueueRef.current = { mood, cardId };
    reconnectAttemptsRef.current = 0;
    setState("in_queue");
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log("[Matchmaking] Sending join_queue message");
      wsRef.current.send(JSON.stringify({
        type: "join_queue",
        mood,
        cardId,
        isPriority: false,
      }));
    } else {
      console.log("[Matchmaking] Not connected, connecting first...");
      if (connectRef.current) {
        connectRef.current();
      }
    }
  }, []);

  const leaveQueue = useCallback(() => {
    console.log("[Matchmaking] Leaving queue");
    
    currentQueueRef.current = null;
    currentCallIdRef.current = null;
    pendingCallReadyRef.current = null;
    
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
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "end_call",
        reason: reason || "normal",
        remainingSeconds,
      }));
    }
    
    currentCallIdRef.current = null;
    pendingCallReadyRef.current = null;
    setState("idle");
    setCallStartedAt(null);
  }, []);
  
  const signalReady = useCallback((callId: string) => {
    console.log("[Matchmaking] Signaling ready for call:", callId);
    
    // Only signal for the current active call
    if (currentCallIdRef.current && currentCallIdRef.current !== callId) {
      console.log("[Matchmaking] Ignoring stale call_ready for:", callId, "current call:", currentCallIdRef.current);
      return;
    }
    
    setState("waiting_for_partner");
    
    const sendReadySignal = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log("[Matchmaking] Sending call_ready message for call:", callId);
        wsRef.current.send(JSON.stringify({ type: "call_ready", callId }));
        return true;
      }
      return false;
    };
    
    if (!sendReadySignal()) {
      console.log("[Matchmaking] WebSocket not ready, storing pending call_ready for:", callId);
      pendingCallReadyRef.current = callId;
      
      if (connectRef.current) {
        connectRef.current();
      }
      
      let attempts = 0;
      const maxAttempts = 10;
      const pollInterval = setInterval(() => {
        attempts++;
        console.log("[Matchmaking] Checking connection for call_ready, attempt:", attempts);
        
        if (sendReadySignal()) {
          pendingCallReadyRef.current = null;
          clearInterval(pollInterval);
        } else if (attempts >= maxAttempts) {
          console.log("[Matchmaking] Failed to send call_ready after max attempts");
          clearInterval(pollInterval);
        }
      }, 500);
    }
  }, []);

  // Connect on mount when sessionId is available - only once per sessionId
  useEffect(() => {
    if (sessionId && connectRef.current) {
      connectRef.current();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [sessionId]); // Only sessionId - not connect function

  // Heartbeat while in queue
  useEffect(() => {
    if (state !== "in_queue") {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      return;
    }
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN && stateRef.current === "in_queue") {
        wsRef.current.send(JSON.stringify({ type: "heartbeat" }));
      }
    }, 5000);
    
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [state]);

  // HTTP fallback polling while in queue
  useEffect(() => {
    if (state !== "in_queue" || !sessionId) return;
    
    const checkMatchInterval = setInterval(async () => {
      if (stateRef.current !== "in_queue") return;
      
      try {
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/api/sessions/${sessionId}/pending-match`);
        if (response.ok) {
          const data = await response.json();
          if (data.hasMatch && stateRef.current === "in_queue") {
            console.log("[Matchmaking] HTTP poll found match! callId:", data.callId);
            currentQueueRef.current = null;
            currentCallIdRef.current = data.callId;
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
        // Silent fail - will retry
      }
    }, 2000);
    
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
    signalReady,
    callStartedAt,
  };
}
