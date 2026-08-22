import { BackupError, buildBackup, parseBackup } from '@/lib/backup';
import { DEFAULT_SETTINGS, type AppData, type Habit } from '@/store/types';

function habit(over: Partial<Habit> = {}): Habit {
  return {
    id: 'h1', name: 'Lesen', description: '', iconName: 'book', color: '#FB7185',
    categoryIds: [], polarity: 'build', streakGoal: null, trackingType: 'step',
    completionsPerDay: 1, archived: false, order: 0, createdAt: '2026-01-01',
    reminder: null, ...over,
  };
}

const data: AppData = {
  habits: [habit(), habit({ id: 'h2', name: 'Rauchen', polarity: 'quit', completionsPerDay: 0 })],
  categories: [{ id: 'c1', name: 'Morning', iconName: 'sunrise', order: 0 }],
  entries: { h1: { '2026-01-02': 1 }, h2: { '2026-01-03': 2 } },
  settings: DEFAULT_SETTINGS,
};

describe('backup round trip', () => {
  it('survives export then import unchanged', () => {
    const restored = parseBackup(JSON.stringify(buildBackup(data)));
    expect(restored.habits).toEqual(data.habits);
    expect(restored.categories).toEqual(data.categories);
    expect(restored.entries).toEqual(data.entries);
    expect(restored.settings).toEqual(data.settings);
  });

  it('keeps quit habits quit', () => {
    const restored = parseBackup(JSON.stringify(buildBackup(data)));
    expect(restored.habits[1].polarity).toBe('quit');
    expect(restored.habits[1].completionsPerDay).toBe(0);
  });
});

describe('backup rejects bad input', () => {
  it('refuses non-JSON', () => {
    expect(() => parseBackup('not json')).toThrow(BackupError);
  });

  it('refuses a foreign file', () => {
    expect(() => parseBackup(JSON.stringify({ habits: [] }))).toThrow(/not exported by this app/);
  });

  it('refuses a newer format version', () => {
    const future = { ...buildBackup(data), version: 99 };
    expect(() => parseBackup(JSON.stringify(future))).toThrow(/newer version/);
  });

  it('refuses a habit without a name', () => {
    const broken = { ...buildBackup(data), habits: [{ id: 'x' }] };
    expect(() => parseBackup(JSON.stringify(broken))).toThrow(/missing an id or a name/);
  });
});

describe('backup cleans up junk', () => {
  it('drops entries for habits that are not in the file', () => {
    const orphan = { ...buildBackup(data), entries: { ...data.entries, ghost: { '2026-01-01': 1 } } };
    expect(Object.keys(parseBackup(JSON.stringify(orphan)).entries).sort()).toEqual(['h1', 'h2']);
  });

  it('drops malformed dates and non-positive counts', () => {
    const messy = {
      ...buildBackup(data),
      entries: { h1: { '2026-01-02': 1, 'not-a-date': 5, '2026-01-04': 0, '2026-01-05': -3 } },
    };
    expect(parseBackup(JSON.stringify(messy)).entries.h1).toEqual({ '2026-01-02': 1 });
  });
});
