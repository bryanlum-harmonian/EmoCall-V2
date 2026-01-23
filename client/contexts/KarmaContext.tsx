import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { apiRequest } from "@/lib/query-client";
import { useSession } from "./SessionContext";

export interface KarmaLevel {
  level: number;
  name: string;
  minKarma: number;
}

export const KARMA_LEVELS: KarmaLevel[] = [
  { level: 1, name: "New Soul", minKarma: 0 },
  { level: 2, name: "Kind Listener", minKarma: 50 },
  { level: 3, name: "Empathetic Soul", minKarma: 150 },
  { level: 4, name: "Trusted Companion", minKarma: 300 },
  { level: 5, name: "Guardian Angel", minKarma: 500 },
  { level: 6, name: "Heart of Gold", minKarma: 1000 },
];

export const KARMA_REWARDS = {
  COMPLETE_CALL: 10,
  EXTEND_CALL: 50,
  REPORTED: -25,
  CALL_MINUTE: 10,
};

interface KarmaContextType {
  karma: number;
  currentLevel: KarmaLevel;
  nextLevel: KarmaLevel | null;
  progressToNextLevel: number;
  addKarma: (amount: number) => void;
  removeKarma: (amount: number) => void;
  awardCallCompletion: () => Promise<void>;
  awardCallExtension: () => Promise<void>;
  awardCallMinute: () => Promise<void>;
  penalizeReport: () => void;
  syncWithBackend: () => Promise<void>;
}

const KarmaContext = createContext<KarmaContextType | undefined>(undefined);

function getKarmaLevel(karma: number): KarmaLevel {
  for (let i = KARMA_LEVELS.length - 1; i >= 0; i--) {
    if (karma >= KARMA_LEVELS[i].minKarma) {
      return KARMA_LEVELS[i];
    }
  }
  return KARMA_LEVELS[0];
}

function getNextLevel(currentLevel: KarmaLevel): KarmaLevel | null {
  const nextIndex = KARMA_LEVELS.findIndex((l) => l.level === currentLevel.level) + 1;
  return nextIndex < KARMA_LEVELS.length ? KARMA_LEVELS[nextIndex] : null;
}

function getProgressToNextLevel(karma: number, currentLevel: KarmaLevel, nextLevel: KarmaLevel | null): number {
  if (!nextLevel) return 100;
  const currentMin = currentLevel.minKarma;
  const nextMin = nextLevel.minKarma;
  const progress = ((karma - currentMin) / (nextMin - currentMin)) * 100;
  return Math.min(100, Math.max(0, progress));
}

export function KarmaProvider({ children }: { children: ReactNode }) {
  const { session, refreshSession } = useSession();
  const [karma, setKarma] = useState(0);

  useEffect(() => {
    if (session) {
      setKarma(session.karmaPoints);
    }
  }, [session]);

  const currentLevel = getKarmaLevel(karma);
  const nextLevel = getNextLevel(currentLevel);
  const progressToNextLevel = getProgressToNextLevel(karma, currentLevel, nextLevel);

  const syncWithBackend = useCallback(async () => {
    await refreshSession();
  }, [refreshSession]);

  const addKarma = useCallback((amount: number) => {
    setKarma((prev) => prev + amount);
  }, []);

  const removeKarma = useCallback((amount: number) => {
    setKarma((prev) => Math.max(0, prev - amount));
  }, []);

  const awardCallCompletion = useCallback(async () => {
    if (!session?.id) return;

    try {
      const response = await apiRequest("POST", `/api/sessions/${session.id}/karma/award`, {
        amount: KARMA_REWARDS.COMPLETE_CALL,
        type: "call_complete"
      });
      const data = await response.json();
      setKarma(data.karmaPoints);
    } catch (err) {
      console.error("Failed to award karma:", err);
      setKarma((prev) => prev + KARMA_REWARDS.COMPLETE_CALL);
    }
  }, [session?.id]);

  const awardCallExtension = useCallback(async () => {
    if (!session?.id) return;

    try {
      const response = await apiRequest("POST", `/api/sessions/${session.id}/karma/award`, {
        amount: KARMA_REWARDS.EXTEND_CALL,
        type: "call_extension"
      });
      const data = await response.json();
      setKarma(data.karmaPoints);
    } catch (err) {
      console.error("Failed to award karma:", err);
      setKarma((prev) => prev + KARMA_REWARDS.EXTEND_CALL);
    }
  }, [session?.id]);

  const awardCallMinute = useCallback(async () => {
    if (!session?.id) return;

    try {
      const response = await apiRequest("POST", `/api/sessions/${session.id}/karma/award`, {
        amount: KARMA_REWARDS.CALL_MINUTE,
        type: "call_minute"
      });
      const data = await response.json();
      setKarma(data.karmaPoints);
    } catch (err) {
      console.error("Failed to award karma:", err);
      setKarma((prev) => prev + KARMA_REWARDS.CALL_MINUTE);
    }
  }, [session?.id]);

  const penalizeReport = useCallback(() => {
    setKarma((prev) => Math.max(0, prev + KARMA_REWARDS.REPORTED));
  }, []);

  return (
    <KarmaContext.Provider
      value={{
        karma,
        currentLevel,
        nextLevel,
        progressToNextLevel,
        addKarma,
        removeKarma,
        awardCallCompletion,
        awardCallExtension,
        awardCallMinute,
        penalizeReport,
        syncWithBackend,
      }}
    >
      {children}
    </KarmaContext.Provider>
  );
}

export function useKarma() {
  const context = useContext(KarmaContext);
  if (context === undefined) {
    throw new Error("useKarma must be used within a KarmaProvider");
  }
  return context;
}
