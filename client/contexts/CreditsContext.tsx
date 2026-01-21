import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface CreditPackage {
  id: string;
  amount: number;
  price: number;
  label: string;
  bonus?: number;
}

export interface CallExtension {
  id: string;
  minutes: number;
  cost: number;
  label: string;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: "pack-1", amount: 100, price: 1, label: "$1" },
  { id: "pack-2", amount: 200, price: 2, label: "$2" },
  { id: "pack-5", amount: 500, price: 5, label: "$5", bonus: 50 },
  { id: "pack-10", amount: 1000, price: 10, label: "$10", bonus: 150 },
  { id: "pack-20", amount: 2000, price: 20, label: "$20", bonus: 400 },
];

export const CALL_EXTENSIONS: CallExtension[] = [
  { id: "ext-5", minutes: 5, cost: 50, label: "+5 min" },
  { id: "ext-15", minutes: 15, cost: 120, label: "+15 min" },
  { id: "ext-30", minutes: 30, cost: 200, label: "+30 min" },
  { id: "ext-60", minutes: 60, cost: 350, label: "+60 min" },
];

export const REFRESH_CARDS_COST = 100;
export const PREMIUM_MONTHLY_PRICE = 10;
export const PREMIUM_BONUS_CREDITS = 200;

interface CreditsContextType {
  credits: number;
  isPremium: boolean;
  preferredGender: "any" | "male" | "female";
  addCredits: (amount: number) => void;
  spendCredits: (amount: number) => boolean;
  refundCredits: (amount: number) => void;
  purchasePackage: (packageId: string) => boolean;
  refreshCards: () => boolean;
  purchaseCallExtension: (extensionId: string) => { success: boolean; minutes: number };
  refundUnusedMinutes: (unusedMinutes: number, extensionId: string) => void;
  setPremium: (value: boolean) => void;
  setPreferredGender: (gender: "any" | "male" | "female") => void;
}

const CreditsContext = createContext<CreditsContextType | undefined>(undefined);

export function CreditsProvider({ children }: { children: ReactNode }) {
  const [credits, setCredits] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [preferredGender, setPreferredGender] = useState<"any" | "male" | "female">("any");

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
        setCredits((prev) => prev + refundAmount);
      }
    }
  }, []);

  const setPremium = useCallback((value: boolean) => {
    setIsPremium(value);
    if (value) {
      setCredits((prev) => prev + PREMIUM_BONUS_CREDITS);
    }
  }, []);

  return (
    <CreditsContext.Provider
      value={{
        credits,
        isPremium,
        preferredGender,
        addCredits,
        spendCredits,
        refundCredits,
        purchasePackage,
        refreshCards,
        purchaseCallExtension,
        refundUnusedMinutes,
        setPremium,
        setPreferredGender,
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
