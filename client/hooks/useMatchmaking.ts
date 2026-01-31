import { useEffect, useRef } from "react";
import { useMatchmakingContext } from "@/contexts/MatchmakingContext";

interface BanInfo {
  bannedUntil: string;
  remainingMs: number;
  banCount: number;
}

interface UseMatchmakingOptions {
  sessionId: string | null;
  onMatchFound?: (match: { callId: string; partnerId: string; duration: number; startedAt?: string }) => void;
  onCallEnded?: (reason: string) => void;
  onCallStarted?: (startedAt: string, duration: number) => void;
  onBanned?: (banInfo: BanInfo) => void;
}

export function useMatchmaking({ sessionId, onMatchFound, onCallEnded, onCallStarted, onBanned }: UseMatchmakingOptions) {
  const context = useMatchmakingContext();

  const onMatchFoundRef = useRef(onMatchFound);
  const onCallEndedRef = useRef(onCallEnded);
  const onCallStartedRef = useRef(onCallStarted);
  const onBannedRef = useRef(onBanned);
  const hasCalledMatchFoundRef = useRef(false);
  const hasCalledCallStartedRef = useRef(false);
  const hasCalledBannedRef = useRef(false);

  onMatchFoundRef.current = onMatchFound;
  onCallEndedRef.current = onCallEnded;
  onCallStartedRef.current = onCallStarted;
  onBannedRef.current = onBanned;

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

  // Call onBanned when user is banned
  useEffect(() => {
    if (context.banInfo && onBannedRef.current && !hasCalledBannedRef.current) {
      hasCalledBannedRef.current = true;
      onBannedRef.current(context.banInfo);
    }
    if (!context.banInfo) {
      hasCalledBannedRef.current = false;
    }
  }, [context.banInfo]);

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
    extendCall: context.extendCall,
    signalReady: context.signalReady,
    callStartedAt: context.callStartedAt,
    banInfo: context.banInfo,
    clearBanned: context.clearBanned,
    callExtended: context.callExtended,
    clearCallExtended: context.clearCallExtended,
  };
}
