import {
  addDays, clampToYear, daysBetween, keysBetween, periodStart, todayKey, year,
  type DateKey,
} from '@/lib/date';
import type { Entries, Habit } from '@/store/types';

export type HabitEntries = Record<DateKey, number>;

export function entriesFor(entries: Entries, habitId: string): HabitEntries {
  return entries[habitId] ?? {};
}

export function countOn(e: HabitEntries, date: DateKey): number {
  return e[date] ?? 0;
}

/**
 * The one rule everything else is built on: does this day count as a good day?
 *
 * `build` — the target was reached.
 * `quit`  — you stayed at or below what is allowed. A day with no entry is
 *           clean, otherwise you would have to confirm "didn't drink" daily
 *           just to keep a streak alive.
 */
export function isGoodDay(habit: Habit, e: HabitEntries, date: DateKey): boolean {
  const count = countOn(e, date);
  return habit.polarity === 'build'
    ? count >= habit.completionsPerDay
    : count <= habit.completionsPerDay;
}

/** How full the cell is drawn, 0..1. For `quit` a slip is what fills it. */
export function fillRatio(habit: Habit, e: HabitEntries, date: DateKey): number {
  const count = countOn(e, date);
  if (habit.polarity === 'quit') {
    // Nothing logged -> empty. Anything beyond what's allowed -> full.
    if (count === 0) return 0;
    const over = count - habit.completionsPerDay;
    return over <= 0 ? 0.45 : 1;
  }
  const target = Math.max(1, habit.completionsPerDay);
  return Math.min(1, count / target);
}

/** Inclusive window of days a habit was actually being tracked in `y`. */
export function trackedRange(habit: Habit, y: number): [DateKey, DateKey] | null {
  const today = todayKey();
  const from = clampToYear(habit.createdAt, y);
  const to = clampToYear(today, y);
  if (year(habit.createdAt) > y) return null;
  if (daysBetween(from, to) < 0) return null;
  return [from, to];
}

export function trackedDays(habit: Habit, y: number): number {
  const range = trackedRange(habit, y);
  if (!range) return 0;
  return daysBetween(range[0], range[1]) + 1;
}

/** Good days in `y` — "Completed Days" for build, "Clean Days" for quit. */
export function goodDays(habit: Habit, e: HabitEntries, y: number): number {
  const range = trackedRange(habit, y);
  if (!range) return 0;
  let n = 0;
  for (const key of keysBetween(range[0], range[1])) {
    if (isGoodDay(habit, e, key)) n++;
  }
  return n;
}

/** Raw number of logged completions in `y` (slips, for a quit habit). */
export function totalCompletions(habit: Habit, e: HabitEntries, y: number): number {
  const range = trackedRange(habit, y);
  if (!range) return 0;
  let n = 0;
  for (const [key, count] of Object.entries(e)) {
    if (key >= range[0] && key <= range[1]) n += count;
  }
  return n;
}

/** Percentage of tracked days that were good, rounded. */
export function completionRate(habit: Habit, e: HabitEntries, y: number): number {
  const total = trackedDays(habit, y);
  if (total === 0) return 0;
  return Math.round((goodDays(habit, e, y) / total) * 100);
}

/** 12 monthly buckets of logged completions for the chart. */
export function completionsPerMonth(
  habit: Habit,
  e: HabitEntries,
  y: number
): number[] {
  const out = new Array(12).fill(0);
  for (const [key, count] of Object.entries(e)) {
    if (year(key) === y) out[Number(key.slice(5, 7)) - 1] += count;
  }
  return out;
}

export type Streaks = { current: number; best: number };

/**
 * `quit`  -> consecutive clean days ending today, counted in days.
 * `build` -> consecutive week/month periods that hit the streak goal.
 *            Without a goal there is nothing to measure, hence null.
 */
export function streaks(
  habit: Habit,
  e: HabitEntries,
  firstDayOfWeek = 1
): Streaks | null {
  return habit.polarity === 'quit'
    ? cleanDayStreaks(habit, e)
    : goalPeriodStreaks(habit, e, firstDayOfWeek);
}

function cleanDayStreaks(habit: Habit, e: HabitEntries): Streaks {
  const today = todayKey();
  const start = habit.createdAt <= today ? habit.createdAt : today;
  const days = keysBetween(start, today);

  let best = 0;
  let run = 0;
  for (const key of days) {
    if (isGoodDay(habit, e, key)) {
      run++;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  // `run` ends on today, so it is also the current streak.
  return { current: run, best };
}

function goalPeriodStreaks(
  habit: Habit,
  e: HabitEntries,
  firstDayOfWeek: number
): Streaks | null {
  const goal = habit.streakGoal;
  if (!goal) return null;

  const today = todayKey();
  if (habit.createdAt > today) return { current: 0, best: 0 };

  // Good days per period bucket.
  const buckets = new Map<DateKey, number>();
  for (const key of keysBetween(habit.createdAt, today)) {
    if (!isGoodDay(habit, e, key)) continue;
    const bucket = periodStart(key, goal.period, firstDayOfWeek);
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  }

  // Walk every period from the first to the current one, in order.
  const periods: DateKey[] = [];
  let cursor = periodStart(habit.createdAt, goal.period, firstDayOfWeek);
  const last = periodStart(today, goal.period, firstDayOfWeek);
  while (cursor <= last) {
    periods.push(cursor);
    cursor =
      goal.period === 'week'
        ? addDays(cursor, 7)
        : periodStart(addDays(`${cursor.slice(0, 7)}-28`, 7), 'month', firstDayOfWeek);
  }

  let best = 0;
  let run = 0;
  for (const p of periods) {
    if ((buckets.get(p) ?? 0) >= goal.count) {
      run++;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }

  // The current period is still open: a miss so far must not break the streak,
  // so fall back to the run that ended with the previous period.
  const currentMet = (buckets.get(last) ?? 0) >= goal.count;
  let current = run;
  if (!currentMet) {
    let back = 0;
    for (let i = periods.length - 2; i >= 0; i--) {
      if ((buckets.get(periods[i]) ?? 0) >= goal.count) back++;
      else break;
    }
    current = back;
  }

  return { current, best };
}

/** Aggregate over several habits: a day is good when every habit had a good day. */
export function overallGoodDays(
  habits: Habit[],
  entries: Entries,
  y: number
): number {
  let n = 0;
  for (const habit of habits) {
    n += goodDays(habit, entriesFor(entries, habit.id), y);
  }
  return n;
}

export function overallCompletionRate(
  habits: Habit[],
  entries: Entries,
  y: number
): number {
  let good = 0;
  let total = 0;
  for (const habit of habits) {
    good += goodDays(habit, entriesFor(entries, habit.id), y);
    total += trackedDays(habit, y);
  }
  return total === 0 ? 0 : Math.round((good / total) * 100);
}

export function overallCompletionsPerMonth(
  habits: Habit[],
  entries: Entries,
  y: number
): number[] {
  const out = new Array(12).fill(0);
  for (const habit of habits) {
    const per = completionsPerMonth(habit, entriesFor(entries, habit.id), y);
    for (let i = 0; i < 12; i++) out[i] += per[i];
  }
  return out;
}

/**
 * Overall heatmap intensity for a day: the share of habits that had a good day.
 * Habits not yet created on that day are ignored.
 */
export function overallFillRatio(
  habits: Habit[],
  entries: Entries,
  date: DateKey
): number {
  const today = todayKey();
  if (date > today) return 0;
  let active = 0;
  let good = 0;
  for (const habit of habits) {
    if (habit.createdAt > date) continue;
    active++;
    if (isGoodDay(habit, entriesFor(entries, habit.id), date)) good++;
  }
  return active === 0 ? 0 : good / active;
}
