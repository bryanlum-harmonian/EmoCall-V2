import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { apiRequest } from "@/lib/query-client";
import { useSession } from "./SessionContext";
import { TIME_PACKAGES, EXTENSION_OPTIONS, REFERRAL_REWARD_MINUTES, COSTS } from "@shared/schema";

export interface TimePackage {
  id: string;
  name: string;
  minutes: number;
  priceUsd: number;
}

export interface CallExtension {
  id: string;
  minutes: number;
  cost: number;
  label: string;
}

// Re-export TIME_PACKAGES for convenience
export { TIME_PACKAGES };

// Map extension options to labeled format for UI
export const CALL_EXTENSIONS: CallExtension[] = EXTENSION_OPTIONS.map((ext) => ({
  id: `ext-${ext.minutes}`,
  minutes: ext.minutes,
  cost: ext.cost,
  label: `+${ext.minutes} min`,
}));

export const SHUFFLE_COST_MINUTES = COSTS.SHUFFLE_DECK;
export const PREMIUM_MONTHLY_PRICE = COSTS.PREMIUM_MONTHLY / 100; // Convert cents to dollars
export const PREMIUM_BONUS_MINUTES = COSTS.PREMIUM_BONUS_MINUTES;

interface TimeBankContextType {
  timeBankMinutes: number;
  referralCode: string | null;
  referredByCode: string | null;
  referralCount: number;
  isPremium: boolean;
  preferredGender: "any" | "male" | "female";
  dailyMatchesLeft: number;
  isLoading: boolean;
  canExtendCall: (extensionId: string) => boolean;
  purchasePackage: (packageId: string) => Promise<boolean>;
  refreshCards: () => Promise<boolean>;
  purchaseCallExtension: (extensionId: string) => { success: boolean; minutes: number };
  setPremium: (value: boolean) => Promise<void>;
  setPreferredGender: (gender: "any" | "male" | "female") => Promise<void>;
  useMatch: () => Promise<boolean>;
  refillMatches: () => Promise<boolean>;
  syncWithBackend: () => Promise<void>;
  redeemReferral: (code: string) => Promise<{ success: boolean; message: string }>;
}

const TimeBankContext = createContext<TimeBankContextType | undefined>(undefined);

const MAX_DAILY_MATCHES = 10;

export function TimeBankProvider({ children }: { children: ReactNode }) {
  const { session, refreshSession } = useSession();
  const [timeBankMinutes, setTimeBankMinutes] = useState(0);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referredByCode, setReferredByCode] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [preferredGender, setPreferredGenderState] = useState<"any" | "male" | "female">("any");
  const [dailyMatchesLeft, setDailyMatchesLeft] = useState(MAX_DAILY_MATCHES);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (session) {
      setTimeBankMinutes(session.timeBankMinutes || 0);
      // Use type assertion for new fields that may not be in cached type definitions
      const sessionAny = session as unknown as Record<string, unknown>;
      setReferralCode((sessionAny.referralCode as string) || null);
      setReferredByCode((sessionAny.referredByCode as string) || null);
      setReferralCount((sessionAny.referralCount as number) || 0);
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

  const canExtendCall = useCallback((extensionId: string): boolean => {
    const ext = CALL_EXTENSIONS.find((e) => e.id === extensionId);
    return ext ? timeBankMinutes >= ext.cost : false;
  }, [timeBankMinutes]);

  const purchasePackage = useCallback(async (packageId: string): Promise<boolean> => {
    if (!session?.id) return false;

    try {
      setIsLoading(true);
      const response = await apiRequest("POST", `/api/sessions/${session.id}/credits/purchase`, { packageId });
      const data = await response.json();
      setTimeBankMinutes(data.timeBankMinutes || 0);
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
    if (timeBankMinutes < SHUFFLE_COST_MINUTES) return false;

    try {
      setIsLoading(true);
      const response = await apiRequest("POST", `/api/sessions/${session.id}/credits/shuffle`, {});
      const data = await response.json();
      setTimeBankMinutes(data.timeBankMinutes || 0);
      return true;
    } catch (err) {
      console.error("Failed to refresh cards:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [session?.id, timeBankMinutes]);

  const purchaseCallExtension = useCallback((extensionId: string): { success: boolean; minutes: number } => {
    const ext = CALL_EXTENSIONS.find((e) => e.id === extensionId);
    if (ext && timeBankMinutes >= ext.cost) {
      setTimeBankMinutes((prev) => prev - ext.cost);
      return { success: true, minutes: ext.minutes };
    }
    return { success: false, minutes: 0 };
  }, [timeBankMinutes]);

  const setPremium = useCallback(async (value: boolean): Promise<void> => {
    if (!session?.id) return;

    if (value) {
      try {
        setIsLoading(true);
        const response = await apiRequest("POST", `/api/sessions/${session.id}/premium/activate`, {});
        const data = await response.json();
        setIsPremium(true);
        setTimeBankMinutes(data.timeBankMinutes || 0);
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

    try {
      setIsLoading(true);
      const response = await apiRequest("POST", `/api/sessions/${session.id}/matches/refill`, {});
      const data = await response.json();
      setDailyMatchesLeft(data.dailyMatchesLeft);
      setTimeBankMinutes(data.timeBankMinutes || 0);
      return true;
    } catch (err) {
      console.error("Failed to refill matches:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [session?.id]);

  const redeemReferral = useCallback(async (code: string): Promise<{ success: boolean; message: string }> => {
    if (!session?.id) return { success: false, message: "Session not found" };

    try {
      setIsLoading(true);
      const response = await apiRequest("POST", `/api/sessions/${session.id}/referral/redeem`, { code });
      const data = await response.json();
      
      if (data.session) {
        setTimeBankMinutes(data.session.timeBankMinutes || 0);
        setReferredByCode(data.session.referredByCode || null);
      }
      
      return { success: true, message: data.message };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to redeem code";
      console.error("Failed to redeem referral code:", err);
      return { success: false, message: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [session?.id]);

  return (
    <TimeBankContext.Provider
      value={{
        timeBankMinutes,
        referralCode,
        referredByCode,
        referralCount,
        isPremium,
        preferredGender,
        dailyMatchesLeft,
        isLoading,
        canExtendCall,
        purchasePackage,
        refreshCards,
        purchaseCallExtension,
        setPremium,
        setPreferredGender,
        useMatch,
        refillMatches,
        syncWithBackend,
        redeemReferral,
      }}
    >
      {children}
    </TimeBankContext.Provider>
  );
}

export function useTimeBank() {
  const context = useContext(TimeBankContext);
  if (context === undefined) {
    throw new Error("useTimeBank must be used within a TimeBankProvider");
  }
  return context;
}

// Backward compatibility - re-export useCredits as an alias
export const useCredits = useTimeBank;
export const CreditsProvider = TimeBankProvider;
