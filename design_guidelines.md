# EmoCall Design Guidelines

## Brand Identity

**Purpose**: Instant emotional relief through anonymous voice connections. No profiles, no judgment, just talk.

**Aesthetic Direction**: Brutally minimal with strategic urgency
- STARK interface prioritizing SPEED (15-second onboarding)
- Maximum whitespace creates safety and calm
- DRAMATIC shifts to red during countdown create urgency
- No clutter, no distractions—every element serves the core flow

**Memorable Element**: The countdown timer that turns RED at 4:50, creating a cliffhanger moment where human connection meets decision.

---

## Navigation Architecture

**Type**: Stack-Only (no tabs, no drawer)
- Linear flow optimized for speed and anonymity
- No persistent navigation; user commits fully to each session

**Screen Flow**:
1. Terms Gate → 2. Mood Selection → 3. Blind Card Picker → 4. Active Call → (5. Payment Prompt) → 6. Call End

---

## Screen Specifications

### 1. Terms Gate Screen
**Purpose**: Legal compliance (18+, Malaysian law acknowledgment)

**Layout**:
- Header: None (full-screen takeover)
- Content: Scrollable view with centered text
- Footer: Fixed "Agree & Enter" button

**Components**:
- Large icon (shield with checkmark)
- Headline: "No Names. No Judgement. Just Talk."
- Body text: T&C summary, 18+ confirmation, PDRM reporting notice
- Primary button: "Agree & Enter"

**Safe Area**: Top: insets.top + 24, Bottom: insets.bottom + 24

---

### 2. Mood Selection Screen
**Purpose**: User declares intent (Vent or Listen)

**Layout**:
- Header: Transparent, no title, settings icon (top-right)
- Content: Non-scrollable, centered two-card layout
- Footer: None

**Components**:
- Two large touchable cards (equal height):
  - Left: "🗣️ I Need to Vent"
  - Right: "👂 I Can Listen"
- Subtitle below cards: "Pick your mood. You'll connect in 15 seconds."

**Safe Area**: Top: headerHeight + 48, Bottom: insets.bottom + 24

**Interaction**: Tapping a card immediately navigates to Blind Card Picker

---

### 3. Blind Card Picker Screen
**Purpose**: User selects from 10 random daily matches

**Layout**:
- Header: Transparent, back button (left), "10 Daily Cards" title
- Content: Scrollable vertical list
- Footer: None

**Components**:
- 10 identical "Blind Cards" (no names, no photos):
  - Card shows only: "Anonymous Match #1" through "#10"
  - Tap to connect
- Empty state (if user exhausted all 10): "Come back tomorrow for 10 new matches"

**Safe Area**: Top: headerHeight + 24, Bottom: insets.bottom + 24

---

### 4. Active Call Screen
**Purpose**: Ongoing voice session with live countdown

**Layout**:
- Header: None (immersive full-screen)
- Content: Non-scrollable, centered elements
- Footer: Fixed controls

**Components**:
- Large circular countdown timer (center):
  - Shows MM:SS remaining
  - Turns RED background at 4:50
- Status text above timer: "Connected" / "Time Almost Up!"
- Bottom controls:
  - Mute button
  - End Call button (red, destructive)
  - Report button (small, corner icon)

**Safe Area**: Top: insets.top + 48, Bottom: insets.bottom + 48

**State Change at 4:50**:
- Background shifts to red
- Timer animates (pulse effect)
- Payment prompt overlay appears

---

### 5. Payment Prompt (Modal Overlay)
**Purpose**: Offer 10-minute extension for RM 1.90

**Layout**: Native modal (appears at 4:50 during call)

**Components**:
- Headline: "Keep Talking?"
- Body: "Extend by 10 minutes for RM 1.90"
- Two buttons:
  - Primary: "Pay & Continue"
  - Secondary: "End Call"
- Countdown badge showing seconds left before auto-disconnect

**Safe Area**: Modal handles insets automatically

---

### 6. Settings Screen
**Purpose**: Safety controls and app info (accessed from Mood Selection)

**Layout**:
- Header: Default navigation, "Settings" title, close button (right)
- Content: Scrollable form
- Footer: None

**Components**:
- Section: Safety
  - "Block Last Match" toggle
  - "Report History" button
- Section: Legal
  - "Terms of Service" link
  - "Privacy Policy" link
- Section: Account
  - "Delete My Data" button (destructive, nested confirmation)

**Safe Area**: Top: 24, Bottom: insets.bottom + 24

---

## Color Palette

**Primary (Calm Urgency)**:
- Primary: #FF4757 (Crimson Red - used for urgency, countdown, CTAs)
- Primary Tint: #FF6B7A (lighter red for hover states)

**Backgrounds**:
- Background: #FAFAFA (off-white, softer than pure white)
- Surface: #FFFFFF (cards, modals)

**Text**:
- Text Primary: #2F3542 (near-black with warmth)
- Text Secondary: #747D8C (muted gray)
- Text Disabled: #CED6E0 (very light gray)

**Semantic**:
- Success: #26DE81 (bright green - call connected)
- Warning: #FFA502 (amber - last minute warning)
- Error: #FF4757 (matches primary - urgent/destructive actions)

**Principle**: Calm white dominates; RED is reserved for urgency (countdown, CTAs). Avoid purple, blue tech clichés.

---

## Typography

**Font**: System Default (SF Pro for iOS, Roboto for Android) - prioritizes SPEED over decorative fonts

**Type Scale**:
- Headline: 32pt, Bold (screen titles)
- Title: 24pt, Semibold (card headers)
- Body: 17pt, Regular (main text)
- Caption: 14pt, Regular (secondary info)
- Button: 17pt, Semibold (all CTAs)

---

## Visual Design

**Touchable Feedback**:
- Cards: Scale down to 0.98 on press
- Buttons: Opacity 0.7 on press
- No drop shadows on standard buttons

**Floating Elements**:
- Payment prompt modal: shadowOffset (0, 4), opacity 0.15, radius 8

**Icons**: Feather icons from @expo/vector-icons, 24pt default size

---

## Assets to Generate

1. **icon.png** - App icon: Red speech bubble on white, minimal
   - WHERE USED: Device home screen

2. **splash-icon.png** - Splash screen: Simple "EmoCall" wordmark
   - WHERE USED: App launch screen

3. **empty-matches.png** - Illustration: Empty card deck
   - WHERE USED: Blind Card Picker screen when user exhausts 10 daily matches

4. **shield-checkmark.png** - Icon: Safety shield with checkmark
   - WHERE USED: Terms Gate screen header

5. **countdown-urgency.png** - Illustration: Clock with red glow
   - WHERE USED: Payment prompt modal header

**Style**: Minimal line art with red accent color, avoiding clipart aesthetic