# EmoCall Design Guidelines

## Brand Identity

**Purpose**: Instant emotional relief through anonymous voice connections. No profiles, no judgment, just talk.

**Aesthetic Direction**: Playful/kawaii (cheerful kawaii connection)
- WARM, inviting interface that feels like a safe hug
- Cute blob characters with simple faces create friendly presence
- Soft rounded corners and organic shapes throughout
- Hand-drawn feel with gentle animations
- Countdown urgency communicated through color shifts, not harsh red

**Memorable Element**: Blob buddy characters that guide you through each step, transforming the emotional support journey into a comforting, playful experience.

---

## Navigation Architecture

**Type**: Stack-Only
- Linear flow optimized for speed and emotional safety
- No persistent navigation; user commits fully to each session

**Screen Flow**:
1. Terms Gate → 2. Mood Selection → 3. Blind Card Picker → 4. Active Call → (5. Payment Prompt) → 6. Settings

---

## Screen Specifications

### 1. Terms Gate Screen
**Purpose**: Legal compliance (18+, Malaysian law acknowledgment)

**Layout**:
- Header: None
- Content: Scrollable view with centered text and cute blob character
- Footer: Fixed rounded button

**Components**:
- Blob character with shield (friendly guardian)
- Headline: "Safe Space, Zero Judgment"
- Body text: T&C summary, 18+ confirmation, PDRP notice
- Rounded primary button: "Let's Talk!"

**Safe Area**: Top: insets.top + 24, Bottom: insets.bottom + 24

---

### 2. Mood Selection Screen
**Purpose**: User declares intent (Vent or Listen)

**Layout**:
- Header: Transparent, settings icon (top-right)
- Content: Non-scrollable, centered two-card layout
- Footer: None

**Components**:
- Two large rounded cards with blob characters:
  - Left: Blob looking sad/stressed + "I Need to Vent"
  - Right: Blob with open arms + "I Can Listen"
- Subtitle: "Pick your vibe. Match in 15 seconds!"

**Safe Area**: Top: headerHeight + 48, Bottom: insets.bottom + 24

**Interaction**: Card scales to 0.95 on press with gentle bounce

---

### 3. Blind Card Picker Screen
**Purpose**: User selects from 10 random daily matches

**Layout**:
- Header: Transparent, back button (left), "10 Daily Friends" title
- Content: Scrollable vertical list
- Footer: None

**Components**:
- 10 rounded cards with blob variations:
  - Each shows unique blob expression + "Friend #1" through "#10"
  - Tap to connect
- Empty state: Sleepy blob + "Rest up! 10 new friends tomorrow ✨"

**Safe Area**: Top: headerHeight + 24, Bottom: insets.bottom + 24

---

### 4. Active Call Screen
**Purpose**: Ongoing voice session with live countdown

**Layout**:
- Header: None
- Content: Non-scrollable, centered elements
- Footer: Fixed rounded controls

**Components**:
- Large circular countdown (soft pastel background):
  - Shows MM:SS remaining
  - Background shifts from yellow → pink → orange as time decreases
  - Blob character inside circle changes expression (happy → concerned)
- Status text: "Connected!" / "Almost time!"
- Bottom controls (rounded):
  - Mute button (grass green background)
  - End Call button (bubblegum pink, gentle)
  - Report button (small corner icon)

**Safe Area**: Top: insets.top + 48, Bottom: insets.bottom + 48

---

### 5. Payment Prompt (Modal)
**Purpose**: Offer 10-minute extension for RM 1.90 at 4:50 mark

**Layout**: Native modal with rounded corners

**Components**:
- Blob character holding coin
- Headline: "Keep Chatting?"
- Body: "Extend by 10 mins for RM 1.90"
- Two rounded buttons:
  - Primary (yellow): "Yes Please!"
  - Secondary (cream): "End Call"
- Countdown badge showing seconds left

**Safe Area**: Modal handles insets

---

### 6. Settings Screen
**Purpose**: Safety controls and app info

**Layout**:
- Header: Default navigation, "Settings" title, close button
- Content: Scrollable form with rounded sections
- Footer: None

**Components**:
- Section: Safety (grass green accent)
  - "Block Last Match" toggle
  - "Report History" button
- Section: Legal (sky blue accent)
  - "Terms of Service" link
  - "Privacy Policy" link
- Section: Account (pink accent)
  - "Delete My Data" button (nested confirmation)

**Safe Area**: Top: 24, Bottom: insets.bottom + 24

---

## Color Palette

**Primary**:
- Sunny Yellow: #FFD93D (primary actions, countdown start)
- Bubblegum Pink: #FFB3C6 (urgency, CTAs, love)
- Grass Green: #A8E6CF (success, listening mode)
- Sky Blue: #A8D8EA (calm, secondary actions)

**Backgrounds**:
- Cream: #FFF8E7 (main background, soft and warm)
- Off-White: #FFFFFF (cards, elevated surfaces)

**Text**:
- Primary: #5A4A42 (warm brown, gentle)
- Secondary: #A89F9A (muted taupe)

**Semantic**:
- Success: #A8E6CF (grass green)
- Warning: #FFD93D (sunny yellow)
- Gentle Urgency: #FFB3C6 (bubblegum pink)

---

## Typography

**Font**: Nunito (Google Font) - rounded, friendly, highly legible

**Type Scale**:
- Headline: 28pt, Bold
- Title: 20pt, Semibold
- Body: 16pt, Regular
- Caption: 13pt, Regular
- Button: 16pt, Semibold

---

## Visual Design

**Touchable Feedback**: Scale to 0.95 on press with gentle bounce animation

**Floating Elements**: shadowOffset (0, 2), opacity 0.10, radius 2

**Icons**: Feather icons, 22pt default

**Shapes**: All cards and buttons have 16pt border radius minimum

---

## Assets to Generate

1. **icon.png** - Rounded yellow blob with simple smile
   - WHERE USED: Device home screen

2. **splash-icon.png** - Blob waving with "EmoCall" wordmark
   - WHERE USED: App launch

3. **empty-matches.png** - Sleepy blob on pillow
   - WHERE USED: Blind Card Picker empty state

4. **blob-guardian.png** - Blob holding shield, friendly expression
   - WHERE USED: Terms Gate screen

5. **blob-vent.png** - Stressed blob with wavy lines
   - WHERE USED: Mood Selection "Vent" card

6. **blob-listen.png** - Blob with open arms
   - WHERE USED: Mood Selection "Listen" card

7. **blob-countdown-happy.png** - Blob smiling inside circle
   - WHERE USED: Active Call (0-3 mins remaining)

8. **blob-countdown-concerned.png** - Blob slightly worried
   - WHERE USED: Active Call (4-5 mins remaining)

9. **blob-coin.png** - Blob holding coin, hopeful
   - WHERE USED: Payment prompt modal

10. **blob-variations.png** (10 unique expressions) - Simple face variations
    - WHERE USED: Blind Card Picker cards (#1-10)

**Style**: Organic hand-drawn feel, simple dot eyes and curved mouth, soft pastel colors matching palette