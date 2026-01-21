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
2. **MoodSelectionScreen** - User selects "Vent" or "Listen" mode
3. **BlindCardPickerScreen** - Random match selection (5 cards per mood, refresh option available)
4. **ActiveCallScreen** - Enhanced voice call with dual-user display, sound wave animations, in-call credits store, 1-minute fate reminders, and extension modal at 10 seconds
5. **CallEndedScreen** - Session completion with various end states
6. **SettingsScreen** - App preferences and dark mode toggle

### Backend (Express.js)
- **Runtime:** Node.js with TypeScript (tsx for development, esbuild for production)
- **Server:** Express 5 with HTTP server
- **API Pattern:** REST endpoints prefixed with `/api`
- **CORS:** Dynamic origin handling for Replit domains and localhost development

### Database Layer
- **ORM:** Drizzle ORM with PostgreSQL dialect
- **Schema Location:** `shared/schema.ts` - shared between client and server
- **Migrations:** Drizzle Kit (`drizzle-kit push`)
- **Current Storage:** In-memory storage adapter (`server/storage.ts`) with interface ready for database migration

### Build System
- **Development:** Dual-process (Expo Metro bundler + Express server)
- **Production:** Custom build script (`scripts/build.js`) for static Expo web builds
- **Server Build:** esbuild bundles server to `server_dist/`

## External Dependencies

### Voice/Real-Time Communication
- Voice calling functionality planned (business plan references Agora Audio at RM 0.0045/min)
- WebSocket support via `ws` package (likely for matchmaking/signaling)

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

### Monetization System (Credits-Based)
- **CreditsContext** (`client/contexts/CreditsContext.tsx`) - Manages credits balance, premium status, gender preference
- **CreditsStoreModal** (`client/components/CreditsStoreModal.tsx`) - Purchase credits packages

**Credit Packages (USD):**
- $1 = 100 credits
- $2 = 200 credits
- $5 = 500 credits (+50 bonus)
- $10 = 1000 credits (+150 bonus)
- $20 = 2000 credits (+400 bonus)

**Credit Usage:**
- Refresh daily cards: 100 credits ($1)
- Call extensions: 50-350 credits (5-60 minutes)
- Unused extension time refunded as credits when call ends early

**Premium Subscription:** $10/month
- 200 bonus credits on subscription
- Gender filter on daily cards
- Priority matching

**Call Extensions:**
- +5 min: 50 credits
- +15 min: 120 credits
- +30 min: 200 credits
- +60 min: 350 credits

Note: Payment processing uses mock purchases (UI complete, Stripe integration needed for production)

### Database
- **pg** - PostgreSQL client
- **drizzle-orm** + **drizzle-zod** - Type-safe database operations with Zod validation
- Requires `DATABASE_URL` environment variable

### Development Tools
- **ESLint** with Expo config + Prettier integration
- **TypeScript** strict mode enabled