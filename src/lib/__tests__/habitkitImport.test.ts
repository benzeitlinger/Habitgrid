import { localDateOf, parseHabitKitExport } from '@/lib/import/habitkit';
import { parseAnyBackup } from '@/lib/import/detect';
import { buildBackup } from '@/lib/backup';
import { DEFAULT_SETTINGS } from '@/store/types';

function exportFixture(over: Record<string, unknown> = {}) {
  return JSON.stringify({
    habits: [
      {
        id: 'h1', name: 'Lesen', description: 'Abends', icon: 'book', color: 'red',
        archived: false, orderIndex: 0, createdAt: '2025-07-20T13:24:04.346511Z',
        isInverse: false, emoji: null,
      },
      {
        id: 'h2', name: 'Rauchen', description: '', icon: 'cannabis', color: 'lime',
        archived: true, orderIndex: 1, createdAt: '2025-07-15T10:00:00.000Z',
        isInverse: true, emoji: null,
      },
    ],
    completions: [
      { date: '2025-07-14T22:00:00.000Z', habitId: 'h1', timezoneOffsetInMinutes: 120, amountOfCompletions: 1 },
      { date: '2025-07-15T22:00:00.000Z', habitId: 'h1', timezoneOffsetInMinutes: 120, amountOfCompletions: 2 },
      { date: '2025-07-16T22:00:00.000Z', habitId: 'h1', timezoneOffsetInMinutes: 120, amountOfCompletions: 0 },
      { date: '2025-07-17T22:00:00.000Z', habitId: 'ghost', timezoneOffsetInMinutes: 120, amountOfCompletions: 1 },
    ],
    intervals: [
      {
        habitId: 'h1', startDate: '2025-07-14T22:00:00.000Z', endDate: '2025-11-06T22:59:59.000Z',
        type: 'none', requiredNumberOfCompletions: null, requiredNumberOfCompletionsPerDay: 1,
        unitType: 'incremental',
      },
      {
        habitId: 'h1', startDate: '2025-11-06T22:59:59.000Z', endDate: null,
        type: 'week', requiredNumberOfCompletions: 3, requiredNumberOfCompletionsPerDay: 2,
        unitType: 'manual',
      },
    ],
    categories: [{ id: 'c1', name: 'Good to have', icon: 'heart', orderIndex: 0 }],
    categoryMappings: [{ habitId: 'h1', categoryId: 'c1' }],
    ...over,
  });
}

describe('HabitKit dates', () => {
  it('shifts UTC by the offset that was in force, not by the reader clock', () => {
    // 22:00Z on the 14th at +02:00 is already the 15th where it was logged.
    expect(localDateOf('2025-07-14T22:00:00.000Z', 120)).toBe('2025-07-15');
    expect(localDateOf('2025-11-30T23:00:00.000Z', 60)).toBe('2025-12-01');
    expect(localDateOf('2025-07-15T10:00:00.000Z', 120)).toBe('2025-07-15');
    expect(localDateOf('2026-01-01T00:00:00.000Z', 0)).toBe('2026-01-01');
  });

  it('does not move a date when there is no offset to apply', () => {
    expect(localDateOf('2026-03-04T12:00:00.000Z', 0)).toBe('2026-03-04');
  });
});

describe('HabitKit import', () => {
  const report = parseHabitKitExport(exportFixture());

  it('maps icons and colours onto our own sets', () => {
    expect(report.data.habits[0].iconName).toBe('book');
    expect(report.data.habits[0].color).toBe('#FB7185');
    expect(report.unknownIcons).toEqual([]);
    expect(report.unknownColors).toEqual([]);
  });

  it('carries isInverse over as a quit habit', () => {
    expect(report.data.habits[1].polarity).toBe('quit');
    expect(report.data.habits[0].polarity).toBe('build');
  });

  it('keeps archived habits instead of dropping their history', () => {
    expect(report.data.habits).toHaveLength(2);
    expect(report.archived).toBe(1);
  });

  it('uses the interval still in force', () => {
    // The open-ended one is week x3, manual, 2 per day.
    expect(report.data.habits[0].streakGoal).toEqual({ count: 3, period: 'week' });
    expect(report.data.habits[0].trackingType).toBe('custom');
    expect(report.data.habits[0].completionsPerDay).toBe(2);
  });

  it('turns a daily interval into a day streak', () => {
    const daily = parseHabitKitExport(
      exportFixture({
        intervals: [
          {
            habitId: 'h1', startDate: '2025-07-14T22:00:00.000Z', endDate: null, type: 'day',
            requiredNumberOfCompletions: null, requiredNumberOfCompletionsPerDay: 1,
            unitType: 'incremental',
          },
        ],
      })
    );
    expect(daily.data.habits[0].streakGoal).toEqual({ count: 1, period: 'day' });
  });

  it('drops zero rows and entries for habits that are gone', () => {
    expect(report.data.entries.h1).toEqual({ '2025-07-15': 1, '2025-07-16': 2 });
    expect(report.droppedZeroCompletions).toBe(1);
    expect(report.orphanCompletions).toBe(1);
    expect(report.completions).toBe(2);
  });

  it('pulls createdAt back when an entry predates it', () => {
    // h1 says it was created on the 20th but was logged on the 15th.
    expect(report.data.habits[0].createdAt).toBe('2025-07-15');
  });

  it('keeps category assignments', () => {
    expect(report.data.categories[0].name).toBe('Good to have');
    expect(report.data.habits[0].categoryIds).toEqual(['c1']);
  });

  it('drops preset categories nothing is filed under', () => {
    const withUnused = parseHabitKitExport(
      exportFixture({
        categories: [
          { id: 'c1', name: 'Good to have', icon: 'heart', orderIndex: 0 },
          { id: 'c9', name: 'Unused preset', icon: 'palette', orderIndex: 1 },
        ],
      })
    );
    expect(withUnused.data.categories.map((c) => c.name)).toEqual(['Good to have']);
  });

  it('replaces an unknown icon rather than failing the whole import', () => {
    const odd = parseHabitKitExport(
      exportFixture({
        habits: [{
          id: 'h1', name: 'X', description: null, icon: 'no_such_icon', color: 'no_such_colour',
          archived: false, orderIndex: 0, createdAt: '2026-01-01T00:00:00.000Z',
          isInverse: false, emoji: null,
        }],
      })
    );
    expect(odd.data.habits).toHaveLength(1);
    expect(odd.unknownIcons).toEqual(['no_such_icon']);
    expect(odd.unknownColors).toEqual(['no_such_colour']);
  });

  it('rejects a file that is not an export at all', () => {
    expect(() => parseHabitKitExport('{"nope":1}')).toThrow(/does not look like a HabitKit export/);
    expect(() => parseHabitKitExport('not json')).toThrow(/not valid JSON/);
  });
});

describe('format detection', () => {
  it('recognises our own backup', () => {
    const own = buildBackup({ habits: [], categories: [], entries: {}, settings: DEFAULT_SETTINGS });
    expect(parseAnyBackup(JSON.stringify(own)).source).toBe('own');
  });

  it('recognises a HabitKit export', () => {
    expect(parseAnyBackup(exportFixture()).source).toBe('habitkit');
  });

  it('names both formats when it recognises neither', () => {
    expect(() => parseAnyBackup('{"something":"else"}')).toThrow(/neither a backup from this app nor a HabitKit export/);
  });

  it('reports what the HabitKit import had to skip', () => {
    expect(parseAnyBackup(exportFixture()).note).toMatch(/1 archived/);
  });
});
