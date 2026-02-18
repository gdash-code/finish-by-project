# Finish By - Algorithm Logic Specification

## Core Algorithm: Adaptive Pacing Engine

### 1. Input Parameters

**User Inputs:**
- Book title (string)
- Total pages (integer)
- Target finish date (date)
- Commitment level (enum: gentle, balanced, intense)
- Reading speed (enum: slow, moderate, fast)

**System Tracks:**
- Start date (auto-captured)
- Current page (updated by user)
- Last read date (timestamp)
- Missed days counter (integer)
- Reading sessions (array of {date, pagesRead})

### 2. Commitment Level Logic

Each commitment level determines reading frequency:

```javascript
const COMMITMENT_MULTIPLIERS = {
  gentle: 4/7,    // 4 days per week = 57% of total days
  balanced: 6/7,  // 6 days per week = 86% of total days
  intense: 1      // 7 days per week = 100% of total days
}
```

**Key Insight:** This is NOT about reading speed—it's about lifestyle flexibility.
- Gentle: You have 3 buffer days per week to skip
- Balanced: You have 1 buffer day per week
- Intense: No buffer days, read every day

### 3. Core Calculations

#### A. Effective Reading Days
```
totalDays = targetDate - startDate
effectiveReadingDays = totalDays × commitmentMultiplier
bufferDays = totalDays - effectiveReadingDays
```

**Example:**
- 30-day timeline, Balanced commitment
- effectiveReadingDays = 30 × (6/7) = 25.7 ≈ 26 days
- bufferDays = 30 - 26 = 4 days

#### B. Initial Pages Per Day
```
originalPagesPerDay = ceiling(totalPages / effectiveReadingDays)
```

**Example:**
- 300-page book, 26 effective reading days
- originalPagesPerDay = ceiling(300/26) = 12 pages/day

#### C. Adaptive Recalculation
This is the NO-GUILT magic. Every time user updates progress:

```
daysRemaining = targetDate - today
pagesRemaining = totalPages - currentPage
effectiveRemainingDays = daysRemaining × commitmentMultiplier
adjustedPagesPerDay = ceiling(pagesRemaining / effectiveRemainingDays)
```

**Example - User Falls Behind:**
- Started with 12 pages/day
- After 10 days: read 80 pages (should be at 120)
- Days remaining: 20
- Effective days remaining: 20 × (6/7) = 17
- Pages remaining: 220
- NEW target: ceiling(220/17) = 13 pages/day

**The message:** "We've recalculated. You're at 13 pages/day now—still totally doable."

### 4. Intensity Score (Difficulty Detector)

```
intensityScore = adjustedPagesPerDay / originalPagesPerDay
```

**Interpretation:**
- intensityScore < 1.0: Ahead of pace (celebrate!)
- intensityScore = 1.0: Right on track
- intensityScore 1.0-1.2: Slightly behind (normal)
- intensityScore 1.2-1.5: Catching up needed
- intensityScore > 1.5: Consider adjusting goal

**Adaptive Response:**
- Score > 1.5: Suggest extending date or switching to gentler commitment
- Score > 2.0: Automatically suggest "Would you like to add 7 days?"

### 5. Reading Speed Calibration

Reading speed determines suggested finish dates ONLY:

```javascript
const PAGES_PER_DAY_BASE = {
  slow: 15,      // ~30 min/day
  moderate: 25,  // ~50 min/day  
  fast: 40       // ~80 min/day
}
```

**Auto-suggest finish date:**
```
suggestedDays = (totalPages / baseReadingSpeed) × (7 / commitmentDays)
suggestedFinishDate = today + suggestedDays
```

**Example:**
- 300 pages, moderate speed, balanced commitment
- suggestedDays = (300/25) × (7/6) = 12 × 1.17 = 14 days
- Suggests: "Finish in 2 weeks"

### 6. Buffer Days System

Buffer days are "free skip days" built into the plan:

```
totalBufferDays = totalDays - effectiveReadingDays
bufferDaysRemaining = effectiveRemainingDays - (pagesRemaining / originalPagesPerDay)
```

**Display to user:**
- "You have 3 buffer days left this month"
- When buffer depleted: "No buffer left, but you can still finish!"

### 7. Missed Days Tracking

```
missedDays = 0
for each day between lastReadDate and today:
  if day is a planned reading day (based on commitment):
    missedDays++
```

**Trigger adaptive messaging:**
- missedDays > 2: "Life happens. We've recalculated."
- missedDays > 5: "Want to switch to Gentle commitment?"
- missedDays > 10: "Still interested in this book?"

### 8. Reading Window Suggestions

Based on pages per day, estimate time commitment:

```
estimatedMinutes = adjustedPagesPerDay / 2.5  // avg 250 words/min, ~250 words/page
```

**Suggestions by commitment level:**
- Gentle: "{time}–{time+15} min when you feel like it"
- Balanced: "{time} min (morning or evening)"
- Intense: "{time} min daily (build the habit)"

### 9. Progress Milestones

Trigger celebratory messages:
- 25% complete: "You're getting into it!"
- 50% complete: "Halfway there! {X} days left"
- 75% complete: "Home stretch! Just {X} pages"
- 100% complete: "You finished! Completed in {X} days 🎉"

### 10. Daily Notification Logic

**When to send (if enabled):**
```javascript
const commitmentSchedules = {
  gentle: ['Mon', 'Tue', 'Thu', 'Sat'],  // 4 days
  balanced: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],  // 6 days
  intense: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']  // 7 days
}
```

**Message variations:**
- On schedule: "Time for {X} pages of {BookTitle}"
- Behind schedule: "No pressure—{X} pages gets you back on track"
- Ahead of schedule: "Crushing it! Only {X} pages today"
- Haven't read in 3+ days: "Still there? We've adjusted your pace—jump back in when ready"

## Key Differentiators

1. **No Streaks:** We don't gamify daily reading. Commitment level handles frequency.

2. **No Guilt Math:** When you fall behind, we silently recalculate and present the new reality as achievable.

3. **Lifestyle First:** Commitment levels respect your life, not your willpower.

4. **Transparent Difficulty:** Intensity score lets users see when they're overcommitting.

5. **Always Escapable:** Every message includes "Want to adjust?" options.

## Edge Cases

1. **Target date in past:** Show "Want to extend?" with gentle tone
2. **Zero pages remaining:** Celebration mode, no more calculations
3. **Impossible pace (>100 pages/day):** Auto-suggest realistic extension
4. **Book added day before target date:** Show "1-day sprint" with humor
5. **User reads ahead of schedule:** Celebrate and show "finish early by X days"

## Future Enhancements

1. **Reading velocity tracking:** Analyze actual pages/session to calibrate speed
2. **Smart recalculation timing:** Only recalc after significant deviation
3. **Mood-aware messaging:** Different tone based on progress pattern
4. **Multiple books balancing:** Suggest which book to prioritize today
5. **Social accountability:** Share finish date with friend, get mutual updates
