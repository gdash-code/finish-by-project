/*
 * Reading plan engine for Finish By — v3 (Simplified & Pacing-focused)
 */

export type ReadingPace = "gentle" | "steady" | "intense";
export type ReadingSchedule = "weekends_off" | "daily";
export type BookStatus = "active" | "completed" | "paused";

export const PACE_MULTIPLIERS: Record<ReadingPace, number> = {
  gentle: 0.8,
  steady: 1.0,
  intense: 1.5,
};

export const SCHEDULE_DAYS: Record<ReadingSchedule, number> = {
  weekends_off: 5,
  daily: 7,
};

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
  pace: ReadingPace;
  schedule: ReadingSchedule;
  status: BookStatus;
  completedAt?: Date;
  dailyPlan: DailyPlan[];
  lastRecalculatedAt: Date;
  pagesReadToday: number;
  lastProgressUpdate: string; // ISO date
}

export interface FeasibilityReport {
  isFeasible: boolean;
  availableReadingDays: number;
  requiredPagesPerDay: number;
  targetPagesPerDay: number;
  projectedFinishDate: Date;
  warning?: string;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

const MS_IN_DAY = 1000 * 60 * 60 * 24;

export const startOfDay = (date: Date): Date => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

export const addDays = (date: Date, days: number): Date => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const isSameDay = (a: Date, b: Date): boolean =>
  startOfDay(a).getTime() === startOfDay(b).getTime();

const getWeekKey = (date: Date): string => {
  const normalized = startOfDay(date);
  const weekStart = addDays(normalized, -normalized.getDay());
  return weekStart.toISOString().slice(0, 10);
};

export const daysBetween = (start: Date, end: Date): number =>
  Math.max(0, Math.round((startOfDay(end).getTime() - startOfDay(start).getTime()) / MS_IN_DAY));

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const formatDate = (date: Date): string =>
  date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

// ─── Implementation ──────────────────────────────────────────────────────────

function collectReadingDates(startDate: Date, targetDate: Date, schedule: ReadingSchedule): Date[] {
  const dates: Date[] = [];
  let cursor = startOfDay(startDate);
  const limit = 2000; // safety

  for (let i = 0; i < limit && cursor <= targetDate; i++) {
    const day = cursor.getDay();
    const isWeekend = day === 0 || day === 6;
    
    if (schedule === 'daily' || !isWeekend) {
      dates.push(new Date(cursor));
    }
    cursor = addDays(cursor, 1);
  }
  return dates;
}

function findNthReadingDate(startDate: Date, n: number, schedule: ReadingSchedule): Date {
  let count = 0;
  let cursor = startOfDay(startDate);
  const limit = 2000;

  for (let i = 0; i < limit; i++) {
    const day = cursor.getDay();
    const isWeekend = day === 0 || day === 6;
    if (schedule === 'daily' || !isWeekend) {
      count++;
      if (count === n) return cursor;
    }
    cursor = addDays(cursor, 1);
  }
  return cursor;
}

export function checkFeasibility(book: Book, today: Date = new Date()): FeasibilityReport {
  const remainingPages = Math.max(book.totalPages - book.pagesRead, 0);
  if (remainingPages === 0) {
    return { isFeasible: true, availableReadingDays: 0, requiredPagesPerDay: 0, targetPagesPerDay: 0, projectedFinishDate: today };
  }

  const anchor = startOfDay(book.startDate) > startOfDay(today) ? startOfDay(book.startDate) : startOfDay(today);
  const targetDate = startOfDay(book.targetEndDate);

  if (anchor > targetDate) {
    return { isFeasible: false, availableReadingDays: 0, requiredPagesPerDay: remainingPages, targetPagesPerDay: remainingPages, projectedFinishDate: addDays(anchor, 1), warning: "Deadline has passed." };
  }

  const availableDates = collectReadingDates(anchor, targetDate, book.schedule);
  const availableReadingDays = availableDates.length;

  if (availableReadingDays === 0) {
    return { isFeasible: false, availableReadingDays: 0, requiredPagesPerDay: remainingPages, targetPagesPerDay: remainingPages, projectedFinishDate: addDays(anchor, 7), warning: "No reading days available." };
  }

  const requiredPagesPerDay = remainingPages / availableReadingDays;
  const multiplier = PACE_MULTIPLIERS[book.pace];
  const targetPagesPerDay = Math.max(1, Math.ceil(requiredPagesPerDay * multiplier));
  
  const dailyTarget = targetPagesPerDay;
  // Actually, let's make it simpler: targetPagesPerDay is what I WILL read.
  // Standard required = remaining / days.
  // If I read at 'relaxed' pace, I read LESS than required.
  
  const actualPace = Math.max(1, Math.ceil(requiredPagesPerDay * multiplier));
  const daysNeeded = Math.ceil(remainingPages / actualPace);
  const isFeasible = daysNeeded <= availableReadingDays;
  const projectedFinishDate = isFeasible ? availableDates[daysNeeded - 1] : findNthReadingDate(anchor, daysNeeded, book.schedule);

  return {
    isFeasible,
    availableReadingDays,
    requiredPagesPerDay: Math.ceil(requiredPagesPerDay),
    targetPagesPerDay: actualPace,
    projectedFinishDate,
    warning: isFeasible ? undefined : `At this pace, you'll finish by ${formatDate(projectedFinishDate)}.`
  };
}

export function generateReadingPlan(book: Book, startDate: Date = new Date()): DailyPlan[] {
  const report = checkFeasibility(book, startDate);
  const remainingPages = Math.max(book.totalPages - book.pagesRead, 0);
  if (remainingPages === 0) return [];

  const anchor = startOfDay(book.startDate) > startOfDay(startDate) ? startOfDay(book.startDate) : startOfDay(startDate);
  const daysNeeded = Math.ceil(remainingPages / report.targetPagesPerDay);
  
  const plan: DailyPlan[] = [];
  let pagesLeft = remainingPages;
  for (let i = 1; i <= daysNeeded; i++) {
    const date = findNthReadingDate(anchor, i, book.schedule);
    const dayTarget = i === daysNeeded ? pagesLeft : Math.min(pagesLeft, report.targetPagesPerDay);
    plan.push({
      date,
      pagesTarget: dayTarget,
      pagesCompleted: 0,
      isCatchUp: date > book.targetEndDate
    });
    pagesLeft -= dayTarget;
  }
  return plan;
}

export function logReadingProgress(book: Book, newTotalPagesRead: number, today: Date = new Date()): Book {
  const todayKey = today.toISOString().split('T')[0];
  const pagesBefore = book.pagesRead;
  const updatedPagesRead = Math.min(Math.max(newTotalPagesRead, 0), book.totalPages);
  
  const progressGained = Math.max(0, updatedPagesRead - pagesBefore);
  const currentPagesReadToday = book.lastProgressUpdate === todayKey ? book.pagesReadToday + progressGained : progressGained;

  const status = (updatedPagesRead >= book.totalPages ? 'completed' : 'active') as BookStatus;
  const completedAt = status === 'completed' ? today : undefined;

  const nextBook: Book = { 
    ...book, 
    pagesRead: updatedPagesRead, 
    status, 
    completedAt, 
    lastRecalculatedAt: today,
    pagesReadToday: currentPagesReadToday,
    lastProgressUpdate: todayKey
  };
  nextBook.dailyPlan = generateReadingPlan(nextBook, today);
  return nextBook;
}

export interface EditableFields {
  title?: string;
  totalPages?: number;
  pagesRead?: number;
  targetEndDate?: Date;
  pace?: ReadingPace;
  schedule?: ReadingSchedule;
}

export function editBook(book: Book, updates: EditableFields, editDate: Date = new Date()): Book {
  const next: Book = { ...book, ...updates, lastRecalculatedAt: editDate };
  if (next.pagesRead >= next.totalPages) {
    next.status = 'completed';
    next.completedAt = editDate;
  } else {
    next.status = 'active';
  }
  next.dailyPlan = generateReadingPlan(next, editDate);
  return next;
}

export function checkInactivityNudge(book: Book, today: Date = new Date()) {
  const missed = daysBetween(book.lastRecalculatedAt, today);
  if (missed >= 3 && book.status === 'active') {
    const report = checkFeasibility(book, today);
    return { needsNudge: true, missed, newPace: report.targetPagesPerDay };
  }
  return null;
}

export function extendDeadline(book: Book, days: number = 7, today: Date = new Date()): Book {
  return editBook(book, { targetEndDate: addDays(book.targetEndDate, days) }, today);
}
