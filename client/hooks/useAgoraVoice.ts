import { useState, useEffect, useRef, useCallback } from "react";
import { Platform } from "react-native";
import { getApiUrl } from "@/lib/query-client";

interface AgoraConfig {
  channelName: string;
  uid?: number;
}

interface UseAgoraVoiceReturn {
  isConnected: boolean;
  isConnecting: boolean;
  isMuted: boolean;
  remoteUserJoined: boolean;
  error: string | null;
  join: () => Promise<void>;
  leave: () => Promise<void>;
  toggleMute: () => void;
}

let AgoraRTC: any = null;

async function loadAgoraSDK() {
  if (Platform.OS !== "web") {
    return null;
  }
  if (!AgoraRTC) {
    const module = await import("agora-rtc-sdk-ng");
    AgoraRTC = module.default;
    AgoraRTC.setLogLevel(4);
  }
  return AgoraRTC;
}

export function useAgoraVoice(config: AgoraConfig): UseAgoraVoiceReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [remoteUserJoined, setRemoteUserJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<any>(null);
  const localAudioTrackRef = useRef<any>(null);

  const fetchToken = useCallback(async () => {
    try {
      const response = await fetch(new URL("/api/agora/token", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelName: config.channelName,
          uid: config.uid || 0,
          role: "publisher",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch voice token");
      }

      return await response.json();
    } catch (err) {
      console.error("Token fetch error:", err);
      throw err;
    }
  }, [config.channelName, config.uid]);

  const join = useCallback(async () => {
    if (Platform.OS !== "web") {
      setError("Voice calls only available in web browser for testing");
      return;
    }

    if (isConnected || isConnecting) return;

    setIsConnecting(true);
    setError(null);

    try {
      const sdk = await loadAgoraSDK();
      if (!sdk) {
        throw new Error("Failed to load Agora SDK");
      }

      const tokenData = await fetchToken();
      const { token, appId, uid } = tokenData;

      const client = sdk.createClient({ mode: "rtc", codec: "vp8" });
      clientRef.current = client;

      client.on("user-published", async (user: any, mediaType: string) => {
        await client.subscribe(user, mediaType);
        if (mediaType === "audio") {
          user.audioTrack?.play();
          setRemoteUserJoined(true);
        }
      });

      client.on("user-unpublished", (user: any, mediaType: string) => {
        if (mediaType === "audio") {
          setRemoteUserJoined(false);
        }
      });

      client.on("user-left", () => {
        setRemoteUserJoined(false);
      });

      await client.join(appId, config.channelName, token, uid);

      const localAudioTrack = await sdk.createMicrophoneAudioTrack();
      localAudioTrackRef.current = localAudioTrack;

      await client.publish([localAudioTrack]);

      setIsConnected(true);
      setIsConnecting(false);
    } catch (err: any) {
      console.error("Agora join error:", err);
      setError(err.message || "Failed to connect voice");
      setIsConnecting(false);
    }
  }, [config.channelName, fetchToken, isConnected, isConnecting]);

  const leave = useCallback(async () => {
    try {
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }

      if (clientRef.current) {
        await clientRef.current.leave();
        clientRef.current = null;
      }

      setIsConnected(false);
      setRemoteUserJoined(false);
      setIsMuted(false);
    } catch (err) {
      console.error("Agora leave error:", err);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (localAudioTrackRef.current) {
      const newMutedState = !isMuted;
      localAudioTrackRef.current.setEnabled(!newMutedState);
      setIsMuted(newMutedState);
    }
  }, [isMuted]);

  useEffect(() => {
    return () => {
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.close();
      }
      if (clientRef.current) {
        clientRef.current.leave();
      }
    };
  }, []);

  return {
    isConnected,
    isConnecting,
    isMuted,
    remoteUserJoined,
    error,
    join,
    leave,
    toggleMute,
  };
}
