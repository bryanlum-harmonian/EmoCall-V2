# EmoCall - Replit Development Guide

## Overview
EmoCall is an anonymous voice calling mobile application designed for instant emotional relief. Built with React Native (Expo) and Express.js, it connects users for 5-minute anonymous voice calls. The app prioritizes speed and anonymity, allowing users to select a mood ("Vent" or "Listen") and immediately connect with another user without profiles, logins, or judgment. Key features include time-limited calls with optional paid extensions, a credit-based monetization system, and an "Aura" points system for engagement.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (React Native/Expo)
- **Framework:** Expo SDK 54 with React Native 0.81.5, targeting iOS, Android, and Web.
- **Navigation:** Stack-only navigation (`@react-navigation/native-stack`) for a linear user flow.
- **State Management:** TanStack React Query for server state, React Context for theme management.
- **Animations:** React Native Reanimated for fluid animations and haptic feedback via `expo-haptics`.
- **Styling:** Theming system with light/dark mode support, custom design tokens, and a kawaii/cute aesthetic with "Sunny" and "Coral" theme options.
- **Screen Flow:** Legal compliance gate, mood selection leading directly to matchmaking, active call screen with in-call features, and call ended screen.
- **Monetization UI:** Integrated CreditsStoreModal for purchasing credit packages and displaying Time Bank.
- **Engagement UI:** Displays daily streaks, vibe cards, and post-call rating system.
- **Compliance UI:** DataCollectionScreen for transparency and legal pages (`/privacy`, `/terms`).
- **Community UI:** GlobalRankingsModal for country leaderboards.

### Backend (Express.js)
- **Runtime:** Node.js with TypeScript.
- **Server:** Express 5.
- **API Pattern:** REST endpoints prefixed with `/api`.
- **CORS:** Dynamic origin handling.
- **WebSocket Server:** For real-time matchmaking and call signaling.

### Database Layer
- **ORM:** Drizzle ORM with PostgreSQL dialect.
- **Schema:** Shared between client and server (`shared/schema.ts`).
- **Migrations:** Drizzle Kit.
- **Tables:** `sessions`, `calls`, `credit_transactions`, `aura_transactions`, `reports`, `matchmaking_queue`, `call_ratings`, `country_rankings`.

### Build System
- **Development:** Dual-process (Expo Metro bundler + Express server).
- **Production:** Custom build script for static Expo web builds and esbuild for server bundling.

### Core Features
- **Anonymous Sessions:** Created automatically with unique device IDs.
- **Monetization:** Credit packages for call extensions and daily match refills. Premium subscription for additional benefits.
- **Aura Points:** Engagement system rewarding users for daily check-ins, call participation, and feedback.
- **Habit Loop:** Daily check-ins, streak tracking, and daily motivational "vibe cards" for user retention.
- **Post-Call Rating:** Star-based feedback for call quality and experience.
- **Global Rankings:** IP-based country detection to display global leaderboards.

## External Dependencies

### Voice/Real-Time Communication
- **Agora Voice SDK:** For real-time voice calls.
  - Web: `agora-rtc-sdk-ng`
  - iOS/Android: `react-native-agora`
- **WebSocket:** For real-time matchmaking and signaling.

### Mobile Platform Services
- **expo-haptics:** Tactile feedback.
- **expo-web-browser:** For in-app browsing of legal pages.
- **expo-splash-screen:** Splash screen management.
- **@react-native-async-storage/async-storage:** Local persistence (e.g., terms acceptance, theme).
- **react-native-view-shot:** For capturing UI as images for sharing.
- **expo-sharing:** For native sharing capabilities.

### UI/Animation Libraries
- **react-native-reanimated:** High-performance animations.
- **react-native-gesture-handler:** Touch gesture handling.
- **react-native-keyboard-controller:** Keyboard-aware scrolling.
- **expo-blur / expo-glass-effect:** Visual effects.

### Typography
- **@expo-google-fonts/nunito:** Custom font loading.

### Database
- **pg:** PostgreSQL client.
- **drizzle-orm** + **drizzle-zod:** Type-safe database operations.

### External APIs
- **ip-api.com:** For IP-based country detection.

## Matchmaking System Architecture

### Robust Matchmaking with Heartbeat & Atomic Transactions

The matchmaking system uses a robust architecture to prevent race conditions and ghost matches:

#### Queue Entry Lifecycle
1. **Join Queue**: User joins with status='waiting' and current `lastHeartbeat`
2. **Heartbeat**: Client sends heartbeat every 5 seconds, server updates `lastHeartbeat`
3. **Match Found**: Entry atomically marked status='matched', then deleted after call created
4. **Leave Queue**: Entry deleted immediately

#### Preventing Ghost Matches
- **Heartbeat Timeout**: Entries with `lastHeartbeat` > 15 seconds old are automatically cleaned up
- **Active Connection Check**: Only users with open WebSocket connections can be matched
- **Garbage Collection**: Stale entries cleaned on every `joinQueue` and `findWaitingVenter/Listener` call

#### Preventing Double-Booking
- **Status Field**: `matchmaking_queue.status` = 'waiting' | 'matched'
- **Atomic Claim**: `markQueueEntryMatched()` uses WHERE clause to only update if status='waiting'
- **Race Safety**: If two searches find same user, only first to claim succeeds

#### Bidirectional Matching
- Both Venters and Listeners actively search for opposite mood on join
- Whoever joins second triggers the match (symmetric logic)

#### Key Functions
- `joinQueue()`: Cleans stale entries, inserts with status='waiting'
- `updateQueueHeartbeat()`: Updates `lastHeartbeat` timestamp
- `cleanupStaleQueueEntries()`: Deletes entries with expired heartbeat
- `findWaitingVenter/Listener()`: Atomically finds and claims a waiting user
- `markQueueEntryMatched()`: Atomic status update (WHERE status='waiting')
- `leaveQueue()`: Deletes entry entirely

#### WebSocket Messages
- `heartbeat`: Client -> Server, updates queue entry heartbeat
- `heartbeat_ack`: Server -> Client, confirms heartbeat received
- `join_queue`: Client -> Server, joins matchmaking with mood/cardId
- `leave_queue`: Client -> Server, exits matchmaking
- `match_found`: Server -> Client, match created with callId/partnerId
- `call_ready`: Client -> Server, signals user is on ActiveCallScreen (sent BEFORE joining Agora)
- `call_started`: Server -> Client, both users on call screen, Agora voice now connects

#### Voice Connection Flow
The voice channel only connects after both users are confirmed on the call screen:
1. **Match Found** → Both users navigate to ActiveCallScreen
2. **Signal Ready** → Each user sends `call_ready` immediately on screen mount (before Agora)
3. **Server Waits** → Server waits for both `call_ready` signals (30s timeout)
4. **Call Started** → Server sends `call_started` to both users simultaneously
5. **Join Agora** → Only NOW do users join the Agora voice channel
6. **Voice Connected** → "Connecting..." disappears, call timer starts

This prevents one-sided audio where one user hears the other before they've arrived on the screen.

#### Reconnection Handling
- **Graceful Disconnects**: Queue entries are NOT deleted immediately on WebSocket disconnect
- **Reconnection Window**: Users have ~15 seconds (heartbeat timeout) to reconnect
- **Skip vs Delete**: During matching, entries without active connections are skipped, not deleted
- **Connection Registration**: New connections auto-register with sessionId, restoring state

#### Client Architecture
- **MatchmakingContext**: Singleton React context wrapping entire app (in App.tsx)
- **Persistent WebSocket**: Single connection persists across screen navigations
- **State Machine**: idle → in_queue → matched → call_started flow
- **Automatic Reconnection**: Reconnects on close/error with exponential backoff

## Internationalization (i18n)

### Overview
EmoCall supports 50 languages with automatic device language detection and RTL (right-to-left) support for Arabic, Hebrew, Urdu, and Persian.

### Architecture
- **Library:** `i18n-js` for translation management
- **Device Detection:** `expo-localization` for automatic language detection
- **Persistence:** Language preference stored in AsyncStorage
- **Context:** `LanguageProvider` wraps the entire app providing `t()` function

### Key Files
- `client/i18n/index.ts` - i18n setup, language list, storage helpers
- `client/i18n/locales/*.ts` - Translation files for 50 languages
- `client/contexts/LanguageContext.tsx` - React context with useLanguage hook
- `client/screens/LanguageScreen.tsx` - Language selector UI

### Supported Languages (50)
English, Chinese (Simplified/Traditional), Hindi, Spanish, French, Arabic*, Bengali, Portuguese, Russian, Indonesian, German, Japanese, Malay, Vietnamese, Italian, Korean, Turkish, Tamil, Thai, Persian*, Polish, Ukrainian, Dutch, Greek, Czech, Swedish, Hungarian, Romanian, Hebrew*, Filipino, Swahili, Danish, Finnish, Norwegian, Slovak, Croatian, Bulgarian, Serbian, Slovenian, Lithuanian, Latvian, Estonian, Catalan, Urdu*, Marathi, Telugu, Kannada, Gujarati, Punjabi

*RTL languages (Arabic, Hebrew, Persian, Urdu)

### Translation Keys
Translation files use nested object structure:
- `common.*` - General UI strings (cancel, confirm, save, etc.)
- `terms.*` - Onboarding/legal screen strings
- `mood.*` - Mood selection screen strings
- `call.*` - Active call screen strings
- `callEnded.*` - Post-call screen strings
- `settings.*` - Settings screen strings
- `errors.*` - Error messages

### Usage Pattern
```tsx
import { useLanguage } from "@/contexts/LanguageContext";

function MyComponent() {
  const { t, isRTL } = useLanguage();
  return <Text>{t("mood.headline")}</Text>;
}
```

### Interpolation
```tsx
t("refillModal.refillButton", { cost: 10 })
// Translation: "Refill for %{cost} credits" → "Refill for 10 credits"
```