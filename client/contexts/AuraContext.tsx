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
  COMPLETE_CALL: 10,
  EXTEND_CALL: 50,
  REPORTED: -25,
  CALL_MINUTE: 10,
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
  awardCallMinute: () => Promise<void>;
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

  const awardCallCompletion = useCallback(async () => {
    if (!session?.id) return;

    try {
      const response = await apiRequest("POST", `/api/sessions/${session.id}/aura/award`, {
        amount: AURA_REWARDS.COMPLETE_CALL,
        type: "call_complete"
      });
      const data = await response.json();
      setAura(data.auraPoints ?? data.karmaPoints);
    } catch (err) {
      console.error("Failed to award aura:", err);
      setAura((prev) => prev + AURA_REWARDS.COMPLETE_CALL);
    }
  }, [session?.id]);

  const awardCallExtension = useCallback(async () => {
    if (!session?.id) return;

    try {
      const response = await apiRequest("POST", `/api/sessions/${session.id}/aura/award`, {
        amount: AURA_REWARDS.EXTEND_CALL,
        type: "call_extension"
      });
      const data = await response.json();
      setAura(data.auraPoints ?? data.karmaPoints);
    } catch (err) {
      console.error("Failed to award aura:", err);
      setAura((prev) => prev + AURA_REWARDS.EXTEND_CALL);
    }
  }, [session?.id]);

  const awardCallMinute = useCallback(async () => {
    if (!session?.id) return;

    try {
      const response = await apiRequest("POST", `/api/sessions/${session.id}/aura/award`, {
        amount: AURA_REWARDS.CALL_MINUTE,
        type: "call_minute"
      });
      const data = await response.json();
      setAura(data.auraPoints ?? data.karmaPoints);
    } catch (err) {
      console.error("Failed to award aura:", err);
      setAura((prev) => prev + AURA_REWARDS.CALL_MINUTE);
    }
  }, [session?.id]);

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
        awardCallMinute,
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
