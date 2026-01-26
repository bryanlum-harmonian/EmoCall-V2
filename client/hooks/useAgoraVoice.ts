// Platform-specific Agora Voice Hook
// Metro bundler automatically resolves:
// - useAgoraVoice.native.ts for iOS/Android
// - useAgoraVoice.web.ts for Web
//
// This file serves as a fallback and type definition reference.

export { useAgoraVoice } from "./useAgoraVoice.web";
