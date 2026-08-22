/**
 * The single source of truth for dates.
 *
 * Everything is a local `YYYY-MM-DD` string. Never a Date or a UTC timestamp:
 * ticking off a habit at 23:50 must land on today, not tomorrow.
 */

export type DateKey = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function toKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey(): DateKey {
  return toKey(new Date());
}

/** Parses a key into a Date at local midnight. */
export function fromKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: DateKey, days: number): DateKey {
  const d = fromKey(key);
  d.setDate(d.getDate() + days);
  return toKey(d);
}

/** Whole days from `a` to `b`; negative when `b` is earlier. */
export function daysBetween(a: DateKey, b: DateKey): number {
  const ms = fromKey(b).getTime() - fromKey(a).getTime();
  return Math.round(ms / 86_400_000);
}

/** Inclusive range of keys from `from` to `to`. */
export function keysBetween(from: DateKey, to: DateKey): DateKey[] {
  const out: DateKey[] = [];
  const n = daysBetween(from, to);
  for (let i = 0; i <= n; i++) out.push(addDays(from, i));
  return out;
}

/** The last `count` days ending today, oldest first. */
export function lastNDays(count: number, end: DateKey = todayKey()): DateKey[] {
  return keysBetween(addDays(end, -(count - 1)), end);
}

export function year(key: DateKey): number {
  return Number(key.slice(0, 4));
}

export function month(key: DateKey): number {
  return Number(key.slice(5, 7)) - 1;
}

/** 0 = Sunday ... 6 = Saturday, matching Date#getDay. */
export function weekday(key: DateKey): number {
  return fromKey(key).getDay();
}

export const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;
export const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

export function dayOfMonth(key: DateKey): number {
  return Number(key.slice(8, 10));
}

/**
 * Start of the period a date falls in, used as the bucket id for streaks.
 * Weeks start on `firstDay` (0 = Sunday, 1 = Monday).
 */
export function periodStart(
  key: DateKey,
  period: 'week' | 'month',
  firstDay = 1
): DateKey {
  if (period === 'month') return `${key.slice(0, 7)}-01`;
  const offset = (weekday(key) - firstDay + 7) % 7;
  return addDays(key, -offset);
}

export function clampToYear(key: DateKey, y: number): DateKey {
  if (year(key) < y) return `${y}-01-01`;
  if (year(key) > y) return `${y}-12-31`;
  return key;
}

export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}
