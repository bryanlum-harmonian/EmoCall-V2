# EmoCall - Full App Specification

## Overview

**EmoCall** is an anonymous voice calling mobile app for instant emotional relief. Connect with strangers in 5-minute voice calls - no profiles, no judgment, just talk.

**Core Value:** 15-second onboarding, zero friction (no login, no email, no names)

**Target Platforms:** iOS, Android, Web (via Expo)

---

## User Flow (3 Screens)

### 1. Terms Gate Screen
- Age verification (18+)
- Terms & Conditions acceptance
- Privacy Policy link
- One-time gate, stored server-side
- Links to /privacy and /terms pages

### 2. Mood Selection Screen
- **"I Need to Vent"** - User wants to talk/express emotions
- **"I Can Listen"** - User wants to support others
- Immediate matchmaking on tap (no card picking)
- Waiting overlay with cancel option
- Header shows: Aura points, Credits, Settings gear

### 3. Active Call Screen
- 5-minute base duration (300 seconds)
- Dual-user display with sound wave animations
- Timer countdown with visual urgency at 10 seconds
- "Extend Call" button below timer
- In-call credits store access
- Safety check popup every 2 minutes
- End call confirmation dialog (prevents accidental disconnects)
- Fate reminder messages at 1-minute intervals

---

## Pricing & Credits

### Credit Packages (USD)

| Package | Price | Credits | Per Credit |
|---------|-------|---------|------------|
| Starter Pack | $0.99 | 250 | $0.00396 |
| Weekender Pack | $4.99 | 1,500 | $0.00333 |
| Power User Pack | $9.99 | 3,500 | $0.00285 |

### Credit Usage

| Action | Cost |
|--------|------|
| Shuffle new deck (refresh cards) | 100 credits |
| +10 minute extension | 100 credits |
| +20 minute extension | 180 credits |
| +30 minute extension | 250 credits |
| +60 minute extension | 450 credits |

### Daily Matches
- **10 free matches per day** (resets at midnight UTC)
- **Refill option:** $0.99 for 10 additional matches
- Counter displayed in header

### Premium Subscription ($10/month)
- 200 bonus credits on subscription activation
- Gender filter on daily cards
- Priority matching queue
- Premium badge display

---

## Aura Points System (Gamification)

### Earning Aura

| Action | Aura Points |
|--------|-------------|
| Each minute during call | +10 |
| Complete a call | +10 |
| Extend a call | +50 |
| Get reported | -25 |

### Aura Levels

| Level | Name | Minimum Aura |
|-------|------|--------------|
| 1 | New Soul | 0 |
| 2 | Kind Listener | 50 |
| 3 | Empathetic Soul | 150 |
| 4 | Trusted Companion | 300 |
| 5 | Guardian Angel | 500 |
| 6 | Heart of Gold | 1000 |

### Aura Earning Calculator

**Per 5-minute free call:**
- 5 minutes × 10 aura = 50 aura
- Completion bonus = 10 aura
- **Total: 60 aura per basic call**

**To reach Heart of Gold (1000 aura):**
- Free path: ~17 calls over 2 days (10 free matches/day)
- Fast path: 2 extended 60-min calls = 1320 aura (cost: 900 credits ≈ $2.50)

---

## Time Bank (Priority Tokens)

- Stores refunds from early call endings
- Unused extension time converted to Priority Tokens
- Displayed in Credits Store modal
- Can be used for priority matching in future calls
- Non-expiring balance

---

## Safety Features

### During Calls
- **Disclaimer banner** at call start (swipe to dismiss)
- **Safety check popup** every 2 minutes: "Are you feeling safe?"
  - "Yes, I Feel Safe" (green) - continues call
  - "No, Not Really" (yellow) - shows follow-up options
- **End call confirmation** - prevents accidental disconnects
  - "Keep Talking" (green) - stay on call
  - "End Call" (red) - confirm ending

### Reporting System
- Report button accessible during calls
- Report reasons: Harassment, Inappropriate Content, Spam, Other
- Reports stored in database for moderation
- Reported users lose 25 aura points

### Privacy
- No personal data collection
- Anonymous session IDs only
- No call recordings stored
- Device ID for session persistence only

---

## Themes

Two switchable themes available in Settings:

### Sunny Theme (Default)
- **Inspiration:** Kawaii/Parkette style
- **Primary:** Sunny Yellow (#FFD93D)
- **Secondary:** Bubblegum Pink (#FFB3C6)
- **Accent:** Grass Green (#A8E6CF), Sky Blue (#A8D8EA)
- **Background:** Cream (#FFF8E7)
- **Vibe:** Warm, playful, inviting

### Coral Theme
- **Inspiration:** Suntera style
- **Primary:** Coral (#FF6B6B)
- **Secondary:** Orange tones
- **Accent:** Green accents
- **Background:** Warm coral tints
- **Vibe:** Sunset warmth, energetic

Both themes support **light mode** and **dark mode**.

---

## Technical Architecture

### Frontend Stack
- **Framework:** React Native with Expo SDK 54
- **Navigation:** React Navigation (stack only, no tabs)
- **State Management:** TanStack React Query + React Context
- **Animations:** React Native Reanimated
- **Haptics:** expo-haptics for tactile feedback
- **Typography:** Nunito font (Google Fonts)

### Backend Stack
- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js 5
- **Database:** PostgreSQL with Drizzle ORM
- **Real-time:** WebSocket server for matchmaking
- **Build:** esbuild for production

### Voice Communication (Planned)
- **Provider:** Agora Audio SDK
- **Cost:** ~RM 0.0045/minute (~$0.001 USD/minute)
- **Features:** Voice-only, no video

---

## Database Schema

### Tables

**sessions**
- id (UUID, primary key)
- deviceId (unique identifier)
- credits (integer, default 0)
- karmaPoints (integer, default 0) - stores Aura
- dailyMatchesLeft (integer, default 10)
- isPremium (boolean)
- termsAccepted (boolean)
- timeBankMinutes (integer, default 0)
- createdAt, updatedAt

**calls**
- id (UUID, primary key)
- venterId (session reference)
- listenerId (session reference)
- duration (seconds)
- extendedMinutes (integer)
- endReason (string)
- startedAt, endedAt

**credit_transactions**
- id (UUID, primary key)
- sessionId (reference)
- amount (integer)
- type (purchase, spend, refund)
- description (string)
- createdAt

**karma_transactions**
- id (UUID, primary key)
- sessionId (reference)
- amount (integer)
- reason (string)
- createdAt

**reports**
- id (UUID, primary key)
- reporterId (session reference)
- reportedId (session reference)
- callId (call reference)
- reason (string)
- details (text)
- createdAt

**matchmaking_queue**
- id (UUID, primary key)
- sessionId (reference)
- mood (vent/listen)
- joinedAt
- status (waiting, matched, cancelled)

---

## API Endpoints

### Session Management
- `POST /api/sessions` - Create/retrieve session by device ID
- `GET /api/sessions/:id` - Get session details
- `POST /api/sessions/:id/accept-terms` - Accept terms

### Credits
- `GET /api/credits/packages` - List credit packages
- `POST /api/sessions/:id/credits/purchase` - Purchase credits
- `POST /api/sessions/:id/credits/shuffle` - Spend credits to shuffle

### Daily Matches
- `POST /api/sessions/:id/matches/use` - Use one daily match
- `POST /api/sessions/:id/matches/refill` - Refill matches ($0.99)

### Aura (Karma endpoints - legacy naming)
- `GET /api/karma/levels` - List aura levels
- `GET /api/sessions/:id/karma` - Get session aura with level
- `POST /api/sessions/:id/karma/award` - Award aura points

### Premium
- `POST /api/sessions/:id/premium/activate` - Activate premium
- `GET /api/sessions/:id/premium/status` - Check premium status

### Reports
- `POST /api/reports` - Submit abuse report

### Time Bank
- `GET /api/sessions/:id/timebank` - Get time bank balance

### Legal Pages
- `GET /privacy` - Privacy Policy (HTML)
- `GET /terms` - Terms of Service (HTML)

---

## Matchmaking Logic

### Flow
1. **Venter taps "I Need to Vent"**
   - Check for waiting Listeners in queue
   - If found → instant match
   - If none → join queue and wait

2. **Listener taps "I Can Listen"**
   - Check for waiting Venters in queue
   - If found → instant match
   - If none → join queue and wait

3. **Match Found**
   - Both users notified via WebSocket
   - Navigate to Active Call screen
   - 5-minute timer starts

### Reliability Features
- WebSocket auto-reconnect with exponential backoff (max 10 attempts)
- HTTP polling fallback for match delivery (2-second intervals)
- 15-second grace period on disconnect (allows mobile reconnection)
- Stale session cleanup before matching

---

## Settings Screen

- Theme picker (Sunny/Coral with visual previews)
- Dark mode toggle
- Privacy Policy link
- Terms of Service link
- App version display

---

## Future Enhancements (Planned)

- [ ] Stripe payment integration (currently mock purchases)
- [ ] Agora voice SDK integration
- [ ] Push notifications for matches
- [ ] User blocking functionality
- [ ] Call quality ratings
- [ ] Listener verification/badges
- [ ] Group calls (3+ users)
- [ ] Scheduled calls

---

## Business Model Summary

| Revenue Stream | Price | Notes |
|----------------|-------|-------|
| Credit Packages | $0.99 - $9.99 | One-time purchases |
| Daily Match Refills | $0.99 | When 10 free matches used |
| Premium Subscription | $10/month | Recurring revenue |
| Voice Minutes | ~$0.001/min | Agora passthrough cost |

---

*Last Updated: January 2026*
