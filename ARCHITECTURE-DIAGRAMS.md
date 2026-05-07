# 📊 Visual Architecture & Flow Diagrams

## App State Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        APP STARTUP                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Load stored pattern from    │
        │      IndexedDB               │
        │  (tap-pattern key)           │
        └──────┬───────────────────────┘
               │
        ┌──────▼──────────────────────────────┐
        │  Show InteractiveOrb                │
        │  Component (locked state)           │
        └──────┬───────────────────────────────┘
               │
        ┌──────▼──────────────────────────────────────┐
        │  User taps pattern:                         │
        │  1. Top (200-700ms)                         │
        │  2. Right (500-700ms)                       │
        │  3. Bottom (1300-1500ms)                    │
        └──────┬───────────────────────────────────────┘
               │
       ┌───────▴──────────┐
       │                  │
    ✅ SUCCESS        ❌ ERROR
       │                  │
       ▼                  ▼
   Pattern         Reset sequence
   matches    
       │            
       ▼
   Unlock app
       │
       ▼
┌──────────────────────────────┐
│  Dashboard with:             │
│  - Book list                 │
│  - Progress bars             │
│  - Reading stats             │
│  - Adaptive messages         │
└──────────────────────────────┘
```

---

## Update Progress Function Flow

```
User clicks
"Update Progress"
    │
    ▼
┌────────────────────────┐
│ setIsEditing(true)     │
│ Show input field       │
└────┬───────────────────┘
     │
     ▼
┌────────────────────────────────────┐
│ User types new page number         │
│ Input: "150"                       │
│ onChange: parseInt("150") → 150    │
└────┬───────────────────────────────┘
     │
     ▼
┌────────────────────────────────────┐
│ User clicks "Save"                 │
└────┬───────────────────────────────┘
     │
     ▼
┌────────────────────────────────────┐
│ handleSaveProgress()               │
│ const pageValue = 150              │
│ Check: 150 ≠ book.pagesRead (100)? │
│ YES → Call onUpdate                │
└────┬───────────────────────────────┘
     │
     ▼
┌────────────────────────────────────┐
│ updateProgress(bookId, 150)        │
│ Calculate:                         │
│ - Pages read today: 50             │
│ - Last read date                   │
│ - Missed days                      │
│ - Add reading session              │
└────┬───────────────────────────────┘
     │
     ▼
┌────────────────────────────────────┐
│ Save to storage:                   │
│ window.storage.set(                │
│   "book:123",                      │
│   JSON.stringify({                 │
│     ...book,                       │
│     pagesRead: 150,                │
│     ...                            │
│   })                               │
│ )                                  │
└────┬───────────────────────────────┘
     │
     ▼
┌────────────────────────────────────┐
│ Update UI:                         │
│ - Progress bar updates             │
│ - Page count displays "150 of 300" │
│ - Metrics recalculate              │
│ - Adaptive message updates         │
└────────────────────────────────────┘
```

---

## Orb Pattern Recognition Flow

```
┌────────────────────────────────────┐
│    ORBS IDLE STATE                 │
│    Waiting for first tap           │
│    Color: BLUE                     │
│    Animation: Breathing            │
└────┬───────────────────────────────┘
     │
     │ User clicks on ORBS at top (270°)
     │ Zone detection: angle → "top"
     │
     ▼
┌────────────────────────────────────┐
│ Validate first tap:                │
│ Expected: zone='top'               │
│ Actual: zone='top'  ✓              │
└────┬───────────────────────────────┘
     │
     ▼
┌────────────────────────────────────┐
│    ORB LOCKED STATE                │
│    Waiting for second tap          │
│    Color: BLUE                     │
│    Size: 1.1x (enlarge)            │
│    Animation: Pulsing              │
│    Display: "Step 2/3"             │
└────┬───────────────────────────────┘
     │
     │ ~300ms later: User clicks right zone (0°)
     │ Zone detection: angle → "right"
     │ Timing validation: |t - 300| < 200? YES ✓
     │
     ▼
┌────────────────────────────────────┐
│ Validate second tap:               │
│ Expected: zone='right', time=300ms │
│ Actual: zone='right', time=298ms ✓ │
└────┬───────────────────────────────┘
     │
     ▼
┌────────────────────────────────────┐
│    ORB LOCKED STATE                │
│    Waiting for third tap           │
│    Display: "Step 3/3"             │
│    Visual: Zone 1&2 highlighted    │
└────┬───────────────────────────────┘
     │
     │ ~500ms later: User clicks bottom zone (90°)
     │ Zone detection: angle → "bottom"
     │ Timing validation: |t - 500| < 200? YES ✓
     │
     ▼
┌────────────────────────────────────┐
│ Validate third tap:                │
│ Expected: zone='bottom', time=500ms│
│ Actual: zone='bottom', time=502ms ✓│
│ Sequence complete!                 │
└────┬───────────────────────────────┘
     │
     ▼
┌────────────────────────────────────┐
│    ORB SUCCESS STATE               │
│    Pattern matched!                │
│    Color: GREEN                    │
│    Size: 1.2x (enlarge more)       │
│    Animation: Particle burst       │
│    Display: "✓ Pattern Complete!"  │
│    Duration: 1200ms                │
└────┬───────────────────────────────┘
     │
     ▼
┌────────────────────────────────────┐
│ Store pattern:                     │
│ window.storage.set(                │
│   'tap-pattern',                   │
│   JSON.stringify(tapSequence)      │
│ )                                  │
│                                    │
│ Trigger callback:                  │
│ onPatternComplete(tapSequence)     │
└────┬───────────────────────────────┘
     │
     ▼
┌────────────────────────────────────┐
│ Return to IDLE (after 1200ms):     │
│ - Reset tapSequence                │
│ - Return to blue color             │
│ - Reset size to 1.0x               │
│ - Clear display                    │
└────────────────────────────────────┘
```

---

## Zone Detection Algorithm

```
        TOP (270°)
             │
        ∠45-90°
             │
    ┌────────┼────────┐
    │    2   │   1    │
    │ LEFT   │ RIGHT  │
    │        │        │
    └────────●────────┘ ← CENTER
    │    3   │   4    │
    │ BOTTOM │ (270°) │
    │        │        │
    └────────┼────────┘
             │
        BOTTOM (90°)

Zone Detection Formula:
─────────────────────
angle = atan2(dy, dx) in degrees
normalized = angle < 0 ? angle + 360 : angle

If 315° < norm < 45°    → RIGHT (0°)
If 45° ≤ norm < 135°    → BOTTOM (90°)
If 135° ≤ norm < 225°   → LEFT (180°)
If 225° ≤ norm < 315°   → TOP (270°)
```

---

## Data Flow: Add Book → Update Progress → Display

```
┌─────────────────────────────────────────────────────────────┐
│ USER ACTION: Add Book                                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │ AddBookForm Component        │
        │ State: {                     │
        │   title: "1984"              │
        │   totalPages: 328            │
        │   targetDate: "2026-04-17"   │
        │   commitmentLevel: balanced  │
        │ }                            │
        └──────┬───────────────────────┘
               │ Form submit
               ▼
        ┌──────────────────────────────┐
        │ App.addBook() function       │
        │ Create book object:          │
        │ {                            │
        │   id: "1234567890",          │
        │   title: "1984",             │
        │   totalPages: 328,           │
        │   pagesRead: 0,              │
        │   startDate: "2026-03-17",   │
        │   lastRead: "2026-03-17",    │
        │   missedDays: 0,             │
        │   readingSessions: []        │
        │ }                            │
        └──────┬───────────────────────┘
               │ Storage write
               ▼
        ┌──────────────────────────────┐
        │ IndexedDB / Storage API      │
        │ Key: "book:1234567890"       │
        │ Value: JSON string           │
        └──────┬───────────────────────┘
               │ Load books
               ▼
        ┌──────────────────────────────┐
        │ setBooks() updates state     │
        │ books = [...books, newBook]  │
        └──────┬───────────────────────┘
               │
               ▼
        ┌──────────────────────────────┐
        │ BookCard component renders   │
        │ with all data                │
        └──────────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│ USER ACTION: Update Progress                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │ BookCard component           │
        │ User clicks "Update"         │
        │ setIsEditing(true)           │
        │ Show input field             │
        │ currentPage = 0              │
        └──────┬───────────────────────┘
               │
               ▼
        ┌──────────────────────────────┐
        │ Input field appears          │
        │ User enters: "125"           │
        │ onChange: currentPage = 125  │
        └──────┬───────────────────────┘
               │ User clicks Save
               ▼
        ┌──────────────────────────────┐
        │ handleSaveProgress():        │
        │ pageValue = parseInt(125)    │
        │ = 125                        │
        │ Check: 125 ≠ 0? YES          │
        │ Call onUpdate()              │
        └──────┬───────────────────────┘
               │
               ▼
        ┌──────────────────────────────┐
        │ App.updateProgress()         │
        │ Calculate metrics:           │
        │ - pagesRemaining: 328 - 125  │
        │ - pagesReadToday: 125 - 0    │
        │ - lastRead: today's date     │
        │ - Create reading session     │
        └──────┬───────────────────────┘
               │ Storage write
               ▼
        ┌──────────────────────────────┐
        │ IndexedDB update:            │
        │ Key: "book:1234567890"       │
        │ Value: Updated JSON          │
        └──────┬───────────────────────┘
               │
               ▼
        ┌──────────────────────────────┐
        │ setBooks() state update      │
        │ BookCard re-renders          │
        └──────┬───────────────────────┘
               │
               ▼
        ┌──────────────────────────────┐
        │ DISPLAY UPDATES:             │
        │ Progress bar: 125/328 = 38%  │
        │ Pages shown: "125 of 328"    │
        │ Metrics recalculate:         │
        │ - daysRemaining              │
        │ - adjustedPagesPerDay        │
        │ - bufferDays                 │
        │ Adaptive message updates     │
        └──────────────────────────────┘
```

---

## Orb States & Transitions

```
                    ┌─────────────────┐
                    │   ERROR STATE   │
                    │   (600ms)       │
                    │ Red, shaking    │
                    └─────────────────┘
                           ▲
                           │ (wrong zone/timing)
                           │
    ┌──────────────────────┼──────────────────────┐
    │                      │                      │
    ▼                      │                      ▼
IDLE STATE          LOCKED STATE            SUCCESS STATE
Blue, breathing     Blue, pulsing (1.1x)    Green, glowing (1.2x)
No input yet        Waiting for next tap    Pattern complete
                    (step N/3 shown)        Particle burst
                                            (1200ms)
    │                      ▲                      │
    │ (correct tap)        │ (correct tap)        │ (after delay)
    └──────────────────────┴──────────────────────┘
                           │
                           │ (reset)
                           ▼
                    Back to IDLE
```

---

## Performance Timeline

```
App Load
  ├─ Load books: ~50ms
  ├─ Render app: ~100ms
  └─ Total: ~150ms

User Taps Orb
  ├─ Click detected: <1ms
  ├─ Zone calculation: <2ms
  ├─ Pattern validation: <5ms
  ├─ Animation start: <1ms
  └─ Total: <10ms

Storage Operation
  ├─ Write pattern: ~50ms
  ├─ Read pattern: ~30ms
  └─ Total: ~100ms

Unlock & Transition
  ├─ Pattern recognition: <5ms
  ├─ Storage write: ~50ms
  ├─ State update: <5ms
  ├─ Component unmount: <10ms
  ├─ Dashboard render: ~100ms
  └─ Total: ~170ms
```

---

## Component Hierarchy

```
App (FinishBy)
├─ InteractiveOrb (when locked)
│  ├─ Canvas (Orb rendering)
│  └─ Zone indicators
│
├─ BookCard (when unlocked, for each book)
│  ├─ Progress bar
│  ├─ Stats grid
│  │  ├─ Finish by date
│  │  ├─ Days remaining
│  │  └─ Buffer days
│  ├─ Commitment badge
│  ├─ Adaptive message
│  ├─ Reading window hint
│  └─ Update input / button
│
└─ AddBookForm (when showAddBook=true)
   ├─ Title input
   ├─ Pages input
   ├─ Commitment selector
   ├─ Speed selector
   ├─ Date picker
   └─ Submit button
```

---

## Storage Structure

```
IndexedDB Database
│
├─ Object Store: "books"
│  ├─ Key: "book:1234567890"
│  │  Value: {
│  │    id: "1234567890",
│  │    title: "1984",
│  │    totalPages: 328,
│  │    pagesRead: 125,
│  │    startDate: "2026-03-17",
│  │    targetDate: "2026-04-17",
│  │    lastRead: "2026-03-20",
│  │    commitmentLevel: "balanced",
│  │    readingSpeed: "moderate",
│  │    missedDays: 2,
│  │    readingSessions: [
│  │      {
│  │        date: "2026-03-18",
│  │        pagesRead: 45,
│  │        totalPages: 45
│  │      },
│  │      {
│  │        date: "2026-03-20",
│  │        pagesRead: 80,
│  │        totalPages: 125
│  │      }
│  │    ]
│  │  }
│  └─ Key: "book:9876543210"
│     (another book...)
│
└─ Key: "tap-pattern"
   Value: [
     { zone: "top", timestamp: 1234567890 },
     { zone: "right", timestamp: 1234567890 },
     { zone: "bottom", timestamp: 1234567890 }
   ]
```

---

**Diagrams Version**: 1.0  
**Last Updated**: March 17, 2026
