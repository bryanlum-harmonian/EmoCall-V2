import { useEffect, useRef } from "react";
import { useMatchmakingContext } from "@/contexts/MatchmakingContext";

interface UseMatchmakingOptions {
  sessionId: string | null;
  onMatchFound?: (match: { callId: string; partnerId: string; duration: number; startedAt?: string }) => void;
  onCallEnded?: (reason: string) => void;
  onCallStarted?: (startedAt: string, duration: number) => void;
}

export function useMatchmaking({ sessionId, onMatchFound, onCallEnded, onCallStarted }: UseMatchmakingOptions) {
  const context = useMatchmakingContext();
  
  const onMatchFoundRef = useRef(onMatchFound);
  const onCallEndedRef = useRef(onCallEnded);
  const onCallStartedRef = useRef(onCallStarted);
  const hasCalledMatchFoundRef = useRef(false);
  const hasCalledCallStartedRef = useRef(false);
  
  onMatchFoundRef.current = onMatchFound;
  onCallEndedRef.current = onCallEnded;
  onCallStartedRef.current = onCallStarted;

  // Connect when sessionId is available
  useEffect(() => {
    if (sessionId) {
      context.connect(sessionId);
    }
  }, [sessionId, context.connect]);

  // Call onMatchFound when match is found
  useEffect(() => {
    if (context.matchResult && onMatchFoundRef.current && !hasCalledMatchFoundRef.current) {
      hasCalledMatchFoundRef.current = true;
      onMatchFoundRef.current(context.matchResult);
    }
    if (!context.matchResult) {
      hasCalledMatchFoundRef.current = false;
    }
  }, [context.matchResult]);

  // Call onCallEnded when call ends
  useEffect(() => {
    if (context.callEndedByPartner && onCallEndedRef.current) {
      onCallEndedRef.current(context.callEndedByPartner);
    }
  }, [context.callEndedByPartner]);

  // Call onCallStarted when call starts
  useEffect(() => {
    if (context.callStartedAt && onCallStartedRef.current && !hasCalledCallStartedRef.current) {
      hasCalledCallStartedRef.current = true;
      onCallStartedRef.current(context.callStartedAt, 300); // Default 5 minutes
    }
    if (!context.callStartedAt) {
      hasCalledCallStartedRef.current = false;
    }
  }, [context.callStartedAt]);

  return {
    state: context.state,
    queuePosition: context.queuePosition,
    error: context.error,
    matchResult: context.matchResult,
    clearMatchResult: context.clearMatchResult,
    callEndedByPartner: context.callEndedByPartner,
    clearCallEnded: context.clearCallEnded,
    isConnected: context.isConnected,
    joinQueue: context.joinQueue,
    leaveQueue: context.leaveQueue,
    endCall: context.endCall,
    signalReady: context.signalReady,
    callStartedAt: context.callStartedAt,
  };
}
