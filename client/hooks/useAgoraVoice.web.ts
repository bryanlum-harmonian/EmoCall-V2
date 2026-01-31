import { useState, useEffect, useRef, useCallback } from "react";
import { getApiUrl } from "@/lib/query-client";

interface AgoraConfig {
  channelName: string;
  uid?: number;
  onRemoteUserLeft?: () => void;
  enabled?: boolean;
}

interface UseAgoraVoiceReturn {
  isConnected: boolean;
  isConnecting: boolean;
  isMuted: boolean;
  remoteUserJoined: boolean;
  remoteUserLeft: boolean;
  error: string | null;
  localAudioLevel: number;
  remoteAudioLevel: number;
  join: () => Promise<void>;
  leave: () => Promise<void>;
  toggleMute: () => void;
}

let AgoraRTC: any = null;

async function loadWebAgoraSDK() {
  if (!AgoraRTC) {
    console.log("[Agora Web] Loading Web Agora SDK...");
    try {
      const module = await import("agora-rtc-sdk-ng");
      AgoraRTC = module.default;
      AgoraRTC.setLogLevel(1);
      console.log("[Agora Web] Web SDK loaded successfully");
    } catch (err) {
      console.error("[Agora Web] Failed to load Web SDK:", err);
      throw err;
    }
  }
  return AgoraRTC;
}

export function useAgoraVoice(config: AgoraConfig): UseAgoraVoiceReturn {
  const enabled = config.enabled !== false;
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [remoteUserJoined, setRemoteUserJoined] = useState(false);
  const [remoteUserLeft, setRemoteUserLeft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localAudioLevel, setLocalAudioLevel] = useState(0);
  const [remoteAudioLevel, setRemoteAudioLevel] = useState(0);

  const onRemoteUserLeftRef = useRef(config.onRemoteUserLeft);
  const clientRef = useRef<any>(null);
  const localAudioTrackRef = useRef<any>(null);
  const remoteAudioTrackRef = useRef<any>(null);
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasJoinedRef = useRef(false);
  const isLeavingRef = useRef(false);

  const fetchToken = useCallback(async () => {
    const url = new URL("/api/agora/token", getApiUrl()).toString();
    console.log("[Agora Web] Fetching token from:", url);
    console.log("[Agora Web] Channel:", config.channelName);
    
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
        console.error("[Agora Web] Token fetch failed:", response.status, errorText);
        throw new Error(`Failed to fetch voice token: ${response.status}`);
      }

      const tokenData = await response.json();
      console.log("[Agora Web] Token received, appId:", tokenData.appId ? "present" : "missing");
      return tokenData;
    } catch (err) {
      console.error("[Agora Web] Token fetch error:", err);
      throw err;
    }
  }, [config.channelName, config.uid]);

  const joinWeb = useCallback(async () => {
    console.log("[Agora Web] Joining...");
    
    try {
      const sdk = await loadWebAgoraSDK();
      if (!sdk) throw new Error("Failed to load Agora SDK");

      const tokenData = await fetchToken();
      const { token, appId, uid } = tokenData;

      const client = sdk.createClient({ mode: "rtc", codec: "vp8" });
      clientRef.current = client;

      client.on("user-published", async (user: any, mediaType: string) => {
        console.log("[Agora Web] Remote user published:", user.uid, mediaType);
        await client.subscribe(user, mediaType);
        if (mediaType === "audio") {
          user.audioTrack?.play();
          remoteAudioTrackRef.current = user.audioTrack;
          setRemoteUserJoined(true);
          // Reset remoteUserLeft flag - user has (re)joined
          setRemoteUserLeft(false);
        }
      });

      client.on("user-unpublished", (user: any, mediaType: string) => {
        console.log("[Agora Web] Remote user unpublished:", user.uid, mediaType);
        if (mediaType === "audio") {
          remoteAudioTrackRef.current = null;
          setRemoteAudioLevel(0);
          setRemoteUserJoined(false);
        }
      });

      client.on("user-left", (user: any) => {
        console.log("[Agora Web] Remote user left:", user?.uid);
        setRemoteUserJoined(false);
        setRemoteUserLeft(true);
        if (onRemoteUserLeftRef.current) {
          onRemoteUserLeftRef.current();
        }
      });

      console.log("[Agora Web] Joining channel:", config.channelName);
      await client.join(appId, config.channelName, token, uid);
      console.log("[Agora Web] Joined channel successfully");

      const localAudioTrack = await sdk.createMicrophoneAudioTrack();
      localAudioTrackRef.current = localAudioTrack;
      console.log("[Agora Web] Microphone track created");

      await client.publish([localAudioTrack]);
      console.log("[Agora Web] Audio track published - VOICE CONNECTED!");

      // Start polling audio levels for real-time voice visualization
      audioLevelIntervalRef.current = setInterval(() => {
        // Get local audio level (0-1 scale)
        if (localAudioTrackRef.current) {
          const localLevel = localAudioTrackRef.current.getVolumeLevel();
          setLocalAudioLevel(localLevel);
        }
        // Get remote audio level (0-1 scale)
        if (remoteAudioTrackRef.current) {
          const remoteLevel = remoteAudioTrackRef.current.getVolumeLevel();
          setRemoteAudioLevel(remoteLevel);
        }
      }, 100); // Poll every 100ms for smooth visualization

      setIsConnected(true);
    } catch (err) {
      throw err;
    }
  }, [config.channelName, fetchToken]);

  const join = useCallback(async () => {
    console.log("[Agora Web] Join called, enabled:", enabled);
    
    if (hasJoinedRef.current) {
      console.log("[Agora Web] Already joined, preventing duplicate");
      return;
    }
    
    if (!enabled) {
      console.log("[Agora Web] Preview mode - simulating connected state");
      hasJoinedRef.current = true;
      setIsConnected(true);
      setRemoteUserJoined(true);
      return;
    }

    if (isConnected || isConnecting) {
      console.log("[Agora Web] Already connected or connecting, skipping");
      return;
    }

    hasJoinedRef.current = true;
    setIsConnecting(true);
    setError(null);

    try {
      await joinWeb();
      setIsConnecting(false);
    } catch (err: any) {
      console.error("[Agora Web] Join error:", err);
      const errorMessage = err.message || "Failed to connect voice";
      setError(errorMessage);
      setIsConnecting(false);
      hasJoinedRef.current = false;
    }
  }, [enabled, isConnected, isConnecting, joinWeb]);

  const leave = useCallback(async () => {
    if (isLeavingRef.current) {
      console.log("[Agora Web] Already leaving, skipping duplicate leave call");
      return;
    }

    isLeavingRef.current = true;
    console.log("[Agora Web] Leave called - cleaning up resources");

    try {
      // Stop audio level polling
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
        audioLevelIntervalRef.current = null;
      }

      if (localAudioTrackRef.current) {
        console.log("[Agora Web] Closing local audio track");
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }

      remoteAudioTrackRef.current = null;

      if (clientRef.current) {
        console.log("[Agora Web] Leaving channel");
        await clientRef.current.leave();
        clientRef.current = null;
      }

      setIsConnected(false);
      setRemoteUserJoined(false);
      setIsMuted(false);
      setLocalAudioLevel(0);
      setRemoteAudioLevel(0);
      hasJoinedRef.current = false;
      console.log("[Agora Web] Leave completed");
    } catch (err) {
      console.error("[Agora Web] Leave error:", err);
    } finally {
      isLeavingRef.current = false;
    }
  }, []);

  const toggleMute = useCallback(() => {
    const newMutedState = !isMuted;
    
    if (localAudioTrackRef.current) {
      localAudioTrackRef.current.setEnabled(!newMutedState);
    }
    
    setIsMuted(newMutedState);
  }, [isMuted]);

  useEffect(() => {
    return () => {
      console.log("[Agora Web] Component unmounting - forcing cleanup");
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
        audioLevelIntervalRef.current = null;
      }
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }
      remoteAudioTrackRef.current = null;
      if (clientRef.current) {
        clientRef.current.leave().catch((err: any) => {
          console.error("[Agora Web] Unmount leave error:", err);
        });
        clientRef.current = null;
      }
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
    localAudioLevel,
    remoteAudioLevel,
    join,
    leave,
    toggleMute,
  };
}
