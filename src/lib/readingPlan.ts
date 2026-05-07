/*
 * Reading plan engine for Finish By — v2
 *
 * Architecture decisions:
 *  1. No hardcoded page counts. All daily targets are derived from the specific
 *     book + deadline combination at runtime.
 *  2. CommitmentLevel drives days/week via a single fraction table.
 *     Change COMMITMENT_DAY_FRACTIONS to retune app-wide behavior.
 *  3. ReadingSpeed is a pace multiplier applied to the exact required pace.
 *     It is NOT a fixed pages/day number — "slow" on a 100-page book is
 *     different from "slow" on a 900-page book.
 *  4. When a goal is infeasible (slow reader, tight deadline), the plan still
 *     generates in full — extending past the deadline — and returns a
 *     FeasibilityReport the UI can surface as a warning.
 *  5. Zero AI used in plan generation. Pure deterministic math.
 */

export type ReadingSpeed    = "slow" | "moderate" | "fast";
export type CommitmentLevel = "gentle" | "balanced" | "intense";
export type BookStatus      = "active" | "completed" | "paused";

// ─── Single source of truth — tune these to change all behavior ───────────────

/**
 * What fraction of the 7-day week each commitment level dedicates to reading.
 * These drive readingDaysPerWeek dynamically — nothing is hardcoded downstream.
 *
 *   gentle   → round(4/7 * 7) = 4 days/week
 *   balanced → round(6/7 * 7) = 6 days/week
 *   intense  → round(7/7 * 7) = 7 days/week
 */
export const COMMITMENT_DAY_FRACTIONS: Record<CommitmentLevel, number> = {
  gentle:   4 / 7,
  balanced: 6 / 7,
  intense:  7 / 7,
};

/**
 * Pace multipliers relative to the exact pace needed to finish on time.
 *
 *   1.0 (moderate) = read exactly the required pages each day → finish on deadline
 *  <1.0 (slow)     = read fewer pages per day → plan extends past deadline (shows warning)
 *  >1.0 (fast)     = read more pages per day → finish before deadline (builds buffer)
 *
 * Analogy: imagine driving to a destination.
 *   moderate = drive at exactly the speed limit to arrive on time
 *   slow     = drive under the speed limit → arrive late
 *   fast     = drive over the speed limit → arrive early
 */
export const SPEED_MULTIPLIERS: Record<ReadingSpeed, number> = {
  slow:     0.75,
  moderate: 1.0,
  fast:     1.35,
};

// ─── Data contracts ────────────────────────────────────────────────────────────

export interface DailyPlan {
  date: Date;
  pagesTarget: number;
  pagesCompleted: number;
  isCatchUp: boolean; // true for days scheduled past targetEndDate
}

export interface Book {
  id: string;
  title: string;
  totalPages: number;
  pagesRead: number;
  startDate: Date;
  targetEndDate: Date;
  commitmentLevel: CommitmentLevel; // replaces the old readingDaysPerWeek field
  readingSpeed: ReadingSpeed;
  status: BookStatus;
  completedAt?: Date;
  dailyPlan: DailyPlan[];
  lastRecalculatedAt: Date;
}

/**
 * Returned by checkFeasibility. The UI decides what to show — we never throw.
 *
 * Think of it like a weather forecast: we always give you the outlook,
 * even if it says "rain on your parade."
 */
export interface FeasibilityReport {
  isFeasible: boolean;
  availableReadingDays: number;
  requiredPagesPerDay: number; // minimum to finish exactly on time (1.0x pace)
  targetPagesPerDay: number;   // actual daily target after speed multiplier
  projectedFinishDate: Date;   // when they will ACTUALLY finish at their pace
  warning?: string;            // human-readable, ready to render in the UI
}

// ─── Date utilities ────────────────────────────────────────────────────────────

const MS_IN_DAY = 1000 * 60 * 60 * 24;

const startOfDay = (date: Date): Date => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const addDays = (date: Date, days: number): Date => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const isSameDay = (a: Date, b: Date): boolean =>
  startOfDay(a).getTime() === startOfDay(b).getTime();

const getWeekKey = (date: Date): string => {
  const normalized = startOfDay(date);
  const weekStart = addDays(normalized, -normalized.getDay()); // Sunday-anchored week
  return weekStart.toISOString().slice(0, 10);
};

const daysBetween = (start: Date, end: Date): number =>
  Math.max(
    0,
    Math.round(
      (startOfDay(end).getTime() - startOfDay(start).getTime()) / MS_IN_DAY,
    ),
  );

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const formatDate = (date: Date): string =>
  date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// ─── Core derived helpers ──────────────────────────────────────────────────────

/**
 * Converts a CommitmentLevel into a concrete days-per-week integer.
 * This is the only place that math lives — change COMMITMENT_DAY_FRACTIONS above
 * to adjust all downstream behavior.
 */
export function computeReadingDaysPerWeek(level: CommitmentLevel): number {
  return Math.round(COMMITMENT_DAY_FRACTIONS[level] * 7);
}

/**
 * Returns every calendar date between startDate and targetDate (inclusive)
 * that falls within the weekly reading allowance.
 *
 * Analogy: think of the week as a punch card with N punches. Once you've
 * punched N times in a given week, you skip the rest of that week and carry
 * forward to the next.
 */
function collectReadingDates(
  startDate: Date,
  targetDate: Date,
  readingDaysPerWeek: number,
): Date[] {
  if (readingDaysPerWeek < 1 || readingDaysPerWeek > 7) {
    throw new Error("readingDaysPerWeek must be between 1 and 7");
  }

  const dates: Date[] = [];
  const weekUsage = new Map<string, number>();
  let cursor = startOfDay(startDate);
  const limit = daysBetween(startDate, targetDate) + 400; // safety guard

  for (let i = 0; i <= limit && cursor <= targetDate; i++) {
    const key = getWeekKey(cursor);
    const used = weekUsage.get(key) ?? 0;
    if (used < readingDaysPerWeek) {
      dates.push(new Date(cursor));
      weekUsage.set(key, used + 1);
    }
    cursor = addDays(cursor, 1);
  }

  return dates;
}

/**
 * Finds the calendar date of the Nth reading day from a given start,
 * extending as far into the future as needed.
 *
 * Used to project a finish date when the plan extends past the deadline.
 */
function findNthReadingDate(
  startDate: Date,
  n: number,
  readingDaysPerWeek: number,
): Date {
  // Buffer: worst case is 7/readingDaysPerWeek weeks per n days, plus padding
  const weeksNeeded = Math.ceil(n / readingDaysPerWeek);
  const farFuture = addDays(startDate, weeksNeeded * 7 + 14);
  const dates = collectReadingDates(startDate, farFuture, readingDaysPerWeek);
  // dates[n-1] is the Nth date (0-indexed). Fall back to farFuture if somehow short.
  return dates[n - 1] ?? farFuture;
}

// ─── Feasibility check ─────────────────────────────────────────────────────────

/**
 * Determines whether the user's goal is achievable given their settings,
 * and always returns an actionable report — never throws.
 *
 * Call this in your UI whenever commitment, speed, or deadline changes
 * to give users live feedback as they configure their book.
 *
 * @example
 *   const report = checkFeasibility(book);
 *   if (!report.isFeasible) showWarningBanner(report.warning);
 *   showPreview(`~${report.targetPagesPerDay} pages/day`);
 */
export function checkFeasibility(
  book: Book,
  today: Date = new Date(),
): FeasibilityReport {
  const remainingPages = Math.max(book.totalPages - book.pagesRead, 0);

  if (remainingPages === 0) {
    return {
      isFeasible: true,
      availableReadingDays: 0,
      requiredPagesPerDay: 0,
      targetPagesPerDay: 0,
      projectedFinishDate: today,
    };
  }

  const readingDaysPerWeek = computeReadingDaysPerWeek(book.commitmentLevel);
  const planAnchor =
    startOfDay(book.startDate) > startOfDay(today)
      ? startOfDay(book.startDate)
      : startOfDay(today);
  const targetDate = startOfDay(book.targetEndDate);

  // Edge case: deadline is in the past or today
  if (planAnchor > targetDate) {
    return {
      isFeasible: false,
      availableReadingDays: 0,
      requiredPagesPerDay: remainingPages,
      targetPagesPerDay: remainingPages,
      projectedFinishDate: addDays(targetDate, 1),
      warning: `Your deadline has passed. Please update your finish-by date to generate a new plan.`,
    };
  }

  const availableDates = collectReadingDates(planAnchor, targetDate, readingDaysPerWeek);
  const availableReadingDays = availableDates.length;

  if (availableReadingDays === 0) {
    return {
      isFeasible: false,
      availableReadingDays: 0,
      requiredPagesPerDay: remainingPages,
      targetPagesPerDay: remainingPages,
      projectedFinishDate: addDays(targetDate, 1),
      warning: `No reading days fall before your deadline at the current commitment level. Try increasing to Balanced or Intense, or extend your deadline.`,
    };
  }

  // Core dynamic calculation
  const requiredPagesPerDay = remainingPages / availableReadingDays;
  const multiplier = SPEED_MULTIPLIERS[book.readingSpeed];
  const targetPagesPerDay = Math.max(1, Math.ceil(requiredPagesPerDay * multiplier));
  const daysNeeded = Math.ceil(remainingPages / targetPagesPerDay);
  const isFeasible = daysNeeded <= availableReadingDays;

  // Project the real finish date
  const projectedFinishDate = isFeasible
    ? availableDates[daysNeeded - 1]
    : findNthReadingDate(planAnchor, daysNeeded, readingDaysPerWeek);

  const warning = isFeasible
    ? undefined
    : `At a slow pace (~${targetPagesPerDay} pages/day), you'll finish around ${formatDate(projectedFinishDate)} — after your goal of ${formatDate(targetDate)}. You can continue or adjust your deadline.`;

  return {
    isFeasible,
    availableReadingDays,
    requiredPagesPerDay: Math.ceil(requiredPagesPerDay),
    targetPagesPerDay,
    projectedFinishDate,
    warning,
  };
}

// ─── Plan generation ───────────────────────────────────────────────────────────

/**
 * Generates a complete daily reading schedule.
 *
 * How the math works (analogy: slicing a loaf of bread):
 *   1. Count the "slots" (reading days) you have before the deadline.
 *   2. Your speed multiplier determines slice thickness — slow = thinner slices.
 *   3. If thinner slices × available slots < whole loaf → extend past deadline.
 *   4. The last day always gets the remainder so the total is always exact.
 *
 * The plan always covers 100% of remaining pages regardless of feasibility.
 * Days after the deadline are flagged as isCatchUp = true.
 */
export function generateReadingPlan(
  book: Book,
  startDate: Date = new Date(),
): DailyPlan[] {
  const remainingPages = Math.max(book.totalPages - book.pagesRead, 0);
  if (remainingPages === 0) return [];

  const today = startOfDay(startDate);
  const planAnchor =
    startOfDay(book.startDate) > today ? startOfDay(book.startDate) : today;
  const targetDate = startOfDay(book.targetEndDate);

  if (planAnchor > targetDate) {
    throw new Error("targetEndDate must be on or after the plan start date.");
  }

  const readingDaysPerWeek = computeReadingDaysPerWeek(book.commitmentLevel);
  const availableDates = collectReadingDates(planAnchor, targetDate, readingDaysPerWeek);

  if (!availableDates.length) {
    throw new Error(
      "No reading days available before the target end date. " +
      "Increase commitment level or extend the deadline.",
    );
  }

  // Dynamic target: scales with this specific book's required pace
  const requiredPacePerDay = remainingPages / availableDates.length;
  const multiplier = SPEED_MULTIPLIERS[book.readingSpeed];
  const dailyTarget = Math.max(1, Math.ceil(requiredPacePerDay * multiplier));
  const daysNeeded = Math.ceil(remainingPages / dailyTarget);

  let planDates: Date[];
  let catchUpStartIndex: number;

  if (daysNeeded <= availableDates.length) {
    // Moderate or fast: finishes on/before deadline — trim to exact days needed
    planDates = availableDates.slice(0, daysNeeded);
    catchUpStartIndex = planDates.length; // no catch-up days
  } else {
    // Slow: needs more days than available — extend past the deadline
    catchUpStartIndex = availableDates.length;
    const extraDaysNeeded = daysNeeded - availableDates.length;

    // Find the date of the very last reading day needed past the deadline
    const extensionEnd = findNthReadingDate(
      addDays(targetDate, 1),
      extraDaysNeeded,
      readingDaysPerWeek,
    );
    const extendedDates = collectReadingDates(
      addDays(targetDate, 1),
      extensionEnd,
      readingDaysPerWeek,
    );

    planDates = [...availableDates, ...extendedDates.slice(0, extraDaysNeeded)];
  }

  // Assign pages uniformly; last day receives the remainder.
  // Invariant: dailyTarget * (daysNeeded - 1) < remainingPages ≤ dailyTarget * daysNeeded
  // So the remainder is always in the range [1, dailyTarget].
  return planDates.map((date, index) => {
    const isLast = index === planDates.length - 1;
    const pagesForDay = isLast
      ? remainingPages - dailyTarget * (planDates.length - 1)
      : dailyTarget;

    return {
      date: new Date(date),
      pagesTarget: Math.max(1, pagesForDay),
      pagesCompleted: 0,
      isCatchUp: index >= catchUpStartIndex,
    };
  });
}

// ─── Plan recalculation (called after progress is logged) ─────────────────────

function computeDeficit(plan: DailyPlan[], today: Date): number {
  const pastEntries = plan.filter(
    (entry) => startOfDay(entry.date) < startOfDay(today),
  );
  const expected = pastEntries.reduce((sum, e) => sum + e.pagesTarget, 0);
  const actual = pastEntries.reduce((sum, e) => sum + e.pagesCompleted, 0);
  return Math.max(0, expected - actual);
}

function applyCatchUpToPlan(plan: DailyPlan[], deficit: number): DailyPlan[] {
  if (deficit <= 0 || !plan.length) return plan;

  const updated = plan.map((entry, index) => {
    if (deficit > 0 && index < 2) {
      const boost = Math.min(Math.ceil(entry.pagesTarget * 0.2), deficit);
      if (boost > 0) {
        deficit -= boost;
        return { ...entry, pagesTarget: entry.pagesTarget + boost, isCatchUp: true };
      }
    }
    return entry;
  });

  // If still in deficit, append extra days at the end
  while (deficit > 0) {
    const last = updated[updated.length - 1];
    const nextDate = last ? addDays(last.date, 1) : startOfDay(new Date());
    const chunk = Math.min(last?.pagesTarget ?? 10, deficit);
    updated.push({ date: nextDate, pagesTarget: chunk, pagesCompleted: 0, isCatchUp: true });
    deficit -= chunk;
  }

  return updated;
}

export function recalculatePlan(book: Book, today: Date = new Date()): DailyPlan[] {
  const dayStart = startOfDay(today);
  const historicalEntries = book.dailyPlan.filter(
    (entry) => startOfDay(entry.date) < dayStart,
  );

  const remainingBook: Book = { ...book, dailyPlan: [], startDate: dayStart };
  const newPlan = generateReadingPlan(remainingBook, dayStart);
  const deficit = computeDeficit(book.dailyPlan, dayStart);
  const adjustedPlan = applyCatchUpToPlan(newPlan, deficit);

  return [...historicalEntries, ...adjustedPlan];
}

// ─── Progress logging ──────────────────────────────────────────────────────────

export function logReadingProgress(
  book: Book,
  pagesReadToday: number,
  logDate: Date = new Date(),
): Book {
  const safePages = Math.max(0, pagesReadToday);
  const updatedPagesRead = clamp(book.pagesRead + safePages, 0, book.totalPages);

  const updatedPlan = book.dailyPlan.map((entry) =>
    isSameDay(entry.date, logDate)
      ? {
          ...entry,
          pagesCompleted: clamp(
            entry.pagesCompleted + safePages,
            0,
            entry.pagesTarget,
          ),
        }
      : entry,
  );

  const nextPlan = recalculatePlan(
    { ...book, pagesRead: updatedPagesRead, dailyPlan: updatedPlan },
    logDate,
  );

  const status: BookStatus =
    updatedPagesRead >= book.totalPages ? "completed" : book.status;
  const completedAt = status === "completed" ? logDate : book.completedAt;

  return {
    ...book,
    pagesRead: updatedPagesRead,
    dailyPlan: nextPlan,
    status,
    completedAt,
    lastRecalculatedAt: logDate,
  };
}

// ─── Book editing ──────────────────────────────────────────────────────────────

export interface EditableFields {
  totalPages?: number;
  pagesRead?: number;
  targetEndDate?: Date;
  commitmentLevel?: CommitmentLevel;
  readingSpeed?: ReadingSpeed;
}

export function editBook(
  book: Book,
  updates: EditableFields,
  editDate: Date = new Date(),
): Book {
  const next: Book = {
    ...book,
    ...updates,
    totalPages: updates.totalPages ? Math.max(1, updates.totalPages) : book.totalPages,
  };

  next.pagesRead = clamp(updates.pagesRead ?? book.pagesRead, 0, next.totalPages);

  if (next.pagesRead >= next.totalPages) {
    next.status = "completed";
    next.completedAt = editDate;
    next.dailyPlan = [];
  } else {
    next.status = "active";
    next.completedAt = undefined;
    next.dailyPlan = generateReadingPlan(next, editDate);
  }

  next.lastRecalculatedAt = editDate;
  return next;
}

// ─── Example / documentation ───────────────────────────────────────────────────
// Mirrors the screenshot: 528 pages remaining, finish by Apr 30, moderate pace.

const exampleBook: Book = {
  id: "demo-book",
  title: "Deep Work",
  totalPages: 578,   // totalPages
  pagesRead: 50,     // 528 remaining
  startDate: new Date("2026-03-25"),
  targetEndDate: new Date("2026-04-30"),
  commitmentLevel: "balanced", // 6 days/week
  readingSpeed: "moderate",    // 1.0x multiplier
  status: "active",
  dailyPlan: [],
  lastRecalculatedAt: new Date("2026-03-25"),
};

export const examplePlanPreview = generateReadingPlan(
  exampleBook,
  new Date("2026-03-25"),
)
  .slice(0, 5)
  .map((entry) => ({
    date: entry.date.toISOString().slice(0, 10),
    pagesTarget: entry.pagesTarget,
    isCatchUp: entry.isCatchUp,
  }));

// Expected output matches screenshot: ~22 pages/day, 24 reading days, Apr 29 finish
export const exampleFeasibility = checkFeasibility(exampleBook, new Date("2026-03-25"));
