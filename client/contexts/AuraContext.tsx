import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from "react";
import { apiRequest } from "@/lib/query-client";
import { useSession } from "./SessionContext";

export interface AuraLevel {
  level: number;
  name: string;
  minAura: number;
}

// New users start at 1000 aura, so levels begin there
export const AURA_LEVELS: AuraLevel[] = [
  { level: 1, name: "New Soul", minAura: 1000 },           // Starting level
  { level: 2, name: "Kind Listener", minAura: 2000 },     // +1000
  { level: 3, name: "Empathetic Soul", minAura: 3500 },   // +1500
  { level: 4, name: "Trusted Companion", minAura: 5500 }, // +2000
  { level: 5, name: "Guardian Angel", minAura: 8000 },    // +2500
  { level: 6, name: "Heart of Gold", minAura: 12000 },    // +4000
  { level: 7, name: "Radiant Spirit", minAura: 18000 },   // +6000
  { level: 8, name: "Celestial Guide", minAura: 26000 },  // +8000
  { level: 9, name: "Eternal Light", minAura: 36000 },    // +10000
  { level: 10, name: "Aura Legend", minAura: 50000 },     // +14000 (max level)
];

export const AURA_REWARDS = {
  CALL_SECOND: 1, // +1 per second during call (real-time)
  COMPLETE_CALL_60MIN: 100, // +100 for completing a 60-minute call
  EXTEND_CALL_30MIN: 50, // +50 for 30-minute extension
  EXTEND_CALL_5_29MIN: 20, // +20 for 5-29 minute extension
  REPORTED: -500, // -500 for being reported
};

interface AuraContextType {
  aura: number;
  currentLevel: AuraLevel;
  nextLevel: AuraLevel | null;
  progressToNextLevel: number;
  addAura: (amount: number) => void;
  removeAura: (amount: number) => void;
  awardCallCompletion: () => Promise<void>;
  awardCallExtension: () => Promise<void>;
  awardCallSecond: () => void;
  penalizeReport: () => void;
  syncWithBackend: () => Promise<void>;
}

const AuraContext = createContext<AuraContextType | undefined>(undefined);

function getAuraLevel(aura: number): AuraLevel {
  for (let i = AURA_LEVELS.length - 1; i >= 0; i--) {
    if (aura >= AURA_LEVELS[i].minAura) {
      return AURA_LEVELS[i];
    }
  }
  return AURA_LEVELS[0];
}

function getNextLevel(currentLevel: AuraLevel): AuraLevel | null {
  const nextIndex = AURA_LEVELS.findIndex((l) => l.level === currentLevel.level) + 1;
  return nextIndex < AURA_LEVELS.length ? AURA_LEVELS[nextIndex] : null;
}

function getProgressToNextLevel(aura: number, currentLevel: AuraLevel, nextLevel: AuraLevel | null): number {
  if (!nextLevel) return 100;
  const currentMin = currentLevel.minAura;
  const nextMin = nextLevel.minAura;
  const progress = ((aura - currentMin) / (nextMin - currentMin)) * 100;
  return Math.min(100, Math.max(0, progress));
}

export function AuraProvider({ children }: { children: ReactNode }) {
  const { session, refreshSession } = useSession();
  const [aura, setAura] = useState(0);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    // Only sync from session on initial load, not on every session change
    // This prevents overwriting locally incremented aura during calls
    if (session && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      const sessionAura = (session as any).auraPoints ?? (session as any).karmaPoints ?? 0;
      console.log("[Aura] Initial sync from session:", sessionAura);
      setAura(sessionAura);
    }
  }, [session]);

  const currentLevel = getAuraLevel(aura);
  const nextLevel = getNextLevel(currentLevel);
  const progressToNextLevel = getProgressToNextLevel(aura, currentLevel, nextLevel);

  const syncWithBackend = useCallback(async () => {
    const updatedSession = await refreshSession();
    if (updatedSession) {
      const serverAura = (updatedSession as any).auraPoints ?? (updatedSession as any).karmaPoints ?? 0;
      console.log("[Aura] Synced with backend:", serverAura);
      setAura(serverAura);
    }
  }, [refreshSession]);

  const addAura = useCallback((amount: number) => {
    setAura((prev) => prev + amount);
  }, []);

  const removeAura = useCallback((amount: number) => {
    setAura((prev) => Math.max(0, prev - amount));
  }, []);

  // Note: Server now handles aura awards automatically during call events
  // These functions are kept for backwards compatibility but may not be needed
  const awardCallCompletion = useCallback(async () => {
    if (!session?.id) return;

    try {
      const response = await apiRequest("POST", `/api/sessions/${session.id}/aura/award`, {
        amount: AURA_REWARDS.COMPLETE_CALL_60MIN,
        type: "call_complete_60min"
      });
      const data = await response.json();
      setAura(data.auraPoints ?? data.karmaPoints);
    } catch (err) {
      console.error("Failed to award aura:", err);
      setAura((prev) => prev + AURA_REWARDS.COMPLETE_CALL_60MIN);
    }
  }, [session?.id]);

  const awardCallExtension = useCallback(async () => {
    if (!session?.id) return;

    try {
      const response = await apiRequest("POST", `/api/sessions/${session.id}/aura/award`, {
        amount: AURA_REWARDS.EXTEND_CALL_30MIN,
        type: "call_extension"
      });
      const data = await response.json();
      setAura(data.auraPoints ?? data.karmaPoints);
    } catch (err) {
      console.error("Failed to award aura:", err);
      setAura((prev) => prev + AURA_REWARDS.EXTEND_CALL_30MIN);
    }
  }, [session?.id]);

  // Per-second aura is handled by the server via WebSocket
  // This function just updates the local UI state without making API calls
  const awardCallSecond = useCallback(() => {
    setAura((prev) => {
      const newAura = prev + AURA_REWARDS.CALL_SECOND;
      console.log("[Aura] Incrementing aura:", prev, "->", newAura);
      return newAura;
    });
  }, []);

  const penalizeReport = useCallback(() => {
    setAura((prev) => Math.max(0, prev + AURA_REWARDS.REPORTED));
  }, []);

  return (
    <AuraContext.Provider
      value={{
        aura,
        currentLevel,
        nextLevel,
        progressToNextLevel,
        addAura,
        removeAura,
        awardCallCompletion,
        awardCallExtension,
        awardCallSecond,
        penalizeReport,
        syncWithBackend,
      }}
    >
      {children}
    </AuraContext.Provider>
  );
}

export function useAura() {
  const context = useContext(AuraContext);
  if (context === undefined) {
    throw new Error("useAura must be used within an AuraProvider");
  }
  return context;
}
