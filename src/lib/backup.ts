import { DEFAULT_SETTINGS, type AppData, type Category, type Entries, type Habit } from '@/store/types';

export const BACKUP_FORMAT = 'habitkit-clone';
export const BACKUP_VERSION = 1;

export type Backup = {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
} & AppData;

export function buildBackup(data: AppData): Backup {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    ...data,
  };
}

export class BackupError extends Error {}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Parses a backup written by this app. Deliberately strict: a silently
 * half-imported file would be worse than a clear error, because the import
 * replaces everything.
 */
export function parseBackup(json: string): AppData {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new BackupError('That file is not valid JSON.');
  }
  if (!isRecord(raw)) throw new BackupError('That file does not contain a backup.');
  if (raw.format !== BACKUP_FORMAT) {
    throw new BackupError(
      'That file was not exported by this app. Use Import HabitKit Export for a HabitKit file.'
    );
  }
  if (typeof raw.version !== 'number' || raw.version > BACKUP_VERSION) {
    throw new BackupError('That backup was written by a newer version of the app.');
  }
  if (!Array.isArray(raw.habits)) throw new BackupError('The backup has no habits.');

  const habits = raw.habits.map(normaliseHabit);
  const ids = new Set(habits.map((h) => h.id));

  const categories: Category[] = Array.isArray(raw.categories)
    ? raw.categories.filter(isRecord).map((c, i) => ({
        id: String(c.id ?? `c${i}`),
        name: String(c.name ?? 'Category'),
        iconName: String(c.iconName ?? 'tag'),
        order: typeof c.order === 'number' ? c.order : i,
      }))
    : [];

  const entries: Entries = {};
  if (isRecord(raw.entries)) {
    for (const [habitId, days] of Object.entries(raw.entries)) {
      if (!ids.has(habitId) || !isRecord(days)) continue;
      const clean: Record<string, number> = {};
      for (const [date, count] of Object.entries(days)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
        const n = Math.round(Number(count));
        if (Number.isFinite(n) && n > 0) clean[date] = n;
      }
      entries[habitId] = clean;
    }
  }

  return {
    habits,
    categories,
    entries,
    settings: { ...DEFAULT_SETTINGS, ...(isRecord(raw.settings) ? raw.settings : {}) },
  };
}

function normaliseHabit(value: unknown, index: number): Habit {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string') {
    throw new BackupError(`Habit ${index + 1} in the backup is missing an id or a name.`);
  }
  const polarity = value.polarity === 'quit' ? 'quit' : 'build';
  return {
    id: value.id,
    name: value.name,
    description: typeof value.description === 'string' ? value.description : '',
    iconName: typeof value.iconName === 'string' ? value.iconName : 'pulse',
    color: typeof value.color === 'string' ? value.color : '#FB923C',
    categoryIds: Array.isArray(value.categoryIds) ? value.categoryIds.map(String) : [],
    polarity,
    streakGoal: isRecord(value.streakGoal)
      ? {
          count: Number(value.streakGoal.count) || 1,
          period:
            value.streakGoal.period === 'month' || value.streakGoal.period === 'day'
              ? value.streakGoal.period
              : 'week',
        }
      : null,
    trackingType: value.trackingType === 'custom' ? 'custom' : 'step',
    completionsPerDay:
      typeof value.completionsPerDay === 'number'
        ? value.completionsPerDay
        : polarity === 'quit'
          ? 0
          : 1,
    archived: value.archived === true,
    order: typeof value.order === 'number' ? value.order : index,
    createdAt:
      typeof value.createdAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.createdAt)
        ? value.createdAt
        : '2020-01-01',
    reminder: null,
  };
}

export function backupFilename(): string {
  return `habitkit-backup-${new Date().toISOString().slice(0, 10)}.json`;
}
