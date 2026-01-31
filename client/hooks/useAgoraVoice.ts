// This file serves as the TypeScript entry point for platform-specific implementations
// The actual implementation is in useAgoraVoice.web.ts and useAgoraVoice.native.ts
// Metro bundler will automatically select the correct file based on platform

export interface AgoraConfig {
  channelName: string;
  uid?: number;
  onRemoteUserLeft?: () => void;
  enabled?: boolean;
}

export interface UseAgoraVoiceReturn {
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

// This export is never actually used at runtime - Metro picks the platform-specific file
// But it allows TypeScript to resolve types correctly
export function useAgoraVoice(_config: AgoraConfig): UseAgoraVoiceReturn {
  throw new Error("Platform-specific implementation not loaded");
}
