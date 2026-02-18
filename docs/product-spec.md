# Finish By - Product Specification
**Version 1.0 MVP**

## Product Vision

**For people who buy books but don't finish them.**

Finish By is a compassionate accountability system that helps readers complete books through adaptive pacing and guilt-free recalculation. Unlike gamified reading apps that shame users for broken streaks, Finish By treats reading as a flexible commitment that adapts to real life.

## Core Insight

Most reading apps fail because they:
- Track pages mechanically without understanding life happens
- Gamify streaks creating anxiety instead of motivation  
- Shame users when they fall behind
- Assume daily reading is the only valid approach

**Finish By succeeds by:**
- Adapting pace automatically when users miss days
- Offering lifestyle-based commitments (gentle, balanced, intense)
- Using reassuring language that removes guilt
- Treating buffer days as built-in flexibility

---

## Target User

### Primary Persona: "The Book Collector"
- **Age:** 25-45
- **Behavior:** Buys 5-10 books/year, finishes 1-3
- **Pain Point:** Guilt about unread books on shelf
- **Motivation:** Wants to actually finish what they start
- **Reading Style:** Inconsistent due to work/life, not lack of interest

### Secondary Persona: "The Goal-Oriented Reader"  
- **Age:** 22-40
- **Behavior:** Sets annual reading goals, falls behind by March
- **Pain Point:** Can't maintain momentum after setbacks
- **Motivation:** Wants structure without rigidity
- **Reading Style:** Bursts of progress followed by gaps

---

## MVP Feature Set

### 1. Book Management
**Core Actions:**
- ✅ Add book (title, pages, finish date)
- ✅ Select commitment level (gentle/balanced/intense)
- ✅ Select reading speed (slow/moderate/fast)
- ✅ Update current page
- ✅ Delete book
- ✅ Mark as complete

**V1 Simplifications:**
- Manual page count entry (no API integration)
- One active book at a time (freemium model later)
- No book cover images
- No categories/genres

### 2. Adaptive Pacing Engine
**Automatic Calculations:**
- ✅ Pages per day based on commitment level
- ✅ Buffer days (built-in skip days)
- ✅ Recalculation when user falls behind
- ✅ Intensity score (difficulty warning)
- ✅ Estimated reading time per session

**Display to User:**
- ✅ Daily page target
- ✅ Days remaining
- ✅ Progress percentage
- ✅ Current buffer status
- ✅ Suggested reading window (time of day)

### 3. Smart Messaging System
**Message Types:**
- ✅ On track: "X pages/day to finish on [date]"
- ✅ Behind schedule: "Life happens. We've recalculated—you're still on track."
- ✅ Way behind: "Want to extend your finish date? No pressure."
- ✅ Milestone reached: "Halfway there! X days left"
- ✅ Completed: "You finished! Completed in X days 🎉"

**Tone Guidelines:**
- Never use "streak," "failed," or "missed"
- Always offer adjustment options
- Celebrate progress without creating pressure
- Use "we" language (collaborative, not judgmental)

### 4. Daily Reminders (Optional)
**Notification Schedule:**
- ✅ Toggle on/off
- ✅ Frequency based on commitment level:
  - Gentle: 4 days/week
  - Balanced: 6 days/week  
  - Intense: 7 days/week
- ✅ Time customization (default: 8 PM)

**V1 Implementation:**
- Web: Browser notification API
- Native: Push notifications
- Message: "{X} pages of {BookTitle} 📖"

### 5. Progress Visualization
**Visual Elements:**
- ✅ Linear progress bar (pages read / total pages)
- ✅ Commitment badge (gentle/balanced/intense)
- ✅ Stats grid (finish date, days left, buffer)
- ✅ Color-coded status messages

**V1 Exclusions:**
- No calendar heatmap
- No reading streak counter
- No leaderboards
- No badges/achievements

---

## User Flow

### First-Time User Experience
1. **Landing:** See tagline "For people who buy books but don't finish them"
2. **Add Book:** Prompted to add first book
3. **Configuration:** Choose commitment level and speed, get suggested finish date
4. **Preview Plan:** See "Your reading plan" summary before confirming
5. **Dashboard:** Immediately see daily target and next steps

### Daily Usage Loop
1. **Open App:** See today's target and motivational message
2. **Update Progress:** Enter current page after reading session
3. **Get Feedback:** See recalculated pace and affirming message
4. **Close App:** Optional reminder set for next reading day

### Adaptation Scenario
1. **User Misses 3 Days:** App detects gap in activity
2. **Silent Recalculation:** New pages/day calculated automatically
3. **Gentle Nudge:** "Life happens. We've recalculated. 15 pages/day gets you on track."
4. **Option Presented:** "Want to extend by a week?"

---

## Technical Specifications

### Platform Strategy (MVP)

**Phase 1: Web App (PWA)**
- Deploy first for fastest iteration
- Progressive Web App for mobile-like experience
- Browser notifications for reminders
- Works offline with service workers
- Installable to home screen

**Phase 2: Native Apps**
- iOS App (Swift/SwiftUI)
- Android App (Kotlin)
- True push notifications
- Better offline support
- App Store presence

### Tech Stack (Web MVP)

**Frontend:**
- React 18 (hooks-based)
- Tailwind CSS for styling
- Lucide icons
- Storage API for persistence (localStorage fallback)

**Backend (Minimal):**
- Supabase or Firebase for:
  - User authentication
  - Data sync across devices
  - Push notification orchestration
- Stripe for future subscription handling

**Hosting:**
- Vercel or Netlify (auto-deploy from GitHub)
- Custom domain: finishby.app
- Free tier sufficient for beta

### Data Model

```javascript
User {
  id: string,
  email: string,
  notificationPreferences: {
    enabled: boolean,
    time: string  // "20:00"
  },
  createdAt: timestamp
}

Book {
  id: string,
  userId: string,
  title: string,
  totalPages: number,
  targetDate: date,
  commitmentLevel: 'gentle' | 'balanced' | 'intense',
  readingSpeed: 'slow' | 'moderate' | 'fast',
  startDate: date,
  lastRead: date,
  pagesRead: number,
  missedDays: number,
  readingSessions: Array<{
    date: date,
    pagesRead: number,
    totalPages: number
  }>,
  completedAt: date | null,
  createdAt: timestamp
}
```

---

## Success Metrics

### North Star Metric
**Book Completion Rate:** % of books added that get marked as finished

### Supporting Metrics
- **User Retention:** 7-day, 30-day active users
- **Avg Days to Completion:** How long users actually take vs. target
- **Adjustment Rate:** % of users who extend/modify goals (shows engagement)
- **Daily Active Users (DAU):** Regular check-ins
- **Books Added per User:** Indicates satisfaction and trust

### Early Indicators (Beta)
- 50+ beta signups
- 30% weekly active users
- 3+ books completed total
- User interviews showing "this is different" feedback

---

## Go-to-Market Strategy

### Beta Launch (Weeks 1-4)
**Distribution:**
- ProductHunt launch
- Twitter/X personal network
- Reddit r/books, r/productivity
- Indie Hackers community
- Email to personal contacts

**Target:** 100-200 beta users

**Feedback Collection:**
- In-app feedback form
- Weekly email check-ins
- 1:1 user interviews (10-15 users)

### Public Launch (Month 2-3)
**Channels:**
- App Store / Google Play (if native ready)
- SEO content: "reading accountability apps," "how to finish books"
- TikTok/Instagram: short demos showing "anti-guilt" messaging
- Partnerships with book influencers/BookTube creators

**Pricing Model:**
- Free: 1 active book, basic features
- Pro ($4.99/month or $39/year):
  - Unlimited books
  - Advanced analytics (reading velocity, completion forecasts)
  - Priority support
  - Audiobook tracking (future)
  - Book club mode (future)

---

## Competitive Analysis

### Goodreads Reading Challenge
- **Strength:** Social, huge user base
- **Weakness:** Annual goal only, no daily pacing, no guilt-free adaptation
- **Our Edge:** Daily accountability with flexibility

### Readwise Reader / Matter
- **Strength:** Content aggregation, highlighting
- **Weakness:** Not focused on book completion, no pacing
- **Our Edge:** Single-purpose completion tool

### StoryGraph
- **Strength:** Mood tracking, detailed stats
- **Weakness:** Complex UI, still shame-based on streaks
- **Our Edge:** Simpler, kinder, adaptive

### Habit Trackers (Habitica, Streaks)
- **Strength:** General habit tracking
- **Weakness:** Not book-specific, streak anxiety
- **Our Edge:** Reading-optimized, no streaks

**Our Unique Position:** The only reading tool that adapts to life instead of punishing inconsistency.

---

## Roadmap

### V1.0 MVP (Weeks 1-6)
- ✅ Core app functionality
- ✅ Web deployment
- ✅ Beta user access
- ✅ Basic analytics tracking

### V1.1 Iteration (Weeks 7-10)
- 📱 PWA optimizations
- 🔔 Push notification refinement
- 📊 Reading velocity tracking
- 🎨 UI polish based on feedback

### V2.0 Scale (Months 3-6)
- 📚 Multiple active books
- 📱 Native iOS app
- 🤝 Book club mode (shared finish dates)
- 📖 Audiobook tracking
- 🔍 Book search API integration

### V3.0 Growth (Months 6-12)
- 🤖 AI-generated personalized encouragement
- 📈 Advanced reading insights
- 🏆 Completion certificates (downloadable)
- 🌍 Social features (friend accountability)
- 💰 Revenue optimization

---

## Risk Mitigation

### Technical Risks
- **Storage limits:** Use cloud sync early to avoid data loss
- **Notification delivery:** Test extensively across browsers/devices
- **Scaling costs:** Start with free tier, monitor usage

### Product Risks
- **Too simple:** If users want more features, add strategically
- **Not sticky:** If retention is low, increase touchpoints (weekly summaries)
- **Wrong audience:** If "book buyers" aren't engaged, pivot to students

### Market Risks
- **Goodreads dominance:** Position as complement, not replacement
- **App fatigue:** Emphasize "one thing done well" in marketing
- **Subscription resistance:** Keep free tier valuable, show clear Pro benefits

---

## Open Questions for Beta

1. **Commitment level naming:** Are gentle/balanced/intense clear? Try alternatives?
2. **Notification timing:** Is 8 PM default good, or should we ask upfront?
3. **Adjustment friction:** Do users find it easy to extend dates when needed?
4. **Messaging tone:** Is "Life happens" reassuring or patronizing?
5. **Buffer visibility:** Should buffer days be more prominent?
6. **Multi-book support:** Should free tier allow 2-3 books instead of just 1?

---

## Success Criteria for MVP

**Ship if:**
- ✅ Users can add book and see accurate daily target
- ✅ Adaptive recalculation works correctly
- ✅ Messages are encouraging (not guilt-inducing)
- ✅ No critical bugs in core flow
- ✅ Performance is smooth on mobile browsers

**Iterate before shipping if:**
- ❌ Calculation logic has edge cases that feel broken
- ❌ Messaging feels robotic or unhelpful
- ❌ UI is confusing to first-time users
- ❌ Data doesn't persist reliably

---

## Contact for Feedback

Beta users: Use in-app feedback or email beta@finishby.app
Team questions: See product lead for clarification on tone, features, or priorities.
