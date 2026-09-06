import { useStore } from '@/store/habits';
import { DEFAULT_SETTINGS } from '@/store/types';

const BASE_HABIT = {
  description: '',
  iconName: 'pulse',
  color: '#FB923C',
  categoryIds: [],
  polarity: 'build' as const,
  streakGoal: null,
  trackingType: 'step' as const,
  completionsPerDay: 1,
};

/** Reset to one clean "default" profile before every test — a partial
 *  `setState` merge, so the store's own action functions are untouched. */
function reset() {
  useStore.setState({
    habits: [],
    categories: [],
    entries: {},
    settings: DEFAULT_SETTINGS,
    profiles: [{ id: 'default', name: 'Me', color: '#F87171', createdAt: '2026-01-01' }],
    activeProfileId: 'default',
    archive: {},
  });
}
beforeEach(reset);

describe('profiles', () => {
  it('starts with exactly one active profile', () => {
    const s = useStore.getState();
    expect(s.profiles).toEqual([{ id: 'default', name: 'Me', color: '#F87171', createdAt: '2026-01-01' }]);
    expect(s.activeProfileId).toBe('default');
  });

  it('keeps each profile\'s habits and entries fully separate', () => {
    const readId = useStore.getState().addHabit({ ...BASE_HABIT, name: 'Read' });
    useStore.getState().bump(readId, '2026-01-01');

    const partnerId = useStore.getState().addProfile('Partner');
    useStore.getState().switchProfile(partnerId);

    // A fresh profile starts completely empty, not a copy of the other one.
    expect(useStore.getState().habits).toEqual([]);
    expect(useStore.getState().entries).toEqual({});

    const runId = useStore.getState().addHabit({ ...BASE_HABIT, name: 'Run' });
    useStore.getState().bump(runId, '2026-01-02');
    expect(useStore.getState().habits.map((h) => h.name)).toEqual(['Run']);

    // Switching back restores the first profile's data untouched.
    useStore.getState().switchProfile('default');
    expect(useStore.getState().habits.map((h) => h.name)).toEqual(['Read']);
    expect(useStore.getState().entries[readId]).toEqual({ '2026-01-01': 1 });

    // And the other profile's data is still there, unaffected.
    useStore.getState().switchProfile(partnerId);
    expect(useStore.getState().habits.map((h) => h.name)).toEqual(['Run']);
    expect(useStore.getState().entries[runId]).toEqual({ '2026-01-02': 1 });
  });

  it('is a no-op when switching to the already-active or an unknown profile', () => {
    useStore.getState().addHabit({ ...BASE_HABIT, name: 'Read' });
    useStore.getState().switchProfile('default');
    useStore.getState().switchProfile('does-not-exist');
    expect(useStore.getState().habits.map((h) => h.name)).toEqual(['Read']);
    expect(useStore.getState().activeProfileId).toBe('default');
  });

  it('renames a profile without touching its data', () => {
    useStore.getState().renameProfile('default', 'Ben');
    expect(useStore.getState().profiles[0].name).toBe('Ben');
  });

  it('refuses to remove the last remaining profile', () => {
    useStore.getState().removeProfile('default');
    expect(useStore.getState().profiles).toHaveLength(1);
  });

  it('deletes a non-active profile and its archived data', () => {
    const id = useStore.getState().addProfile('Temp');
    expect(useStore.getState().archive[id]).toBeDefined();

    useStore.getState().removeProfile(id);
    expect(useStore.getState().profiles.map((p) => p.id)).toEqual(['default']);
    expect(useStore.getState().archive[id]).toBeUndefined();
  });

  it('switches to the profile that remains when the active one is deleted', () => {
    const id = useStore.getState().addProfile('Temp');
    useStore.getState().switchProfile(id);
    useStore.getState().addHabit({ ...BASE_HABIT, name: 'Only in Temp' });

    useStore.getState().removeProfile(id);

    expect(useStore.getState().activeProfileId).toBe('default');
    expect(useStore.getState().profiles).toHaveLength(1);
    expect(useStore.getState().habits).toEqual([]);
  });
});
