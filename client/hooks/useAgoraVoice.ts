import { useState, useEffect, useRef, useCallback } from "react";
import { Platform, PermissionsAndroid, Alert } from "react-native";
import Constants from "expo-constants";
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
  join: () => Promise<void>;
  leave: () => Promise<void>;
  toggleMute: () => void;
}

let AgoraRTC: any = null;
let nativeEngineInstance: any = null;

// FIX: Static require for Native Module (prevents bundle crash on APK)
// Metro bundler doesn't handle dynamic import() for native modules correctly in production
let RtcEngine: any = null;
if (Platform.OS !== "web") {
  try {
    const AgoraModule = require("react-native-agora");
    RtcEngine = AgoraModule.default || AgoraModule;
    console.log("[Agora] Native SDK loaded via static require");
  } catch (e) {
    console.error("[Agora] Failed to require react-native-agora:", e);
  }
}

function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

// Request Android runtime permissions for microphone
async function requestAndroidAudioPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  
  try {
    console.log("[Agora] Requesting Android audio permissions...");
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: "Microphone Permission",
        message: "EmoCall needs access to your microphone for voice calls.",
        buttonNeutral: "Ask Me Later",
        buttonNegative: "Cancel",
        buttonPositive: "OK",
      }
    );
    
    const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
    console.log("[Agora] Audio permission result:", granted, "isGranted:", isGranted);
    return isGranted;
  } catch (err) {
    console.error("[Agora] Permission request error:", err);
    return false;
  }
}

async function loadWebAgoraSDK() {
  if (!AgoraRTC) {
    console.log("[Agora] Loading Web Agora SDK...");
    try {
      const module = await import("agora-rtc-sdk-ng");
      AgoraRTC = module.default;
      AgoraRTC.setLogLevel(1);
      console.log("[Agora] Web SDK loaded successfully");
    } catch (err) {
      console.error("[Agora] Failed to load Web SDK:", err);
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
  
  const onRemoteUserLeftRef = useRef(config.onRemoteUserLeft);
  const clientRef = useRef<any>(null);
  const localAudioTrackRef = useRef<any>(null);
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
          setRemoteUserJoined(true);
        }
      });

      client.on("user-unpublished", (user: any, mediaType: string) => {
        console.log("[Agora Web] Remote user unpublished:", user.uid, mediaType);
        if (mediaType === "audio") {
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

      setIsConnected(true);
    } catch (err) {
      throw err;
    }
  }, [config.channelName, fetchToken]);

  const joinNative = useCallback(async () => {
    console.log("[Agora Native] Joining...");
    
    // Request microphone permission on Android before joining
    const hasPermission = await requestAndroidAudioPermission();
    if (!hasPermission) {
      const errorMsg = "Microphone permission denied. Please allow microphone access in Settings.";
      console.error("[Agora Native]", errorMsg);
      setError(errorMsg);
      Alert.alert(
        "Permission Required",
        "EmoCall needs microphone access for voice calls. Please enable it in your device settings.",
        [{ text: "OK" }]
      );
      throw new Error(errorMsg);
    }
    
    if (!RtcEngine) {
      const errorMsg = "Agora SDK not loaded. Please restart the app.";
      console.error("[Agora Native]", errorMsg);
      setError(errorMsg);
      throw new Error(errorMsg);
    }
    
    try {
      const tokenData = await fetchToken();
      const { token, appId, uid } = tokenData;

      console.log("[Agora Native] Creating engine with appId");
      
      const engine = RtcEngine.createAgoraRtcEngine();
      nativeEngineInstance = engine;
      clientRef.current = engine;
      
      engine.initialize({
        appId: appId,
        channelProfile: 1,
      });

      engine.addListener("onUserJoined", (connection: any, remoteUid: number) => {
        console.log("[Agora Native] Remote user joined:", remoteUid);
        setRemoteUserJoined(true);
      });

      engine.addListener("onUserOffline", (connection: any, remoteUid: number, reason: number) => {
        console.log("[Agora Native] Remote user offline:", remoteUid, "reason:", reason);
        setRemoteUserJoined(false);
        setRemoteUserLeft(true);
        if (onRemoteUserLeftRef.current) {
          onRemoteUserLeftRef.current();
        }
      });

      engine.addListener("onJoinChannelSuccess", (connection: any, elapsed: number) => {
        console.log("[Agora Native] Joined channel successfully, elapsed:", elapsed);
        setIsConnected(true);
      });

      engine.addListener("onError", (err: number, msg: string) => {
        console.error("[Agora Native] Error:", err, msg);
        setError(`Agora error: ${msg}`);
      });

      engine.enableAudio();
      
      console.log("[Agora Native] Joining channel:", config.channelName);
      engine.joinChannel(token, config.channelName, uid, {
        clientRoleType: 1,
        publishMicrophoneTrack: true,
        autoSubscribeAudio: true,
      });
      
    } catch (err) {
      throw err;
    }
  }, [config.channelName, fetchToken]);

  const join = useCallback(async () => {
    console.log("[Agora] Join called, platform:", Platform.OS, "enabled:", enabled);
    
    if (hasJoinedRef.current) {
      console.log("[Agora] Already joined, preventing duplicate");
      return;
    }
    
    if (!enabled) {
      console.log("[Agora] Preview mode - simulating connected state");
      hasJoinedRef.current = true;
      setIsConnected(true);
      setRemoteUserJoined(true);
      return;
    }

    if (Platform.OS !== "web" && isExpoGo()) {
      const msg = "Voice calls require a development build. Please run: npx expo run:ios or npx expo run:android";
      console.log("[Agora]", msg);
      setError(msg);
      hasJoinedRef.current = true;
      setIsConnected(true);
      setRemoteUserJoined(true);
      return;
    }

    if (isConnected || isConnecting) {
      console.log("[Agora] Already connected or connecting, skipping");
      return;
    }

    hasJoinedRef.current = true;
    setIsConnecting(true);
    setError(null);

    try {
      if (Platform.OS === "web") {
        await joinWeb();
      } else {
        await joinNative();
      }
      setIsConnecting(false);
    } catch (err: any) {
      console.error("[Agora] Join error:", err);
      const errorMessage = err.message || "Failed to connect voice";
      setError(errorMessage);
      setIsConnecting(false);
      hasJoinedRef.current = false;
    }
  }, [enabled, isConnected, isConnecting, joinWeb, joinNative]);

  const leave = useCallback(async () => {
    if (isLeavingRef.current) {
      console.log("[Agora] Already leaving, skipping duplicate leave call");
      return;
    }
    
    isLeavingRef.current = true;
    console.log("[Agora] Leave called - cleaning up resources");
    
    try {
      if (Platform.OS === "web") {
        if (localAudioTrackRef.current) {
          console.log("[Agora Web] Closing local audio track");
          localAudioTrackRef.current.close();
          localAudioTrackRef.current = null;
        }

        if (clientRef.current) {
          console.log("[Agora Web] Leaving channel");
          await clientRef.current.leave();
          clientRef.current = null;
        }
      } else {
        if (nativeEngineInstance) {
          console.log("[Agora Native] Leaving channel");
          nativeEngineInstance.leaveChannel();
          nativeEngineInstance.release();
          nativeEngineInstance = null;
          clientRef.current = null;
        }
      }

      setIsConnected(false);
      setRemoteUserJoined(false);
      setIsMuted(false);
      hasJoinedRef.current = false;
      console.log("[Agora] Leave completed");
    } catch (err) {
      console.error("[Agora] Leave error:", err);
    } finally {
      isLeavingRef.current = false;
    }
  }, []);

  const toggleMute = useCallback(() => {
    const newMutedState = !isMuted;
    
    if (Platform.OS === "web") {
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.setEnabled(!newMutedState);
      }
    } else {
      if (nativeEngineInstance) {
        nativeEngineInstance.muteLocalAudioStream(newMutedState);
      }
    }
    
    setIsMuted(newMutedState);
  }, [isMuted]);

  useEffect(() => {
    return () => {
      console.log("[Agora] Component unmounting - forcing cleanup");
      if (Platform.OS === "web") {
        if (localAudioTrackRef.current) {
          localAudioTrackRef.current.close();
          localAudioTrackRef.current = null;
        }
        if (clientRef.current) {
          clientRef.current.leave().catch((err: any) => {
            console.error("[Agora] Unmount leave error:", err);
          });
          clientRef.current = null;
        }
      } else {
        if (nativeEngineInstance) {
          nativeEngineInstance.leaveChannel();
          nativeEngineInstance.release();
          nativeEngineInstance = null;
        }
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
    join,
    leave,
    toggleMute,
  };
}
