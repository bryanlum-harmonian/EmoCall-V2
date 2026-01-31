import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { getApiUrl } from "@/lib/query-client";

type MatchmakingState = "idle" | "connecting" | "in_queue" | "matched" | "waiting_for_partner" | "call_started" | "error" | "banned";

interface MatchResult {
  callId: string;
  partnerId: string;
  duration: number;
  startedAt?: string;
}

interface BanInfo {
  bannedUntil: string;
  remainingMs: number;
  banCount: number;
}

interface MatchmakingContextType {
  state: MatchmakingState;
  isConnected: boolean;
  error: string | null;
  matchResult: MatchResult | null;
  callEndedByPartner: string | null;
  callStartedAt: string | null;
  queuePosition: number | null;
  banInfo: BanInfo | null;

  connect: (sessionId: string) => void;
  joinQueue: (mood: string, cardId: string) => void;
  leaveQueue: () => void;
  signalReady: (callId: string) => void;
  endCall: (reason?: string, remainingSeconds?: number) => void;
  clearMatchResult: () => void;
  clearCallEnded: () => void;
  clearBanned: () => void;
}

const MatchmakingContext = createContext<MatchmakingContextType | null>(null);

export function useMatchmakingContext() {
  const context = useContext(MatchmakingContext);
  if (!context) {
    throw new Error("useMatchmakingContext must be used within MatchmakingProvider");
  }
  return context;
}

interface MatchmakingProviderProps {
  children: ReactNode;
}

export function MatchmakingProvider({ children }: MatchmakingProviderProps) {
  const [state, setState] = useState<MatchmakingState>("idle");
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [callEndedByPartner, setCallEndedByPartner] = useState<string | null>(null);
  const [callStartedAt, setCallStartedAt] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [banInfo, setBanInfo] = useState<BanInfo | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const stateRef = useRef<MatchmakingState>("idle");
  const currentQueueRef = useRef<{ mood: string; cardId: string } | null>(null);
  const currentCallIdRef = useRef<string | null>(null);
  const pendingCallReadyRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;
  const connectionReplacedRef = useRef(false);
  const isConnectingRef = useRef(false);
  
  stateRef.current = state;

  const getWsUrl = useCallback(() => {
    const apiUrl = getApiUrl();
    const url = new URL(apiUrl);
    const wsProtocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.protocol = wsProtocol;
    url.pathname = "/ws";
    return url.toString();
  }, []);

  const doConnect = useCallback(() => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) {
      console.log("[MatchmakingContext] No sessionId, skipping connection");
      return;
    }

    if (isConnectingRef.current) {
      console.log("[MatchmakingContext] Already connecting");
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log("[MatchmakingContext] Already connected");
      return;
    }
    
    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      console.log("[MatchmakingContext] Connection in progress");
      return;
    }
    
    isConnectingRef.current = true;
    connectionReplacedRef.current = false;

    if (stateRef.current === "idle") {
      setState("connecting");
    }
    setError(null);

    const wsUrl = getWsUrl();
    console.log("[MatchmakingContext] Connecting to:", wsUrl);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[MatchmakingContext] Connected, registering session:", sessionId);
        isConnectingRef.current = false;
        ws.send(JSON.stringify({ type: "register", sessionId }));
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        
        // If we have a pending call_ready, send it
        if (pendingCallReadyRef.current) {
          const callId = pendingCallReadyRef.current;
          console.log("[MatchmakingContext] Sending pending call_ready for:", callId);
          ws.send(JSON.stringify({ type: "call_ready", callId }));
          pendingCallReadyRef.current = null;
        } 
        // If we're in matched/waiting_for_partner state and have a currentCallId, re-send call_ready
        // This handles the case where call_ready was sent but connection dropped before server received it
        else if ((stateRef.current === "matched" || stateRef.current === "waiting_for_partner") && currentCallIdRef.current) {
          const callId = currentCallIdRef.current;
          console.log("[MatchmakingContext] Reconnected in", stateRef.current, "state, re-sending call_ready for:", callId);
          ws.send(JSON.stringify({ type: "call_ready", callId }));
        }
        
        if (currentQueueRef.current && (stateRef.current === "in_queue" || stateRef.current === "connecting")) {
          console.log("[MatchmakingContext] Re-joining queue:", currentQueueRef.current);
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
          console.log("[MatchmakingContext] Received:", message.type, message);

          switch (message.type) {
            case "queue_position":
              setQueuePosition(message.position);
              setState("in_queue");
              break;

            case "waiting":
              console.log("[MatchmakingContext] Waiting for", message.mood === "vent" ? "listener" : "venter");
              setState("in_queue");
              setQueuePosition(null);
              break;

            case "match_found":
              console.log("[MatchmakingContext] Match found! callId:", message.callId);
              currentQueueRef.current = null;
              currentCallIdRef.current = message.callId;
              if (pendingCallReadyRef.current && pendingCallReadyRef.current !== message.callId) {
                pendingCallReadyRef.current = null;
              }
              const match = {
                callId: message.callId,
                partnerId: message.partnerId,
                duration: message.duration,
                startedAt: message.startedAt,
              };
              setState("matched");
              setQueuePosition(null);
              setMatchResult(match);
              break;

            case "call_ended":
              console.log("[MatchmakingContext] Call ended:", message.reason);
              currentCallIdRef.current = null;
              pendingCallReadyRef.current = null;
              setState("idle");
              setCallEndedByPartner(message.reason || "partner_ended");
              break;

            case "error":
              console.error("[MatchmakingContext] Server error:", message.message);
              setError(message.message);
              setState("error");
              break;
              
            case "connection_replaced":
              console.log("[MatchmakingContext] Connection replaced");
              connectionReplacedRef.current = true;
              break;
              
            case "waiting_for_partner":
              console.log("[MatchmakingContext] Waiting for partner ready");
              setState("waiting_for_partner");
              break;
              
            case "call_started":
              console.log("[MatchmakingContext] Call started!", message.startedAt);
              setState("call_started");
              setCallStartedAt(message.startedAt);
              break;
              
            case "heartbeat_ack":
              break;

            case "banned":
              console.log("[MatchmakingContext] User is banned:", message);
              currentQueueRef.current = null;
              setBanInfo({
                bannedUntil: message.bannedUntil,
                remainingMs: message.remainingMs,
                banCount: message.banCount,
              });
              setState("banned");
              break;
          }
        } catch (err) {
          console.error("[MatchmakingContext] Parse error:", err);
        }
      };

      ws.onerror = (event) => {
        console.error("[MatchmakingContext] WebSocket error:", event);
        isConnectingRef.current = false;
        setError("Connection error");
        if (stateRef.current === "connecting") {
          setState("error");
        }
      };

      ws.onclose = () => {
        console.log("[MatchmakingContext] Connection closed, state:", stateRef.current);
        wsRef.current = null;
        isConnectingRef.current = false;
        setIsConnected(false);
        
        if (connectionReplacedRef.current) {
          console.log("[MatchmakingContext] Connection replaced, not reconnecting");
          connectionReplacedRef.current = false;
          return;
        }
        
        const shouldReconnect = 
          stateRef.current === "in_queue" || 
          stateRef.current === "matched" ||
          stateRef.current === "waiting_for_partner" ||
          stateRef.current === "call_started";
          
        if (shouldReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * reconnectAttemptsRef.current, 5000);
          console.log("[MatchmakingContext] Reconnecting in", delay, "ms");
          
          reconnectTimeoutRef.current = setTimeout(() => {
            doConnect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setError("Connection lost. Please try again.");
          setState("error");
        }
      };
    } catch (err: any) {
      console.error("[MatchmakingContext] Create WebSocket failed:", err);
      isConnectingRef.current = false;
      setError(err.message || "Failed to connect");
      setState("error");
    }
  }, [getWsUrl]);

  const connect = useCallback((sessionId: string) => {
    console.log("[MatchmakingContext] connect called with sessionId:", sessionId);
    sessionIdRef.current = sessionId;
    doConnect();
  }, [doConnect]);

  const joinQueue = useCallback((mood: string, cardId: string) => {
    console.log("[MatchmakingContext] Joining queue:", { mood, cardId });
    
    currentQueueRef.current = { mood, cardId };
    reconnectAttemptsRef.current = 0;
    setState("in_queue");
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "join_queue",
        mood,
        cardId,
        isPriority: false,
      }));
    } else {
      doConnect();
    }
  }, [doConnect]);

  const leaveQueue = useCallback(() => {
    console.log("[MatchmakingContext] Leaving queue");
    
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

  const signalReady = useCallback((callId: string) => {
    console.log("[MatchmakingContext] Signaling ready for call:", callId);
    
    if (currentCallIdRef.current && currentCallIdRef.current !== callId) {
      console.log("[MatchmakingContext] Ignoring stale call_ready");
      return;
    }
    
    setState("waiting_for_partner");
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log("[MatchmakingContext] Sending call_ready");
      wsRef.current.send(JSON.stringify({ type: "call_ready", callId }));
    } else {
      console.log("[MatchmakingContext] WebSocket not ready, storing pending call_ready");
      pendingCallReadyRef.current = callId;
      doConnect();
    }
  }, [doConnect]);

  const endCall = useCallback((reason?: string, remainingSeconds?: number) => {
    console.log("[MatchmakingContext] Ending call:", { reason, remainingSeconds });
    
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

  const clearMatchResult = useCallback(() => {
    setMatchResult(null);
  }, []);

  const clearCallEnded = useCallback(() => {
    setCallEndedByPartner(null);
  }, []);

  const clearBanned = useCallback(() => {
    setBanInfo(null);
    setState("idle");
  }, []);

  // Heartbeat while in queue
  useEffect(() => {
    if (state !== "in_queue") {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      return;
    }

    // Send first heartbeat after a brief delay to ensure queue entry is created
    // This prevents race condition where heartbeat arrives before queue insertion
    const initialTimeout = setTimeout(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN && stateRef.current === "in_queue") {
        console.log("[MatchmakingContext] Sending initial heartbeat");
        wsRef.current.send(JSON.stringify({ type: "heartbeat" }));
      }
    }, 500);

    // Continue sending heartbeats every 5 seconds
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN && stateRef.current === "in_queue") {
        console.log("[MatchmakingContext] Sending heartbeat");
        wsRef.current.send(JSON.stringify({ type: "heartbeat" }));
      }
    }, 5000);

    return () => {
      clearTimeout(initialTimeout);
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [state]);

  // HTTP fallback polling while in queue
  useEffect(() => {
    const sessionId = sessionIdRef.current;
    if (state !== "in_queue" || !sessionId) return;
    
    const checkMatchInterval = setInterval(async () => {
      if (stateRef.current !== "in_queue") return;
      
      try {
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/api/sessions/${sessionId}/pending-match`);
        if (response.ok) {
          const data = await response.json();
          if (data.hasMatch && stateRef.current === "in_queue") {
            console.log("[MatchmakingContext] HTTP poll found match!");
            currentQueueRef.current = null;
            currentCallIdRef.current = data.callId;
            setState("matched");
            setQueuePosition(null);
            setMatchResult({
              callId: data.callId,
              partnerId: data.partnerId,
              duration: data.duration,
            });
          }
        }
      } catch (err) {
        // Silent fail
      }
    }, 2000);
    
    return () => {
      clearInterval(checkMatchInterval);
    };
  }, [state]);

  const value: MatchmakingContextType = {
    state,
    isConnected,
    error,
    matchResult,
    callEndedByPartner,
    callStartedAt,
    queuePosition,
    banInfo,
    connect,
    joinQueue,
    leaveQueue,
    signalReady,
    endCall,
    clearMatchResult,
    clearCallEnded,
    clearBanned,
  };

  return (
    <MatchmakingContext.Provider value={value}>
      {children}
    </MatchmakingContext.Provider>
  );
}
