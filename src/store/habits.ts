import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

import { todayKey, type DateKey } from '@/lib/date';
import { storage } from '@/store/storage';
import {
  DEFAULT_SETTINGS, type AppData, type Category, type Habit, type Profile, type Settings,
} from '@/store/types';
import { HABIT_COLORS } from '@/theme';

export const STORAGE_KEY = 'habitkit-store-v1';

/** The one profile every install starts with, so an old single-profile
 *  backup rehydrates straight into it with no migration step needed. */
const DEFAULT_PROFILE_ID = 'default';

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyAppData(): AppData {
  return { habits: [], categories: [], entries: {}, settings: DEFAULT_SETTINGS };
}

export type NewHabit = Omit<Habit, 'id' | 'order' | 'createdAt' | 'archived' | 'reminder'> &
  Partial<Pick<Habit, 'createdAt'>>;

type State = AppData & {
  /** All known profiles, including the active one. */
  profiles: Profile[];
  activeProfileId: string;
  /** Snapshots for every profile EXCEPT the active one — its data lives in
   *  the top-level `habits`/`categories`/`entries`/`settings` above instead,
   *  so every existing selector and action keeps working unchanged. */
  archive: Record<string, AppData>;

  hydrated: boolean;
  setHydrated: () => void;

  addHabit: (input: NewHabit) => string;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  removeHabit: (id: string) => void;
  setArchived: (id: string, archived: boolean) => void;
  reorderHabits: (orderedIds: string[]) => void;

  addCategory: (name: string, iconName?: string) => string;
  removeCategory: (id: string) => void;

  /** Adds `delta` to a day's count, clamped at zero. */
  bump: (habitId: string, date: DateKey, delta?: number) => void;
  setCount: (habitId: string, date: DateKey, count: number) => void;

  updateSettings: (patch: Partial<Settings>) => void;

  replaceAll: (data: AppData) => void;
  exportData: () => AppData;

  /** Creates an empty profile and returns its id; does not switch to it. */
  addProfile: (name: string) => string;
  /** No-op for the active id or an unknown one. */
  switchProfile: (id: string) => void;
  renameProfile: (id: string, name: string) => void;
  /** Refuses to remove the last remaining profile. Permanently drops that
   *  profile's data — there is no undo once this runs. */
  removeProfile: (id: string) => void;
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      habits: [],
      categories: [],
      entries: {},
      settings: DEFAULT_SETTINGS,
      profiles: [{ id: DEFAULT_PROFILE_ID, name: 'Me', color: HABIT_COLORS[0], createdAt: todayKey() }],
      activeProfileId: DEFAULT_PROFILE_ID,
      archive: {},
      hydrated: false,

      setHydrated: () => set({ hydrated: true }),

      addHabit: (input) => {
        const id = uid();
        set((s) => ({
          habits: [
            ...s.habits,
            {
              ...input,
              id,
              order: s.habits.length,
              createdAt: input.createdAt ?? todayKey(),
              archived: false,
              reminder: null,
            },
          ],
        }));
        return id;
      },

      updateHabit: (id, patch) =>
        set((s) => ({
          habits: s.habits.map((h) => (h.id === id ? { ...h, ...patch, id } : h)),
        })),

      removeHabit: (id) =>
        set((s) => {
          const { [id]: _dropped, ...entries } = s.entries;
          return { habits: s.habits.filter((h) => h.id !== id), entries };
        }),

      setArchived: (id, archived) =>
        set((s) => ({
          habits: s.habits.map((h) => (h.id === id ? { ...h, archived } : h)),
        })),

      reorderHabits: (orderedIds) =>
        set((s) => ({
          habits: s.habits.map((h) => {
            const i = orderedIds.indexOf(h.id);
            return i === -1 ? h : { ...h, order: i };
          }),
        })),

      addCategory: (name, iconName = 'pricetag-outline') => {
        const id = uid();
        set((s) => ({
          categories: [...s.categories, { id, name, iconName, order: s.categories.length }],
        }));
        return id;
      },

      removeCategory: (id) =>
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
          habits: s.habits.map((h) => ({
            ...h,
            categoryIds: h.categoryIds.filter((c) => c !== id),
          })),
        })),

      bump: (habitId, date, delta = 1) => {
        const current = get().entries[habitId]?.[date] ?? 0;
        get().setCount(habitId, date, current + delta);
      },

      setCount: (habitId, date, count) =>
        set((s) => {
          const forHabit = { ...(s.entries[habitId] ?? {}) };
          const next = Math.max(0, Math.round(count));
          if (next === 0) delete forHabit[date];
          else forHabit[date] = next;
          return { entries: { ...s.entries, [habitId]: forHabit } };
        }),

      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      replaceAll: (data) =>
        set({
          habits: data.habits,
          categories: data.categories,
          entries: data.entries,
          settings: { ...DEFAULT_SETTINGS, ...data.settings },
        }),

      exportData: () => {
        const { habits, categories, entries, settings } = get();
        return { habits, categories, entries, settings };
      },

      addProfile: (name) => {
        const id = uid();
        set((s) => ({
          profiles: [
            ...s.profiles,
            { id, name, color: HABIT_COLORS[s.profiles.length % HABIT_COLORS.length], createdAt: todayKey() },
          ],
          archive: { ...s.archive, [id]: emptyAppData() },
        }));
        return id;
      },

      switchProfile: (id) =>
        set((s) => {
          if (id === s.activeProfileId || !s.profiles.some((p) => p.id === id)) return s;
          const outgoing: AppData = {
            habits: s.habits, categories: s.categories, entries: s.entries, settings: s.settings,
          };
          const incoming = s.archive[id] ?? emptyAppData();
          const { [id]: _incoming, ...restArchive } = s.archive;
          return {
            ...incoming,
            activeProfileId: id,
            archive: { ...restArchive, [s.activeProfileId]: outgoing },
          };
        }),

      renameProfile: (id, name) =>
        set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? { ...p, name } : p)) })),

      removeProfile: (id) =>
        set((s) => {
          if (s.profiles.length <= 1) return s;
          const remaining = s.profiles.filter((p) => p.id !== id);
          if (id !== s.activeProfileId) {
            const { [id]: _dropped, ...archive } = s.archive;
            return { profiles: remaining, archive };
          }
          const next = remaining[0];
          const incoming = s.archive[next.id] ?? emptyAppData();
          const { [next.id]: _used, ...archive } = s.archive;
          return { ...incoming, profiles: remaining, activeProfileId: next.id, archive };
        }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => storage),
      partialize: ({ habits, categories, entries, settings, profiles, activeProfileId, archive }) => ({
        habits,
        categories,
        entries,
        settings,
        profiles,
        activeProfileId,
        archive,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);

// These selectors build a new array every call, so they must be read through
// `useShallow` — otherwise zustand's Object.is check re-renders forever.
const byOrder = (a: { order: number }, b: { order: number }) => a.order - b.order;

/** Active habits in display order. */
export function useVisibleHabits(): Habit[] {
  return useStore(
    useShallow((s) => s.habits.filter((h) => !h.archived).sort(byOrder))
  );
}

export function useArchivedHabits(): Habit[] {
  return useStore(
    useShallow((s) => s.habits.filter((h) => h.archived).sort(byOrder))
  );
}

export function useCategories(): Category[] {
  return useStore(useShallow((s) => [...s.categories].sort(byOrder)));
}

export function useHabit(id: string | undefined): Habit | undefined {
  return useStore((s) => s.habits.find((h) => h.id === id));
}

/** All profiles, in the order they were created. This is the state array
 *  itself, not a derived copy, so no `useShallow` is needed here. */
export function useProfiles(): Profile[] {
  return useStore((s) => s.profiles);
}

export function useActiveProfile(): Profile | undefined {
  return useStore((s) => s.profiles.find((p) => p.id === s.activeProfileId));
}
