/*
 * Reading plan engine for Finish By.
 * Provides data contracts plus pure functions for generating schedules,
 * recalculating plans, logging progress, and editing completed books.
 */

export type ReadingSpeed = "slow" | "moderate" | "fast";
export type BookStatus = "active" | "completed" | "paused";

export interface DailyPlan {
  date: Date;
  pagesTarget: number;
  pagesCompleted: number;
  isCatchUp: boolean;
}

export interface Book {
  id: string;
  title: string;
  totalPages: number;
  pagesRead: number;
  startDate: Date;
  targetEndDate: Date;
  readingDaysPerWeek: number; // 1-7 days per week
  readingSpeed?: ReadingSpeed;
  status: BookStatus;
  completedAt?: Date;
  dailyPlan: DailyPlan[];
  lastRecalculatedAt: Date;
}

const MS_IN_DAY = 1000 * 60 * 60 * 24;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

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

const isSameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();

const getWeekKey = (date: Date): string => {
  const normalized = startOfDay(date);
  const weekStart = addDays(normalized, -normalized.getDay()); // Sunday-based week
  return weekStart.toISOString().slice(0, 10);
};

const daysBetween = (start: Date, end: Date) =>
  Math.max(0, Math.round((startOfDay(end).getTime() - startOfDay(start).getTime()) / MS_IN_DAY));

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

const distributePages = (totalPages: number, slots: number): number[] => {
  if (slots <= 0) {
    return [];
  }

  const base = Math.floor(totalPages / slots);
  let remainder = totalPages % slots;
  const allocation = Array.from({ length: slots }, () => base);

  for (let i = 0; i < allocation.length; i++) {
    if (remainder <= 0) break;
    allocation[i] += 1;
    remainder -= 1;
  }

  // Guarantee at least 1 page on any scheduled day by trimming slots if needed.
  return allocation.map((value) => Math.max(1, value));
};

interface SpeedAdjustmentParams {
  targets: number[];
  readingDates: Date[];
  remainingPages: number;
  targetDate: Date;
  readingSpeed?: ReadingSpeed;
}

interface SpeedAdjustmentResult {
  targets: number[];
  readingDates: Date[];
  catchUpStartIndex: number;
}

const applySpeedAdjustments = ({
  targets,
  readingDates,
  remainingPages,
  targetDate,
  readingSpeed,
}: SpeedAdjustmentParams): SpeedAdjustmentResult => {
  if (!readingSpeed || readingSpeed === "moderate") {
    return { targets, readingDates, catchUpStartIndex: readingDates.length };
  }

  if (readingSpeed === "slow") {
    const reduced = targets.map((value) => Math.max(1, Math.round(value * 0.9)));
    const reducedTotal = reduced.reduce((sum, value) => sum + value, 0);
    let deficit = remainingPages - reducedTotal;
    const catchUpDates: Date[] = [];
    let cursor = addDays(targetDate, 1);

    while (deficit > 0) {
      const chunk = Math.min(Math.max(1, targets[targets.length - 1] ?? 1), deficit);
      catchUpDates.push(new Date(cursor));
      reduced.push(chunk);
      deficit -= chunk;
      cursor = addDays(cursor, 1);
    }

    return {
      targets: reduced,
      readingDates: [...readingDates, ...catchUpDates],
      catchUpStartIndex: readingDates.length,
    };
  }

  // fast pace
  const totalCalendarDays = daysBetween(readingDates[0], targetDate) + 1;
  const slackDays = Math.max(totalCalendarDays - readingDates.length, 0);
  if (slackDays <= 2) {
    let bonusBudget = Math.ceil(remainingPages * 0.1);
    const boosted = [...targets];

    for (let i = 0; i < boosted.length && bonusBudget > 0; i++) {
      const bonus = Math.min(Math.ceil(boosted[i] * 0.1), bonusBudget);
      boosted[i] += bonus;
      bonusBudget -= bonus;
    }

    let overage = boosted.reduce((sum, value) => sum + value, 0) - remainingPages;
    let idx = boosted.length - 1;
    while (overage > 0 && idx >= 0) {
      const reducible = Math.min(overage, boosted[idx] - 1);
      if (reducible > 0) {
        boosted[idx] -= reducible;
        overage -= reducible;
      }
      if (boosted[idx] === 1 && idx === boosted.length - 1 && overage > 0) {
        boosted.pop();
        readingDates.pop();
      }
      idx -= 1;
    }

    return {
      targets: boosted,
      readingDates,
      catchUpStartIndex: readingDates.length,
    };
  }

  return { targets, readingDates, catchUpStartIndex: readingDates.length };
};

export function generateReadingPlan(book: Book, startDate: Date = new Date()): DailyPlan[] {
  let remainingPages = Math.max(book.totalPages - book.pagesRead, 0);
  if (remainingPages === 0) {
    return [];
  }

  const today = startOfDay(startDate);
  const planAnchor = startOfDay(book.startDate) > today ? startOfDay(book.startDate) : today;
  const targetDate = startOfDay(book.targetEndDate);

  if (planAnchor > targetDate) {
    throw new Error("targetEndDate must be after the start date");
  }

  let readingDates = collectReadingDates(planAnchor, targetDate, book.readingDaysPerWeek);
  if (!readingDates.length) {
    throw new Error("No available reading days before the target end date. Increase reading days per week or extend the deadline.");
  }

  if (remainingPages < readingDates.length) {
    readingDates = readingDates.slice(0, remainingPages);
  }

  const targets = distributePages(remainingPages, readingDates.length);
  const { targets: adjustedTargets, readingDates: adjustedDates, catchUpStartIndex } =
    applySpeedAdjustments({
      targets,
      readingDates,
      remainingPages,
      targetDate,
      readingSpeed: book.readingSpeed,
    });

  return adjustedTargets.map((pages, index) => ({
    date: new Date(adjustedDates[index]),
    pagesTarget: pages,
    pagesCompleted: 0,
    isCatchUp: index >= catchUpStartIndex,
  }));
}

function computeDeficit(plan: DailyPlan[], today: Date): number {
  const pastEntries = plan.filter((entry) => startOfDay(entry.date) < startOfDay(today));
  const expected = pastEntries.reduce((sum, entry) => sum + entry.pagesTarget, 0);
  const actual = pastEntries.reduce((sum, entry) => sum + entry.pagesCompleted, 0);
  return Math.max(0, expected - actual);
}

function applyCatchUpToPlan(plan: DailyPlan[], deficit: number): DailyPlan[] {
  if (deficit <= 0 || !plan.length) {
    return plan;
  }

  const updated = plan.map((entry, index) => {
    if (deficit > 0 && index < 2) {
      const boost = Math.min(Math.ceil(entry.pagesTarget * 0.2), deficit);
      if (boost > 0) {
        deficit -= boost;
        return {
          ...entry,
          pagesTarget: entry.pagesTarget + boost,
          isCatchUp: true,
        };
      }
    }
    return entry;
  });

  while (deficit > 0) {
    const last = updated[updated.length - 1];
    const nextDate = last ? addDays(last.date, 1) : startOfDay(new Date());
    const chunk = Math.min(last?.pagesTarget ?? 10, deficit);
    updated.push({
      date: nextDate,
      pagesTarget: chunk,
      pagesCompleted: 0,
      isCatchUp: true,
    });
    deficit -= chunk;
  }

  return updated;
}

export function recalculatePlan(book: Book, today: Date = new Date()): DailyPlan[] {
  const dayStart = startOfDay(today);
  const historicalEntries = book.dailyPlan.filter((entry) => startOfDay(entry.date) < dayStart);
  const remainingBook: Book = {
    ...book,
    dailyPlan: [],
    startDate: dayStart,
  };

  const newPlan = generateReadingPlan(remainingBook, dayStart);
  const deficit = computeDeficit(book.dailyPlan, dayStart);
  const adjustedPlan = applyCatchUpToPlan(newPlan, deficit);

  return [...historicalEntries, ...adjustedPlan];
}

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
          pagesCompleted: clamp(entry.pagesCompleted + safePages, 0, entry.pagesTarget),
        }
      : entry,
  );

  const nextPlan = recalculatePlan(
    { ...book, pagesRead: updatedPagesRead, dailyPlan: updatedPlan },
    logDate,
  );

  const status: BookStatus = updatedPagesRead >= book.totalPages ? "completed" : book.status;
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

export interface EditableFields {
  totalPages?: number;
  pagesRead?: number;
  targetEndDate?: Date;
  readingDaysPerWeek?: number;
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
    readingDaysPerWeek:
      updates.readingDaysPerWeek ?? book.readingDaysPerWeek,
    targetEndDate: updates.targetEndDate ?? book.targetEndDate,
    readingSpeed: updates.readingSpeed ?? book.readingSpeed,
  };

  const nextPagesRead = clamp(
    updates.pagesRead ?? book.pagesRead,
    0,
    next.totalPages,
  );
  next.pagesRead = nextPagesRead;

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

// Example usage for documentation/tests
const exampleBook: Book = {
  id: "demo-book",
  title: "Deep Work",
  totalPages: 340,
  pagesRead: 50,
  startDate: new Date("2026-03-01"),
  targetEndDate: new Date("2026-03-31"),
  readingDaysPerWeek: 6,
  readingSpeed: "moderate",
  status: "active",
  dailyPlan: [],
  lastRecalculatedAt: new Date("2026-03-01"),
};

export const examplePlanPreview = generateReadingPlan(exampleBook, new Date("2026-03-01")).slice(0, 5).map((entry) => ({
  date: entry.date.toISOString().slice(0, 10),
  pagesTarget: entry.pagesTarget,
  isCatchUp: entry.isCatchUp,
}));
