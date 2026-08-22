import {
  completionRate, completionsPerMonth, fillRatio, goodDays, isGoodDay, streaks,
  trackedDays,
} from '@/lib/stats';
import type { Habit } from '@/store/types';

const TODAY = '2026-08-22';

beforeAll(() => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 7, 22, 12, 0));
});
afterAll(() => jest.useRealTimers());

function habit(over: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    name: 'Test',
    description: '',
    iconName: 'pulse',
    color: '#FB923C',
    categoryIds: [],
    polarity: 'build',
    streakGoal: null,
    trackingType: 'step',
    completionsPerDay: 1,
    archived: false,
    order: 0,
    createdAt: '2026-08-01',
    reminder: null,
    ...over,
  };
}

describe('isGoodDay — build', () => {
  const h = habit({ completionsPerDay: 2 });
  const e = { '2026-08-01': 2, '2026-08-02': 1, '2026-08-03': 5 };

  it('needs the target to be reached', () => {
    expect(isGoodDay(h, e, '2026-08-01')).toBe(true);
    expect(isGoodDay(h, e, '2026-08-02')).toBe(false);
    expect(isGoodDay(h, e, '2026-08-03')).toBe(true);
  });

  it('treats an unlogged day as a miss', () => {
    expect(isGoodDay(h, e, '2026-08-04')).toBe(false);
  });
});

describe('isGoodDay — quit', () => {
  const h = habit({ polarity: 'quit', completionsPerDay: 0 });
  const e = { '2026-08-02': 1, '2026-08-05': 3 };

  it('counts an unlogged day as clean', () => {
    expect(isGoodDay(h, e, '2026-08-01')).toBe(true);
    expect(isGoodDay(h, e, '2026-08-03')).toBe(true);
  });

  it('counts a logged slip as a bad day', () => {
    expect(isGoodDay(h, e, '2026-08-02')).toBe(false);
    expect(isGoodDay(h, e, '2026-08-05')).toBe(false);
  });

  it('respects an allowance above zero', () => {
    const relaxed = habit({ polarity: 'quit', completionsPerDay: 2 });
    expect(isGoodDay(relaxed, e, '2026-08-02')).toBe(true);  // 1 <= 2
    expect(isGoodDay(relaxed, e, '2026-08-05')).toBe(false); // 3 > 2
  });
});

describe('fillRatio', () => {
  it('scales with progress for build habits', () => {
    const h = habit({ completionsPerDay: 4 });
    expect(fillRatio(h, { '2026-08-01': 0 }, '2026-08-01')).toBe(0);
    expect(fillRatio(h, { '2026-08-01': 2 }, '2026-08-01')).toBe(0.5);
    expect(fillRatio(h, { '2026-08-01': 4 }, '2026-08-01')).toBe(1);
    expect(fillRatio(h, { '2026-08-01': 9 }, '2026-08-01')).toBe(1);
  });

  it('leaves clean quit days empty and fills the slips', () => {
    const h = habit({ polarity: 'quit', completionsPerDay: 0 });
    expect(fillRatio(h, {}, '2026-08-01')).toBe(0);
    expect(fillRatio(h, { '2026-08-01': 1 }, '2026-08-01')).toBe(1);
  });
});

describe('goodDays / completionRate', () => {
  it('only counts days since the habit was created', () => {
    const h = habit({ createdAt: '2026-08-20' });
    expect(trackedDays(h, 2026)).toBe(3); // 20th, 21st, 22nd
    const e = { '2026-08-20': 1, '2026-07-15': 1 }; // the July entry predates it
    expect(goodDays(h, e, 2026)).toBe(1);
    // An entry older than the habit must not stretch the denominator backwards.
    expect(completionRate(h, e, 2026)).toBe(33);
  });

  it('measures a build rate from the first logged day of the year', () => {
    // Matches HabitKit: created in January, first logged in August.
    const h = habit({ createdAt: '2026-01-01' });
    const e = { '2026-08-20': 1, '2026-08-21': 1 };
    expect(goodDays(h, e, 2026)).toBe(2);
    expect(trackedDays(h, 2026)).toBe(234);
    expect(completionRate(h, e, 2026)).toBe(66); // 2 of the 3 days since the 20th
  });

  it('truncates the rate rather than rounding it up', () => {
    const h = habit({ createdAt: '2026-08-20' });
    expect(completionRate(h, { '2026-08-20': 1, '2026-08-21': 1 }, 2026)).toBe(66);
  });

  it('is 100% for a quit habit that was never broken', () => {
    const h = habit({ polarity: 'quit', completionsPerDay: 0, createdAt: '2026-08-20' });
    expect(goodDays(h, {}, 2026)).toBe(3);
    expect(completionRate(h, {}, 2026)).toBe(100);
  });

  it('returns zero for a year before the habit existed', () => {
    const h = habit({ createdAt: '2026-08-01' });
    expect(trackedDays(h, 2025)).toBe(0);
    expect(completionRate(h, {}, 2025)).toBe(0);
  });
});

describe('completionsPerMonth', () => {
  it('buckets logged counts by month', () => {
    const h = habit({ createdAt: '2026-01-01' });
    const e = { '2026-01-05': 2, '2026-01-06': 1, '2026-03-01': 4, '2025-12-31': 9 };
    const per = completionsPerMonth(h, e, 2026);
    expect(per[0]).toBe(3);
    expect(per[2]).toBe(4);
    expect(per.reduce((a, b) => a + b, 0)).toBe(7); // 2025 excluded
  });
});

describe('streaks — quit', () => {
  const h = habit({ polarity: 'quit', completionsPerDay: 0, createdAt: '2026-08-01' });

  it('counts consecutive clean days up to today', () => {
    const e = { '2026-08-19': 1 }; // slipped on the 19th
    expect(streaks(h, e)).toEqual({ current: 3, best: 18 }); // 20,21,22 clean
  });

  it('resets to zero when today is a slip', () => {
    const e = { [TODAY]: 1 };
    expect(streaks(h, e)!.current).toBe(0);
    expect(streaks(h, e)!.best).toBe(21);
  });

  it('is the full span when nothing was ever logged', () => {
    expect(streaks(h, {})).toEqual({ current: 22, best: 22 });
  });
});

describe('streaks — build', () => {
  it('has no streak data without a goal', () => {
    expect(streaks(habit({ streakGoal: null }), {})).toBeNull();
  });

  it('counts weeks that hit the goal', () => {
    const h = habit({
      createdAt: '2026-08-03', // a Monday
      streakGoal: { count: 3, period: 'week' },
    });
    const e = {
      '2026-08-03': 1, '2026-08-04': 1, '2026-08-05': 1, // week 1: 3 -> met
      '2026-08-10': 1, '2026-08-11': 1, '2026-08-12': 1, // week 2: 3 -> met
      '2026-08-17': 1,                                    // week 3 (current): 1
    };
    const s = streaks(h, e, 1)!;
    expect(s.best).toBe(2);
    // The current week is still running, so the two completed weeks stand.
    expect(s.current).toBe(2);
  });

  it('extends the streak once the open week hits the goal', () => {
    const h = habit({
      createdAt: '2026-08-03',
      streakGoal: { count: 2, period: 'week' },
    });
    const e = {
      '2026-08-03': 1, '2026-08-04': 1,
      '2026-08-10': 1, '2026-08-11': 1,
      '2026-08-17': 1, '2026-08-18': 1, // current week met
    };
    expect(streaks(h, e, 1)).toEqual({ current: 3, best: 3 });
  });

  it('breaks on a missed week', () => {
    const h = habit({
      createdAt: '2026-08-03',
      streakGoal: { count: 2, period: 'week' },
    });
    const e = {
      '2026-08-03': 1, '2026-08-04': 1, // met
      // week 2 missed entirely
      '2026-08-17': 1, '2026-08-18': 1, // current week met
    };
    expect(streaks(h, e, 1)).toEqual({ current: 1, best: 1 });
  });

  it('counts months that hit the goal', () => {
    const h = habit({
      createdAt: '2026-06-01',
      streakGoal: { count: 2, period: 'month' },
    });
    const e = {
      '2026-06-01': 1, '2026-06-02': 1,
      '2026-07-10': 1, '2026-07-11': 1,
      '2026-08-01': 1, '2026-08-02': 1,
    };
    expect(streaks(h, e, 1)).toEqual({ current: 3, best: 3 });
  });
});
