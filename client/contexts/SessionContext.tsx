import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest } from "@/lib/query-client";

const DEVICE_ID_KEY = "@emocall_device_id";
const SESSION_ID_KEY = "@emocall_session_id";

interface Session {
  id: string;
  deviceId: string;
  credits: number;
  karmaPoints: number;
  timeBankMinutes: number;
  dailyMatchesLeft: number;
  dailyMatchesResetAt: string;
  isPremium: boolean;
  premiumExpiresAt: string | null;
  genderPreference: string | null;
  termsAcceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SessionContextType {
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  refreshSession: () => Promise<void>;
  acceptTerms: () => Promise<void>;
  hasAcceptedTerms: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

function generateDeviceId(): string {
  return "device_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initializeSession = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check for ?newSession URL parameter (for testing)
      const forceNewSession = typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("newSession") === "true";

      if (forceNewSession) {
        console.log("[SessionContext] Forcing new session creation (newSession=true)");
        await AsyncStorage.removeItem(DEVICE_ID_KEY);
        await AsyncStorage.removeItem(SESSION_ID_KEY);
      }

      let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (!deviceId) {
        deviceId = generateDeviceId();
        await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
      }

      console.log("[SessionContext] Creating session with deviceId:", deviceId);
      const response = await apiRequest("POST", "/api/sessions", { deviceId });
      const sessionData = await response.json();
      console.log("[SessionContext] Session created:", sessionData.id);

      await AsyncStorage.setItem(SESSION_ID_KEY, sessionData.id);
      setSession(sessionData);
    } catch (err) {
      console.error("Failed to initialize session:", err);
      setError("Failed to connect to server");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSession = useCallback(async () => {
    if (!session?.id) {
      await initializeSession();
      return;
    }

    try {
      const response = await apiRequest("GET", `/api/sessions/${session.id}`, undefined);
      const sessionData = await response.json();
      setSession(sessionData);
    } catch (err) {
      console.error("Failed to refresh session:", err);
    }
  }, [session?.id]);

  const acceptTerms = async () => {
    if (!session?.id) return;

    try {
      const response = await apiRequest("POST", `/api/sessions/${session.id}/accept-terms`, {});
      const sessionData = await response.json();
      setSession(sessionData);
    } catch (err) {
      console.error("Failed to accept terms:", err);
      throw err;
    }
  };

  useEffect(() => {
    initializeSession();
  }, []);

  const hasAcceptedTerms = session?.termsAcceptedAt != null;

  return (
    <SessionContext.Provider
      value={{
        session,
        isLoading,
        error,
        refreshSession,
        acceptTerms,
        hasAcceptedTerms,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
