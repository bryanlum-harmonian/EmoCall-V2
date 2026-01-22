import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { apiRequest } from "@/lib/query-client";
import { useSession } from "./SessionContext";

export interface CreditPackage {
  id: string;
  amount: number;
  price: number;
  label: string;
  name: string;
  bonus?: number;
}

export interface CallExtension {
  id: string;
  minutes: number;
  cost: number;
  label: string;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: "starter", amount: 250, price: 0.99, label: "$0.99", name: "Starter Pack" },
  { id: "weekender", amount: 1500, price: 4.99, label: "$4.99", name: "Weekender Pack" },
  { id: "power_user", amount: 3500, price: 9.99, label: "$9.99", name: "Power User Pack" },
];

export const CALL_EXTENSIONS: CallExtension[] = [
  { id: "ext-10", minutes: 10, cost: 100, label: "+10 min" },
  { id: "ext-20", minutes: 20, cost: 180, label: "+20 min" },
  { id: "ext-30", minutes: 30, cost: 250, label: "+30 min" },
  { id: "ext-60", minutes: 60, cost: 450, label: "+60 min" },
];

export const REFRESH_CARDS_COST = 100;
export const DAILY_MATCHES_REFILL_COST = 100;
export const PREMIUM_MONTHLY_PRICE = 10;
export const PREMIUM_BONUS_CREDITS = 200;

interface CreditsContextType {
  credits: number;
  priorityTokens: number;
  isPremium: boolean;
  preferredGender: "any" | "male" | "female";
  dailyMatchesLeft: number;
  isLoading: boolean;
  addCredits: (amount: number) => void;
  spendCredits: (amount: number) => boolean;
  refundCredits: (amount: number) => void;
  addPriorityTokens: (amount: number) => void;
  purchasePackage: (packageId: string) => Promise<boolean>;
  refreshCards: () => Promise<boolean>;
  purchaseCallExtension: (extensionId: string) => { success: boolean; minutes: number };
  refundUnusedMinutes: (unusedMinutes: number, extensionId: string) => void;
  setPremium: (value: boolean) => Promise<void>;
  setPreferredGender: (gender: "any" | "male" | "female") => Promise<void>;
  useMatch: () => Promise<boolean>;
  refillMatches: () => Promise<boolean>;
  syncWithBackend: () => Promise<void>;
}

const CreditsContext = createContext<CreditsContextType | undefined>(undefined);

const MAX_DAILY_MATCHES = 10;

export function CreditsProvider({ children }: { children: ReactNode }) {
  const { session, refreshSession } = useSession();
  const [credits, setCredits] = useState(0);
  const [priorityTokens, setPriorityTokens] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [preferredGender, setPreferredGenderState] = useState<"any" | "male" | "female">("any");
  const [dailyMatchesLeft, setDailyMatchesLeft] = useState(MAX_DAILY_MATCHES);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (session) {
      setCredits(session.credits);
      setPriorityTokens(Math.floor((session.timeBankMinutes || 0) * 10));
      setIsPremium(session.isPremium);
      setDailyMatchesLeft(session.dailyMatchesLeft);
      if (session.genderPreference) {
        setPreferredGenderState(session.genderPreference as "any" | "male" | "female");
      }
    }
  }, [session]);

  const syncWithBackend = useCallback(async () => {
    await refreshSession();
  }, [refreshSession]);

  const addCredits = useCallback((amount: number) => {
    setCredits((prev) => prev + amount);
  }, []);

  const spendCredits = useCallback((amount: number): boolean => {
    if (credits >= amount) {
      setCredits((prev) => prev - amount);
      return true;
    }
    return false;
  }, [credits]);

  const refundCredits = useCallback((amount: number) => {
    setCredits((prev) => prev + amount);
  }, []);

  const addPriorityTokens = useCallback((amount: number) => {
    setPriorityTokens((prev) => prev + amount);
  }, []);

  const purchasePackage = useCallback(async (packageId: string): Promise<boolean> => {
    if (!session?.id) return false;

    try {
      setIsLoading(true);
      const response = await apiRequest("POST", `/api/sessions/${session.id}/credits/purchase`, { packageId });
      const data = await response.json();
      setCredits(data.credits);
      return true;
    } catch (err) {
      console.error("Failed to purchase package:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [session?.id]);

  const refreshCards = useCallback(async (): Promise<boolean> => {
    if (!session?.id) return false;

    try {
      setIsLoading(true);
      const response = await apiRequest("POST", `/api/sessions/${session.id}/credits/shuffle`, {});
      const data = await response.json();
      setCredits(data.credits);
      return true;
    } catch (err) {
      console.error("Failed to refresh cards:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [session?.id]);

  const purchaseCallExtension = useCallback((extensionId: string): { success: boolean; minutes: number } => {
    const ext = CALL_EXTENSIONS.find((e) => e.id === extensionId);
    if (ext && credits >= ext.cost) {
      setCredits((prev) => prev - ext.cost);
      return { success: true, minutes: ext.minutes };
    }
    return { success: false, minutes: 0 };
  }, [credits]);

  const refundUnusedMinutes = useCallback((unusedMinutes: number, extensionId: string) => {
    const ext = CALL_EXTENSIONS.find((e) => e.id === extensionId);
    if (ext && unusedMinutes > 0) {
      const costPerMinute = ext.cost / ext.minutes;
      const refundAmount = Math.floor(unusedMinutes * costPerMinute);
      if (refundAmount > 0) {
        setPriorityTokens((prev) => prev + refundAmount);
      }
    }
  }, []);

  const setPremium = useCallback(async (value: boolean): Promise<void> => {
    if (!session?.id) return;

    if (value) {
      try {
        setIsLoading(true);
        const response = await apiRequest("POST", `/api/sessions/${session.id}/premium/activate`, {});
        const data = await response.json();
        setIsPremium(true);
        setCredits(data.credits);
      } catch (err) {
        console.error("Failed to activate premium:", err);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsPremium(false);
    }
  }, [session?.id]);

  const setPreferredGender = useCallback(async (gender: "any" | "male" | "female"): Promise<void> => {
    if (!session?.id) return;

    try {
      await apiRequest("POST", `/api/sessions/${session.id}/preferences/gender`, { genderPreference: gender });
      setPreferredGenderState(gender);
    } catch (err) {
      console.error("Failed to set gender preference:", err);
    }
  }, [session?.id]);

  const useMatch = useCallback(async (): Promise<boolean> => {
    if (!session?.id) return false;

    try {
      const response = await apiRequest("POST", `/api/sessions/${session.id}/matches/use`, {});
      const data = await response.json();
      setDailyMatchesLeft(data.dailyMatchesLeft);
      return true;
    } catch (err) {
      console.error("Failed to use match:", err);
      return false;
    }
  }, [session?.id]);

  const refillMatches = useCallback(async (): Promise<boolean> => {
    if (!session?.id) return false;

    if (credits < DAILY_MATCHES_REFILL_COST) {
      console.log("Not enough credits to refill matches");
      return false;
    }

    try {
      setIsLoading(true);
      const response = await apiRequest("POST", `/api/sessions/${session.id}/matches/refill`, {});
      const data = await response.json();
      setDailyMatchesLeft(data.dailyMatchesLeft);
      setCredits(data.credits);
      return true;
    } catch (err) {
      console.error("Failed to refill matches:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [session?.id, credits]);

  return (
    <CreditsContext.Provider
      value={{
        credits,
        priorityTokens,
        isPremium,
        preferredGender,
        dailyMatchesLeft,
        isLoading,
        addCredits,
        spendCredits,
        refundCredits,
        addPriorityTokens,
        purchasePackage,
        refreshCards,
        purchaseCallExtension,
        refundUnusedMinutes,
        setPremium,
        setPreferredGender,
        useMatch,
        refillMatches,
        syncWithBackend,
      }}
    >
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  const context = useContext(CreditsContext);
  if (context === undefined) {
    throw new Error("useCredits must be used within a CreditsProvider");
  }
  return context;
}
