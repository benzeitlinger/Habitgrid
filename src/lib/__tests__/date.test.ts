import {
  addDays, daysBetween, keysBetween, lastNDays, periodStart, toKey, weekday,
} from '@/lib/date';

describe('date keys', () => {
  it('formats a local date without drifting through UTC', () => {
    // 23:50 local on the 15th must still be the 15th.
    expect(toKey(new Date(2026, 7, 15, 23, 50))).toBe('2026-08-15');
    expect(toKey(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01');
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29'); // leap year
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('measures distance in whole days', () => {
    expect(daysBetween('2026-08-01', '2026-08-08')).toBe(7);
    expect(daysBetween('2026-08-08', '2026-08-01')).toBe(-7);
    expect(daysBetween('2026-08-01', '2026-08-01')).toBe(0);
  });

  it('survives a DST transition', () => {
    // Europe/Berlin springs forward on 2026-03-29.
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
  });

  it('builds inclusive ranges', () => {
    expect(keysBetween('2026-08-01', '2026-08-03')).toEqual([
      '2026-08-01', '2026-08-02', '2026-08-03',
    ]);
    expect(keysBetween('2026-08-01', '2026-08-01')).toEqual(['2026-08-01']);
  });

  it('returns the last N days oldest first', () => {
    expect(lastNDays(3, '2026-08-22')).toEqual([
      '2026-08-20', '2026-08-21', '2026-08-22',
    ]);
    expect(lastNDays(1, '2026-08-22')).toEqual(['2026-08-22']);
  });

  it('finds period starts', () => {
    // 2026-08-22 is a Saturday.
    expect(weekday('2026-08-22')).toBe(6);
    expect(periodStart('2026-08-22', 'week', 1)).toBe('2026-08-17'); // Monday
    expect(periodStart('2026-08-22', 'week', 0)).toBe('2026-08-16'); // Sunday
    expect(periodStart('2026-08-22', 'month')).toBe('2026-08-01');
  });
});
