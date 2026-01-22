# EmoCall - Replit Development Guide

## Overview

EmoCall is an anonymous voice calling mobile application built with React Native (Expo) and Express.js. The app connects users for instant emotional relief through 5-minute anonymous voice calls - no profiles, no judgment, just talk. Users select their mood (Vent or Listen), pick a random "blind card" to match with another user, and connect for time-limited voice sessions with optional paid extensions.

**Core Value Proposition:** Instant emotional relief through anonymous voice connections with 15-second onboarding and zero friction (no login, no email, no names).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (React Native/Expo)
- **Framework:** Expo SDK 54 with React Native 0.81.5, targeting iOS, Android, and Web
- **Navigation:** Stack-only navigation (`@react-navigation/native-stack`) - no tabs or drawer, optimized for linear user flow
- **State Management:** TanStack React Query for server state, React Context for theme management
- **Animations:** React Native Reanimated for fluid animations and haptic feedback via expo-haptics
- **Styling:** Theming system with light/dark mode support, custom design tokens in `client/constants/theme.ts`
- **Path Aliases:** `@/` maps to `client/`, `@shared/` maps to `shared/`

### Screen Flow Architecture
The app follows a strict linear flow designed for speed and anonymity:
1. **TermsGateScreen** - Legal compliance gate (18+, T&C acceptance)
2. **MoodSelectionScreen** - User selects "Vent" or "Listen" mode, matchmaking starts immediately with waiting overlay
3. **ActiveCallScreen** - Enhanced voice call with dual-user display, sound wave animations, in-call credits store, 1-minute fate reminders, and extension modal at 10 seconds
4. **CallEndedScreen** - Session completion with various end states
5. **SettingsScreen** - App preferences and dark mode toggle

### Backend (Express.js)
- **Runtime:** Node.js with TypeScript (tsx for development, esbuild for production)
- **Server:** Express 5 with HTTP server
- **API Pattern:** REST endpoints prefixed with `/api`
- **CORS:** Dynamic origin handling for Replit domains and localhost development

### Database Layer
- **ORM:** Drizzle ORM with PostgreSQL dialect
- **Schema Location:** `shared/schema.ts` - shared between client and server
- **Migrations:** Drizzle Kit (`drizzle-kit push`)
- **Storage:** PostgreSQL database with full persistence via `server/storage.ts`

### Database Tables
- **sessions** - Anonymous user sessions with credits, karma, daily matches, premium status
- **calls** - Call history between users
- **credit_transactions** - Credit purchase and spend history
- **karma_transactions** - Karma award history
- **reports** - User reports for moderation
- **matchmaking_queue** - Real-time queue for Vent/Listen matching

### Build System
- **Development:** Dual-process (Expo Metro bundler + Express server)
- **Production:** Custom build script (`scripts/build.js`) for static Expo web builds
- **Server Build:** esbuild bundles server to `server_dist/`

## External Dependencies

### Voice/Real-Time Communication
- Voice calling functionality planned (business plan references Agora Audio at RM 0.0045/min)
- WebSocket server on `/ws` path for real-time matchmaking and call signaling
- Supports: join queue, find match, call accept/reject, call end events

### Mobile Platform Services
- **expo-haptics** - Tactile feedback for interactions
- **expo-web-browser** - OAuth/external links
- **expo-splash-screen** - Launch screen management
- **@react-native-async-storage/async-storage** - Local persistence (terms acceptance, theme preference)

### UI/Animation Libraries
- **react-native-reanimated** - High-performance animations
- **react-native-gesture-handler** - Touch gesture handling
- **react-native-keyboard-controller** - Keyboard-aware scrolling
- **expo-blur** / **expo-glass-effect** - Visual effects

### Typography
- **@expo-google-fonts/nunito** - Custom font loading

### Session Management
- **SessionContext** (`client/contexts/SessionContext.tsx`) - Creates and manages anonymous session, persists device ID via AsyncStorage
- Sessions are created automatically on first app launch with unique device ID
- Terms acceptance is tracked server-side and persisted across app restarts

### Monetization System (Credits-Based)
- **CreditsContext** (`client/contexts/CreditsContext.tsx`) - Syncs with backend APIs for credits, daily matches, premium status
- **CreditsStoreModal** (`client/components/CreditsStoreModal.tsx`) - Purchase credits packages with Time Bank display

**Credit Packages (USD):**
- Starter Pack: $0.99 = 250 credits
- Weekender Pack: $4.99 = 1,500 credits
- Power User Pack: $9.99 = 3,500 credits

**Credit Usage:**
- Shuffle new deck (refresh cards): 100 credits
- Call extensions: 100-450 credits (10-60 minutes)
- Unused extension time refunded to Time Bank as Priority Tokens

**Daily Matches:**
- 10 free matches per day
- $0.99 refill when depleted

**Premium Subscription:** $10/month
- 200 bonus credits on subscription
- Gender filter on daily cards
- Priority matching

**Call Extensions:**
- +10 min: 100 credits
- +20 min: 180 credits
- +30 min: 250 credits
- +60 min: 450 credits

**Time Bank (Priority Tokens):**
- Stores refunds from early call endings
- Displayed in Credits Store modal

Note: Payment processing uses mock purchases (UI complete, Stripe integration needed for production)

### Karma Points System
- **KarmaContext** (`client/contexts/KarmaContext.tsx`) - Syncs with backend APIs for karma tracking

**Karma Levels:**
1. New Soul (0+ karma)
2. Kind Listener (50+ karma)
3. Empathetic Soul (150+ karma)
4. Trusted Companion (300+ karma)
5. Guardian Angel (500+ karma)
6. Heart of Gold (1000+ karma)

**Karma Rewards:**
- Complete a call: +10 karma
- Extend a call: +50 karma
- Get reported: -25 karma

### Database
- **pg** - PostgreSQL client
- **drizzle-orm** + **drizzle-zod** - Type-safe database operations with Zod validation
- Requires `DATABASE_URL` environment variable

### Development Tools
- **ESLint** with Expo config + Prettier integration
- **TypeScript** strict mode enabled

## API Endpoints

### Session APIs
- `POST /api/sessions` - Create or retrieve anonymous session by device ID
- `GET /api/sessions/:id` - Get session details
- `POST /api/sessions/:id/accept-terms` - Accept terms and conditions

### Credits APIs
- `GET /api/credits/packages` - List available credit packages
- `POST /api/sessions/:id/credits/purchase` - Purchase credits (mock, needs Stripe)
- `POST /api/sessions/:id/credits/shuffle` - Spend 100 credits to refresh cards

### Daily Matches APIs
- `POST /api/sessions/:id/matches/use` - Use one daily match
- `POST /api/sessions/:id/matches/refill` - Refill daily matches ($0.99)

### Karma APIs
- `GET /api/karma/levels` - List karma levels
- `GET /api/sessions/:id/karma` - Get session karma with level info
- `POST /api/sessions/:id/karma/award` - Award karma points

### Premium APIs
- `POST /api/sessions/:id/premium/activate` - Activate premium (mock, needs Stripe)
- `GET /api/sessions/:id/premium/status` - Check premium status
- `POST /api/sessions/:id/preferences/gender` - Set gender preference (premium only)

### Reports API
- `POST /api/reports` - Submit abuse report

### Time Bank API
- `GET /api/sessions/:id/timebank` - Get time bank balance

### Legal Pages
- `GET /privacy` - Privacy Policy page (HTML)
- `GET /terms` - Terms of Service page (HTML)

## Recent Changes (January 2026)
- **Removed Blind Card Feature**:
  - Users now tap mood and immediately enter matchmaking
  - No more card picking - direct "tap mood → wait → connect" flow
  - Reduced onboarding from 3 taps to 2 taps
  - BlindCardPickerScreen removed entirely
- **Simplified Matchmaking System**:
  - Vent users: Tap "I Need to Vent", wait in pool for a listener
  - Listen users: Tap "I Can Listen", instantly connect to any random waiting venter
  - Removed complex queue position tracking
  - Stale session cleanup: removes disconnected venters before matching
- **Matchmaking Reliability Improvements**: 
  - WebSocket auto-reconnect with exponential backoff (max 10 attempts)
  - HTTP polling fallback for match delivery on mobile (2s intervals)
  - 15-second grace period before ending calls on disconnect (allows mobile reconnection)
  - Fixed URL construction (removed double-slash bug in API calls)
- **Theme Redesign**: Transformed from Fire & Ice to kawaii/cute aesthetic inspired by Parkette
  - New color palette: Sunny Yellow (#FFD93D), Bubblegum Pink (#FFB3C6), Grass Green (#A8E6CF), Sky Blue (#A8D8EA)
  - Cream background (#FFF8E7) for warm, inviting feel
  - Rounded corners and playful typography throughout
  - Pastel gradient cards in Mood Selection and Blind Card Picker
  - New cute blob app icon
- Integrated PostgreSQL database with full schema for sessions, calls, credits, karma
- Added WebSocket server for real-time matchmaking
- Connected frontend contexts to backend APIs with full persistence
- Terms acceptance now persisted server-side
- **Multi-Theme System**: Added "Sunny" and "Coral" theme options with visual picker in Settings
  - Sunny: Kawaii/Parkette-inspired with yellow/pink/cream palette
  - Coral: Suntera-inspired with coral/orange/green palette
  - Both themes support light and dark mode
  - Theme preference persisted in AsyncStorage
- **Legal Documents**: Added comprehensive Privacy Policy and Terms of Service
  - Accessible via /privacy and /terms routes
  - Linked from Terms Gate screen and Settings
  - Opens in in-app browser via expo-web-browser