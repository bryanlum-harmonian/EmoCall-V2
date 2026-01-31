import { useState, useEffect, useRef, useCallback } from "react";
import { Platform, PermissionsAndroid, Alert } from "react-native";
import Constants from "expo-constants";
import { getApiUrl } from "@/lib/query-client";

// Native-specific imports - safe because this file only runs on iOS/Android
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
} from "react-native-agora";

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

let nativeEngineInstance: any = null;

function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

// Request Android runtime permissions for microphone and Bluetooth (Android 12+)
async function requestAndroidPermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  
  try {
    console.log("[Agora Native] Requesting Android permissions...");
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    
    const audioGranted = granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;
    console.log("[Agora Native] Permissions result:", granted, "audioGranted:", audioGranted);
    return audioGranted;
  } catch (err) {
    console.error("[Agora Native] Permission request error:", err);
    return false;
  }
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
  const hasJoinedRef = useRef(false);
  const isLeavingRef = useRef(false);

  const fetchToken = useCallback(async () => {
    const url = new URL("/api/agora/token", getApiUrl()).toString();
    console.log("[Agora Native] Fetching token from:", url);
    console.log("[Agora Native] Channel:", config.channelName);
    
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
        console.error("[Agora Native] Token fetch failed:", response.status, errorText);
        throw new Error(`Failed to fetch voice token: ${response.status}`);
      }

      const tokenData = await response.json();
      console.log("[Agora Native] Token received, appId:", tokenData.appId ? "present" : "missing");
      return tokenData;
    } catch (err) {
      console.error("[Agora Native] Token fetch error:", err);
      throw err;
    }
  }, [config.channelName, config.uid]);

  const joinNative = useCallback(async () => {
    console.log("[Agora Native] Joining...");
    
    // Request microphone and Bluetooth permissions on Android before joining
    const hasPermission = await requestAndroidPermissions();
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
    
    try {
      const tokenData = await fetchToken();
      const { token, appId, uid } = tokenData;

      console.log("[Agora Native] Creating engine with appId");
      
      const engine = createAgoraRtcEngine();
      nativeEngineInstance = engine;
      clientRef.current = engine;
      
      // Initialize with v4 API
      engine.initialize({
        appId: appId,
        channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
      });

      // CRITICAL: Use registerEventHandler (v4 API) instead of addListener (deprecated)
      engine.registerEventHandler({
        onJoinChannelSuccess: (connection: any, elapsed: number) => {
          console.log("[Agora Native] Joined channel successfully, elapsed:", elapsed);
          setIsConnected(true);
        },
        onUserJoined: (connection: any, remoteUid: number, elapsed: number) => {
          console.log("[Agora Native] Remote user joined:", remoteUid);
          setRemoteUserJoined(true);
          // Reset remoteUserLeft flag - user has (re)joined
          setRemoteUserLeft(false);
        },
        onUserOffline: (connection: any, remoteUid: number, reason: number) => {
          console.log("[Agora Native] Remote user offline:", remoteUid, "reason:", reason);
          setRemoteUserJoined(false);
          setRemoteUserLeft(true);
          setRemoteAudioLevel(0);
          if (onRemoteUserLeftRef.current) {
            onRemoteUserLeftRef.current();
          }
        },
        onError: (err: number, msg: string) => {
          console.error("[Agora Native] Error:", err, msg);
          setError(`Agora error: ${msg}`);
        },
        // Audio volume indication for real-time voice visualization
        onAudioVolumeIndication: (
          connection: any,
          speakers: Array<{ uid: number; volume: number; vad: number }>,
          speakerNumber: number,
          totalVolume: number
        ) => {
          for (const speaker of speakers) {
            // uid 0 = local user, other uids = remote users
            const normalizedVolume = speaker.volume / 255; // Convert to 0-1 scale
            if (speaker.uid === 0) {
              setLocalAudioLevel(normalizedVolume);
            } else {
              setRemoteAudioLevel(normalizedVolume);
            }
          }
        },
      });

      // Enable audio volume indication (reports every 100ms)
      // Parameters: interval (ms), smooth (unused), reportVad (voice activity detection)
      engine.enableAudioVolumeIndication(100, 3, true);

      // Set client role and enable audio
      engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
      engine.enableAudio();
      
      console.log("[Agora Native] Joining channel:", config.channelName);
      engine.joinChannel(token, config.channelName, uid, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        publishMicrophoneTrack: true,
        autoSubscribeAudio: true,
      });
      
    } catch (err) {
      throw err;
    }
  }, [config.channelName, fetchToken]);

  const join = useCallback(async () => {
    console.log("[Agora Native] Join called, platform:", Platform.OS, "enabled:", enabled);
    
    if (hasJoinedRef.current) {
      console.log("[Agora Native] Already joined, preventing duplicate");
      return;
    }
    
    if (!enabled) {
      console.log("[Agora Native] Preview mode - simulating connected state");
      hasJoinedRef.current = true;
      setIsConnected(true);
      setRemoteUserJoined(true);
      return;
    }

    if (isExpoGo()) {
      const msg = "Voice calls require a development build. Please run: npx expo run:ios or npx expo run:android";
      console.log("[Agora Native]", msg);
      setError(msg);
      hasJoinedRef.current = true;
      setIsConnected(true);
      setRemoteUserJoined(true);
      return;
    }

    if (isConnected || isConnecting) {
      console.log("[Agora Native] Already connected or connecting, skipping");
      return;
    }

    hasJoinedRef.current = true;
    setIsConnecting(true);
    setError(null);

    try {
      await joinNative();
      setIsConnecting(false);
    } catch (err: any) {
      console.error("[Agora Native] Join error:", err);
      const errorMessage = err.message || "Failed to connect voice";
      setError(errorMessage);
      setIsConnecting(false);
      hasJoinedRef.current = false;
    }
  }, [enabled, isConnected, isConnecting, joinNative]);

  const leave = useCallback(async () => {
    if (isLeavingRef.current) {
      console.log("[Agora Native] Already leaving, skipping duplicate leave call");
      return;
    }
    
    isLeavingRef.current = true;
    console.log("[Agora Native] Leave called - cleaning up resources");
    
    try {
      if (nativeEngineInstance) {
        console.log("[Agora Native] Leaving channel");
        nativeEngineInstance.leaveChannel();
        nativeEngineInstance.release();
        nativeEngineInstance = null;
        clientRef.current = null;
      }

      setIsConnected(false);
      setRemoteUserJoined(false);
      setIsMuted(false);
      setLocalAudioLevel(0);
      setRemoteAudioLevel(0);
      hasJoinedRef.current = false;
      console.log("[Agora Native] Leave completed");
    } catch (err) {
      console.error("[Agora Native] Leave error:", err);
    } finally {
      isLeavingRef.current = false;
    }
  }, []);

  const toggleMute = useCallback(() => {
    const newMutedState = !isMuted;
    
    if (nativeEngineInstance) {
      nativeEngineInstance.muteLocalAudioStream(newMutedState);
    }
    
    setIsMuted(newMutedState);
  }, [isMuted]);

  useEffect(() => {
    return () => {
      console.log("[Agora Native] Component unmounting - forcing cleanup");
      if (nativeEngineInstance) {
        nativeEngineInstance.leaveChannel();
        nativeEngineInstance.release();
        nativeEngineInstance = null;
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
