import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

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
  { id: "pack-starter", amount: 250, price: 0.99, label: "$0.99", name: "Starter Pack" },
  { id: "pack-weekender", amount: 1500, price: 4.99, label: "$4.99", name: "Weekender Pack" },
  { id: "pack-power", amount: 3500, price: 9.99, label: "$9.99", name: "Power User Pack" },
];

export const CALL_EXTENSIONS: CallExtension[] = [
  { id: "ext-10", minutes: 10, cost: 100, label: "+10 min" },
  { id: "ext-20", minutes: 20, cost: 180, label: "+20 min" },
  { id: "ext-30", minutes: 30, cost: 250, label: "+30 min" },
  { id: "ext-60", minutes: 60, cost: 450, label: "+60 min" },
];

export const REFRESH_CARDS_COST = 100;
export const DAILY_MATCHES_REFILL_COST = 0.99;
export const PREMIUM_MONTHLY_PRICE = 10;
export const PREMIUM_BONUS_CREDITS = 200;

interface CreditsContextType {
  credits: number;
  priorityTokens: number;
  isPremium: boolean;
  preferredGender: "any" | "male" | "female";
  dailyMatchesLeft: number;
  addCredits: (amount: number) => void;
  spendCredits: (amount: number) => boolean;
  refundCredits: (amount: number) => void;
  addPriorityTokens: (amount: number) => void;
  purchasePackage: (packageId: string) => boolean;
  refreshCards: () => boolean;
  purchaseCallExtension: (extensionId: string) => { success: boolean; minutes: number };
  refundUnusedMinutes: (unusedMinutes: number, extensionId: string) => void;
  setPremium: (value: boolean) => void;
  setPreferredGender: (gender: "any" | "male" | "female") => void;
  useMatch: () => boolean;
  refillMatches: () => boolean;
}

const CreditsContext = createContext<CreditsContextType | undefined>(undefined);

const MAX_DAILY_MATCHES = 10;

export function CreditsProvider({ children }: { children: ReactNode }) {
  const [credits, setCredits] = useState(0);
  const [priorityTokens, setPriorityTokens] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [preferredGender, setPreferredGender] = useState<"any" | "male" | "female">("any");
  const [dailyMatchesLeft, setDailyMatchesLeft] = useState(MAX_DAILY_MATCHES);

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

  const purchasePackage = useCallback((packageId: string): boolean => {
    const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
    if (pkg) {
      const totalCredits = pkg.amount + (pkg.bonus || 0);
      setCredits((prev) => prev + totalCredits);
      return true;
    }
    return false;
  }, []);

  const refreshCards = useCallback((): boolean => {
    if (credits >= REFRESH_CARDS_COST) {
      setCredits((prev) => prev - REFRESH_CARDS_COST);
      return true;
    }
    return false;
  }, [credits]);

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

  const setPremium = useCallback((value: boolean) => {
    setIsPremium(value);
    if (value) {
      setCredits((prev) => prev + PREMIUM_BONUS_CREDITS);
    }
  }, []);

  const useMatch = useCallback((): boolean => {
    if (dailyMatchesLeft > 0) {
      setDailyMatchesLeft((prev) => prev - 1);
      return true;
    }
    return false;
  }, [dailyMatchesLeft]);

  const refillMatches = useCallback((): boolean => {
    setDailyMatchesLeft(MAX_DAILY_MATCHES);
    return true;
  }, []);

  return (
    <CreditsContext.Provider
      value={{
        credits,
        priorityTokens,
        isPremium,
        preferredGender,
        dailyMatchesLeft,
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
