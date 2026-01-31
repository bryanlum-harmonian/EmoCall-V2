import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { apiRequest } from "@/lib/query-client";
import { useSession } from "./SessionContext";

export interface AuraLevel {
  level: number;
  name: string;
  minAura: number;
}

export const AURA_LEVELS: AuraLevel[] = [
  { level: 1, name: "New Soul", minAura: 0 },
  { level: 2, name: "Kind Listener", minAura: 50 },
  { level: 3, name: "Empathetic Soul", minAura: 150 },
  { level: 4, name: "Trusted Companion", minAura: 300 },
  { level: 5, name: "Guardian Angel", minAura: 500 },
  { level: 6, name: "Heart of Gold", minAura: 1000 },
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

  useEffect(() => {
    if (session) {
      // Use auraPoints (new) with fallback to karmaPoints (legacy) for compatibility
      setAura((session as any).auraPoints ?? (session as any).karmaPoints ?? 0);
    }
  }, [session]);

  const currentLevel = getAuraLevel(aura);
  const nextLevel = getNextLevel(currentLevel);
  const progressToNextLevel = getProgressToNextLevel(aura, currentLevel, nextLevel);

  const syncWithBackend = useCallback(async () => {
    await refreshSession();
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
    setAura((prev) => prev + AURA_REWARDS.CALL_SECOND);
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
