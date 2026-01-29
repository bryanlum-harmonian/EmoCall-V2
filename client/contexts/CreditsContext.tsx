// This file is maintained for backwards compatibility
// All functionality has been moved to TimeBankContext

export {
  useTimeBank,
  useTimeBank as useCredits,
  TimeBankProvider,
  TimeBankProvider as CreditsProvider,
  TIME_PACKAGES,
  CALL_EXTENSIONS,
  SHUFFLE_COST_MINUTES,
  PREMIUM_MONTHLY_PRICE,
  PREMIUM_BONUS_MINUTES,
  type TimePackage,
  type CallExtension,
} from "./TimeBankContext";

// Legacy aliases for backwards compatibility
export const CREDIT_PACKAGES = [] as never[]; // Deprecated
export const REFRESH_CARDS_COST = 5; // 5 minutes
export const DAILY_MATCHES_REFILL_COST = 5; // 5 minutes
export const PREMIUM_BONUS_CREDITS = 30; // Now represents 30 minutes
