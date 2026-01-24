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
- `call_ready`: Client -> Server, signals user has joined Agora voice channel
- `call_started`: Server -> Client, both users ready, call timer begins

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