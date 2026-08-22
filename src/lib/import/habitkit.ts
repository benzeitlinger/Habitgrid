import { toKey, type DateKey } from '@/lib/date';
import { DEFAULT_ICON } from '@/icons';
import { DEFAULT_SETTINGS, type AppData, type Category, type Entries, type Habit, type StreakGoal } from '@/store/types';

/**
 * Reads a HabitKit export (Settings -> Data Import/Export in the original app).
 *
 * The shape below was taken from a real export; anything unrecognised falls
 * back to a sane default rather than failing, because losing years of history
 * over one unknown icon name would be the wrong trade.
 */

export class HabitKitImportError extends Error {}

type RawHabit = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  archived: boolean;
  orderIndex: number;
  createdAt: string;
  isInverse: boolean;
  emoji: string | null;
};

type RawCompletion = {
  date: string;
  habitId: string;
  timezoneOffsetInMinutes: number;
  amountOfCompletions: number;
};

type RawInterval = {
  habitId: string;
  startDate: string;
  endDate: string | null;
  type: 'none' | 'day' | 'week' | 'month';
  requiredNumberOfCompletions: number | null;
  requiredNumberOfCompletionsPerDay: number | null;
  unitType: 'incremental' | 'manual';
};

type RawCategory = { id: string; name: string; icon: string | null; orderIndex: number };
type RawMapping = { habitId: string; categoryId: string };

type RawExport = {
  habits: RawHabit[];
  completions: RawCompletion[];
  intervals: RawInterval[];
  categories: RawCategory[];
  categoryMappings: RawMapping[];
};

/** HabitKit icon name -> key in src/icons.ts. */
const ICON_MAP: Record<string, string> = {
  activity: 'pulse',
  alarm_check: 'alarm',
  aperture: 'aperture',
  book: 'book',
  cannabis: 'cannabis',
  edit: 'edit',
  eye: 'eye',
  glass: 'glass',
  pen: 'pen',
  sun: 'sun',
  twitter: 'xsocial',
  bike: 'bicycle',
  brain: 'brain',
  briefcase: 'briefcase',
  cloud_sun: 'sun',
  diamond: 'diamond',
  graduation: 'school',
  heart: 'heart',
  moneybill: 'money',
  moon: 'moon',
  palette: 'paint',
  preaching: 'pray',
  socialize: 'people',
  utensils: 'food',
  barbell: 'barbell',
  water: 'water',
  bed: 'bed',
  run: 'run',
  music: 'music',
  film: 'film',
  camera: 'camera',
  home: 'home',
  leaf: 'leaf',
  paw: 'paw',
  phone: 'phone',
  star: 'star',
  trophy: 'trophy',
  timer: 'timer',
  calendar: 'calendar',
};

/** HabitKit colour name -> the nearest swatch in our palette. */
const COLOR_MAP: Record<string, string> = {
  red: '#FB7185',
  orange: '#FB923C',
  amber: '#FBBF24',
  yellow: '#FACC15',
  lime: '#A3E635',
  green: '#34D399',
  emerald: '#2DD4A7',
  teal: '#2DD4BF',
  cyan: '#22D3EE',
  sky: '#38BDF8',
  blue: '#3B82F6',
  indigo: '#6366F1',
  violet: '#A78BFA',
  purple: '#C084FC',
  fuchsia: '#E879F9',
  pink: '#F472B6',
  rose: '#FB7185',
  slate: '#94A3B8',
  gray: '#9CA3AF',
  zinc: '#A8A29E',
  stone: '#8B8378',
};

const FALLBACK_COLOR = '#FB923C';

export type ImportReport = {
  data: AppData;
  habits: number;
  archived: number;
  completions: number;
  droppedZeroCompletions: number;
  orphanCompletions: number;
  unknownIcons: string[];
  unknownColors: string[];
};

/**
 * HabitKit stores each completion as UTC plus the offset that was in force
 * where it was logged. `2025-07-14T22:00:00Z` with offset 120 is the 15th
 * locally — reading the UTC date alone would shift half the history back a day.
 */
export function localDateOf(utcISO: string, offsetMinutes: number): DateKey {
  const shifted = new Date(new Date(utcISO).getTime() + offsetMinutes * 60_000);
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(
    shifted.getUTCDate()
  ).padStart(2, '0')}`;
}

/** The interval in force today, else the most recently started one. */
function activeInterval(intervals: RawInterval[], habitId: string): RawInterval | null {
  const mine = intervals.filter((i) => i.habitId === habitId);
  if (mine.length === 0) return null;
  return (
    mine.find((i) => i.endDate === null) ??
    [...mine].sort((a, b) => (a.startDate < b.startDate ? 1 : -1))[0]
  );
}

function streakGoalFrom(interval: RawInterval | null): StreakGoal | null {
  if (!interval || interval.type === 'none') return null;
  if (interval.type === 'day') return { count: 1, period: 'day' };
  return {
    count: interval.requiredNumberOfCompletions ?? 1,
    period: interval.type === 'month' ? 'month' : 'week',
  };
}

export function parseHabitKitExport(json: string): ImportReport {
  let raw: RawExport;
  try {
    raw = JSON.parse(json) as RawExport;
  } catch {
    throw new HabitKitImportError('That file is not valid JSON.');
  }
  if (!raw || !Array.isArray(raw.habits) || !Array.isArray(raw.completions)) {
    throw new HabitKitImportError(
      'That does not look like a HabitKit export. It should contain "habits" and "completions".'
    );
  }

  const intervals = Array.isArray(raw.intervals) ? raw.intervals : [];
  const mappings = Array.isArray(raw.categoryMappings) ? raw.categoryMappings : [];
  const unknownIcons = new Set<string>();
  const unknownColors = new Set<string>();

  // HabitKit ships a set of preset categories whether or not they are used.
  // Keeping the unused ones would fill the filter row with chips that match
  // nothing, so only assigned categories come across.
  const usedCategoryIds = new Set(mappings.map((m) => m.categoryId));
  const categories: Category[] = (Array.isArray(raw.categories) ? raw.categories : [])
    .filter((c) => usedCategoryIds.has(c.id))
    .map((c, i) => {
      const key = c.icon ? ICON_MAP[c.icon] : undefined;
      if (c.icon && !key) unknownIcons.add(c.icon);
      return {
        id: c.id,
        name: c.name,
        iconName: key ?? 'tag',
        order: c.orderIndex ?? i,
      };
    });

  const habits: Habit[] = raw.habits.map((h, i) => {
    const interval = activeInterval(intervals, h.id);
    const iconKey = h.icon ? ICON_MAP[h.icon] : undefined;
    if (h.icon && !iconKey) unknownIcons.add(h.icon);
    const color = h.color ? COLOR_MAP[h.color] : undefined;
    if (h.color && !color) unknownColors.add(h.color);

    return {
      id: h.id,
      name: h.name,
      description: h.description ?? '',
      iconName: iconKey ?? DEFAULT_ICON,
      color: color ?? FALLBACK_COLOR,
      categoryIds: mappings.filter((m) => m.habitId === h.id).map((m) => m.categoryId),
      polarity: h.isInverse ? 'quit' : 'build',
      streakGoal: streakGoalFrom(interval),
      trackingType: interval?.unitType === 'manual' ? 'custom' : 'step',
      completionsPerDay: interval?.requiredNumberOfCompletionsPerDay ?? 1,
      archived: h.archived === true,
      order: h.orderIndex ?? i,
      createdAt: toKey(new Date(h.createdAt)),
      reminder: null,
    };
  });

  const known = new Set(habits.map((h) => h.id));
  const entries: Entries = {};
  let completions = 0;
  let droppedZeroCompletions = 0;
  let orphanCompletions = 0;

  for (const c of raw.completions) {
    if (!known.has(c.habitId)) {
      orphanCompletions++;
      continue;
    }
    const amount = Math.round(c.amountOfCompletions ?? 0);
    if (amount <= 0) {
      droppedZeroCompletions++;
      continue;
    }
    const key = localDateOf(c.date, c.timezoneOffsetInMinutes ?? 0);
    const forHabit = (entries[c.habitId] ??= {});
    // HabitKit can hold more than one row for a day; they add up.
    forHabit[key] = (forHabit[key] ?? 0) + amount;
    completions++;
  }

  // A habit cannot have been created after its first entry.
  for (const habit of habits) {
    const days = Object.keys(entries[habit.id] ?? {});
    if (days.length === 0) continue;
    const earliest = days.sort()[0];
    if (earliest < habit.createdAt) habit.createdAt = earliest;
  }

  return {
    data: { habits, categories, entries, settings: DEFAULT_SETTINGS },
    habits: habits.length,
    archived: habits.filter((h) => h.archived).length,
    completions,
    droppedZeroCompletions,
    orphanCompletions,
    unknownIcons: [...unknownIcons],
    unknownColors: [...unknownColors],
  };
}
