import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

import { todayKey, type DateKey } from '@/lib/date';
import { DEFAULT_SETTINGS, type AppData, type Category, type Habit, type Settings } from '@/store/types';

export const STORAGE_KEY = 'habitkit-store-v1';

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export type NewHabit = Omit<Habit, 'id' | 'order' | 'createdAt' | 'archived' | 'reminder'> &
  Partial<Pick<Habit, 'createdAt'>>;

type State = AppData & {
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
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      habits: [],
      categories: [],
      entries: {},
      settings: DEFAULT_SETTINGS,
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
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ habits, categories, entries, settings }) => ({
        habits,
        categories,
        entries,
        settings,
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
