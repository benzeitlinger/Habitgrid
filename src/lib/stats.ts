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

/** Earliest logged day in `y`, or null when nothing was logged that year. */
function firstEntryOfYear(e: HabitEntries, y: number): DateKey | null {
  const prefix = `${y}-`;
  let earliest: DateKey | null = null;
  for (const key of Object.keys(e)) {
    if (!key.startsWith(prefix)) continue;
    if (earliest === null || key < earliest) earliest = key;
  }
  return earliest;
}

/**
 * Percentage of days that were good.
 *
 * For `build` this deliberately matches HabitKit: it measures from the first
 * day you logged that habit in the year, not from when the habit was created,
 * and it truncates rather than rounds. Calibrated against the original app's
 * own figures — "3 min Journal" reads 53 completions / 30 % there, and 53 over
 * the 172 days since its first 2026 entry gives exactly that.
 *
 * For `quit` there is no HabitKit equivalent, so it stays the honest measure:
 * clean days over the days actually tracked.
 */
export function completionRate(habit: Habit, e: HabitEntries, y: number): number {
  if (habit.polarity === 'quit') {
    const tracked = trackedDays(habit, y);
    return tracked === 0 ? 0 : Math.floor((goodDays(habit, e, y) / tracked) * 100);
  }

  const first = firstEntryOfYear(e, y);
  if (!first) return 0;
  const range = trackedRange(habit, y);
  if (!range) return 0;
  // An entry can predate the habit's own createdAt in imported data; the
  // denominator must not start before the numerator is allowed to count.
  const start = first > range[0] ? first : range[0];
  const span = daysBetween(start, range[1]) + 1;
  if (span <= 0) return 0;
  return Math.floor((goodDays(habit, e, y) / span) * 100);
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
 * `quit`             -> consecutive clean days ending today.
 * `build`, day goal  -> consecutive days that hit the daily target.
 * `build`, week/month-> consecutive periods that hit the streak goal.
 *                       Without a goal there is nothing to measure, hence null.
 */
export function streaks(
  habit: Habit,
  e: HabitEntries,
  firstDayOfWeek = 1
): Streaks | null {
  if (habit.polarity === 'quit') return dayStreaks(habit, e);
  if (habit.streakGoal?.period === 'day') return dayStreaks(habit, e);
  return goalPeriodStreaks(habit, e, firstDayOfWeek);
}

/** Consecutive good days up to today. Works for both polarities. */
function dayStreaks(habit: Habit, e: HabitEntries): Streaks {
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
  // Day goals never reach here — `streaks()` routes them to dayStreaks.
  if (goal.period === 'day') return dayStreaks(habit, e);
  const period: 'week' | 'month' = goal.period;

  const today = todayKey();
  if (habit.createdAt > today) return { current: 0, best: 0 };

  // Good days per period bucket.
  const buckets = new Map<DateKey, number>();
  for (const key of keysBetween(habit.createdAt, today)) {
    if (!isGoodDay(habit, e, key)) continue;
    const bucket = periodStart(key, period, firstDayOfWeek);
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  }

  // Walk every period from the first to the current one, in order.
  const periods: DateKey[] = [];
  let cursor = periodStart(habit.createdAt, period, firstDayOfWeek);
  const last = periodStart(today, period, firstDayOfWeek);
  while (cursor <= last) {
    periods.push(cursor);
    cursor =
      period === 'week'
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

/**
 * Share of the year's days on which at least one habit was completed — the
 * same measure HabitKit shows on its overall screen (161 of 234 days reads as
 * 68 % there, truncated).
 *
 * Note this is not the "Completed Days" tile beside it: that one sums every
 * habit's good days, so the two numbers are counted differently. The original
 * does the same.
 */
export function overallCompletionRate(
  habits: Habit[],
  entries: Entries,
  y: number
): number {
  const today = todayKey();
  const from = `${y}-01-01`;
  const to = year(today) === y ? today : `${y}-12-31`;
  if (year(today) < y) return 0;

  let active = 0;
  let done = 0;
  for (const date of keysBetween(from, to)) {
    active++;
    const any = habits.some((h) => {
      if (h.polarity === 'quit') return false; // a clean day is not an action
      return countOn(entriesFor(entries, h.id), date) > 0;
    });
    if (any) done++;
  }
  return active === 0 ? 0 : Math.floor((done / active) * 100);
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
