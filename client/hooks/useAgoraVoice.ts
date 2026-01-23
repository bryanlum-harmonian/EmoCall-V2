import { useState, useEffect, useRef, useCallback } from "react";
import { Platform } from "react-native";
import { getApiUrl } from "@/lib/query-client";

interface AgoraConfig {
  channelName: string;
  uid?: number;
  onRemoteUserLeft?: () => void;
  enabled?: boolean; // Set to false for preview mode (skips Agora connection)
}

interface UseAgoraVoiceReturn {
  isConnected: boolean;
  isConnecting: boolean;
  isMuted: boolean;
  remoteUserJoined: boolean;
  remoteUserLeft: boolean;
  error: string | null;
  join: () => Promise<void>;
  leave: () => Promise<void>;
  toggleMute: () => void;
}

let AgoraRTC: any = null;

async function loadAgoraSDK() {
  if (Platform.OS !== "web") {
    console.log("[Agora] Not on web platform, skipping SDK load");
    return null;
  }
  if (!AgoraRTC) {
    console.log("[Agora] Loading Agora SDK...");
    try {
      const module = await import("agora-rtc-sdk-ng");
      AgoraRTC = module.default;
      AgoraRTC.setLogLevel(1); // More verbose logging
      console.log("[Agora] SDK loaded successfully");
    } catch (err) {
      console.error("[Agora] Failed to load SDK:", err);
      throw err;
    }
  }
  return AgoraRTC;
}

export function useAgoraVoice(config: AgoraConfig): UseAgoraVoiceReturn {
  const enabled = config.enabled !== false; // Default to true
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [remoteUserJoined, setRemoteUserJoined] = useState(false);
  const [remoteUserLeft, setRemoteUserLeft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const onRemoteUserLeftRef = useRef(config.onRemoteUserLeft);

  const clientRef = useRef<any>(null);
  const localAudioTrackRef = useRef<any>(null);
  
  // CRITICAL: Prevent duplicate joins - tracks if we've already joined this channel
  const hasJoinedRef = useRef(false);
  const isLeavingRef = useRef(false);

  const fetchToken = useCallback(async () => {
    const url = new URL("/api/agora/token", getApiUrl()).toString();
    console.log("[Agora] Fetching token from:", url);
    console.log("[Agora] Channel:", config.channelName);
    
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelName: config.channelName,
          uid: config.uid || 0,
          role: "publisher",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Agora] Token fetch failed:", response.status, errorText);
        throw new Error(`Failed to fetch voice token: ${response.status}`);
      }

      const tokenData = await response.json();
      console.log("[Agora] Token received, appId:", tokenData.appId ? "present" : "missing");
      return tokenData;
    } catch (err) {
      console.error("[Agora] Token fetch error:", err);
      throw err;
    }
  }, [config.channelName, config.uid]);

  const join = useCallback(async () => {
    console.log("[Agora] Join called, platform:", Platform.OS, "enabled:", enabled);
    
    // CRITICAL: Prevent duplicate joins - check ref first
    if (hasJoinedRef.current) {
      console.log("[Agora] Already joined (hasJoinedRef=true), preventing duplicate join");
      return;
    }
    
    // In preview mode, simulate connected state without actual Agora connection
    if (!enabled) {
      console.log("[Agora] Preview mode - simulating connected state");
      hasJoinedRef.current = true;
      setIsConnected(true);
      setRemoteUserJoined(true);
      return;
    }
    
    if (Platform.OS !== "web") {
      const msg = "Voice calls only available in web browser for testing";
      console.log("[Agora]", msg);
      setError(msg);
      return;
    }

    if (isConnected || isConnecting) {
      console.log("[Agora] Already connected or connecting, skipping");
      return;
    }

    // Mark as joined immediately to prevent race conditions
    hasJoinedRef.current = true;
    setIsConnecting(true);
    setError(null);

    try {
      console.log("[Agora] Loading SDK...");
      const sdk = await loadAgoraSDK();
      if (!sdk) {
        throw new Error("Failed to load Agora SDK");
      }

      const tokenData = await fetchToken();
      const { token, appId, uid } = tokenData;

      console.log("[Agora] Creating RTC client...");
      const client = sdk.createClient({ mode: "rtc", codec: "vp8" });
      clientRef.current = client;

      client.on("user-published", async (user: any, mediaType: string) => {
        console.log("[Agora] Remote user published:", user.uid, mediaType);
        await client.subscribe(user, mediaType);
        if (mediaType === "audio") {
          user.audioTrack?.play();
          setRemoteUserJoined(true);
        }
      });

      client.on("user-unpublished", (user: any, mediaType: string) => {
        console.log("[Agora] Remote user unpublished:", user.uid, mediaType);
        if (mediaType === "audio") {
          setRemoteUserJoined(false);
        }
      });

      client.on("user-left", (user: any) => {
        console.log("[Agora] Remote user left:", user?.uid);
        setRemoteUserJoined(false);
        setRemoteUserLeft(true);
        if (onRemoteUserLeftRef.current) {
          console.log("[Agora] Calling onRemoteUserLeft callback");
          onRemoteUserLeftRef.current();
        }
      });

      console.log("[Agora] Joining channel:", config.channelName);
      await client.join(appId, config.channelName, token, uid);
      console.log("[Agora] Joined channel successfully");

      console.log("[Agora] Creating microphone audio track...");
      const localAudioTrack = await sdk.createMicrophoneAudioTrack();
      localAudioTrackRef.current = localAudioTrack;
      console.log("[Agora] Microphone track created");

      console.log("[Agora] Publishing audio track...");
      await client.publish([localAudioTrack]);
      console.log("[Agora] Audio track published - VOICE CONNECTED!");

      setIsConnected(true);
      setIsConnecting(false);
    } catch (err: any) {
      console.error("[Agora] Join error:", err);
      const errorMessage = err.message || "Failed to connect voice";
      setError(errorMessage);
      setIsConnecting(false);
      // Reset hasJoinedRef on error so retry is possible
      hasJoinedRef.current = false;
    }
  }, [config.channelName, fetchToken, isConnected, isConnecting, enabled]);

  const leave = useCallback(async () => {
    // Prevent multiple simultaneous leave calls
    if (isLeavingRef.current) {
      console.log("[Agora] Already leaving, skipping duplicate leave call");
      return;
    }
    
    isLeavingRef.current = true;
    console.log("[Agora] Leave called - cleaning up Agora resources");
    
    try {
      if (localAudioTrackRef.current) {
        console.log("[Agora] Closing local audio track");
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }

      if (clientRef.current) {
        console.log("[Agora] Leaving channel");
        await clientRef.current.leave();
        clientRef.current = null;
      }

      setIsConnected(false);
      setRemoteUserJoined(false);
      setIsMuted(false);
      
      // Reset join tracking
      hasJoinedRef.current = false;
      console.log("[Agora] Leave completed, hasJoinedRef reset to false");
    } catch (err) {
      console.error("[Agora] Leave error:", err);
    } finally {
      isLeavingRef.current = false;
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (localAudioTrackRef.current) {
      const newMutedState = !isMuted;
      localAudioTrackRef.current.setEnabled(!newMutedState);
      setIsMuted(newMutedState);
    }
  }, [isMuted]);

  // CRITICAL: Cleanup on unmount - prevents "71 users in one room" bug
  useEffect(() => {
    return () => {
      console.log("[Agora] Component unmounting - forcing cleanup");
      // Synchronous cleanup on unmount
      if (localAudioTrackRef.current) {
        console.log("[Agora] Unmount: Closing local audio track");
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }
      if (clientRef.current) {
        console.log("[Agora] Unmount: Leaving channel");
        clientRef.current.leave().catch((err: any) => {
          console.error("[Agora] Unmount leave error:", err);
        });
        clientRef.current = null;
      }
      // Reset refs
      hasJoinedRef.current = false;
      isLeavingRef.current = false;
    };
  }, []);

  useEffect(() => {
    onRemoteUserLeftRef.current = config.onRemoteUserLeft;
  }, [config.onRemoteUserLeft]);

  return {
    isConnected,
    isConnecting,
    isMuted,
    remoteUserJoined,
    remoteUserLeft,
    error,
    join,
    leave,
    toggleMute,
  };
}
