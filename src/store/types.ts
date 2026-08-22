import type { DateKey } from '@/lib/date';

/**
 * `build` = something you want to do (Lesen, Meditieren).
 * `quit`  = something you want to avoid (Alkohol trinken, Smoken). A filled
 *           cell marks the slip, and a clean day is the good one.
 */
export type Polarity = 'build' | 'quit';

export type TrackingType = 'step' | 'custom';

export type StreakGoal = { count: number; period: 'week' | 'month' };

export type Habit = {
  id: string;
  name: string;
  description: string;
  iconName: string;
  color: string;
  categoryIds: string[];
  polarity: Polarity;
  /** Only meaningful for `build`; `quit` streaks always count clean days. */
  streakGoal: StreakGoal | null;
  trackingType: TrackingType;
  /** `build`: daily target. `quit`: the number still allowed per day. */
  completionsPerDay: number;
  archived: boolean;
  order: number;
  createdAt: DateKey;
  /** Reserved. Reminders are out of scope for v1. */
  reminder: null;
};

export type Category = {
  id: string;
  name: string;
  iconName: string;
  order: number;
};

/** habitId -> date -> count. Nested for O(1) heatmap lookups. */
export type Entries = Record<string, Record<DateKey, number>>;

export type Settings = {
  /** 0 = Sunday, 1 = Monday. */
  firstDayOfWeek: 0 | 1;
  /** Default number of columns on the checklist screen. */
  defaultRangeDays: 1 | 3 | 5 | 7;
  accent: string;
};

export const DEFAULT_SETTINGS: Settings = {
  firstDayOfWeek: 1,
  defaultRangeDays: 3,
  accent: '#A855F7',
};

export type AppData = {
  habits: Habit[];
  categories: Category[];
  entries: Entries;
  settings: Settings;
};
