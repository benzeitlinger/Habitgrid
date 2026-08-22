import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ColorGrid } from '@/components/ColorGrid';
import { Icon } from '@/components/Icon';
import { IconPicker } from '@/components/IconPicker';
import { Segmented } from '@/components/Segmented';
import { Field, Hint, Sheet } from '@/components/Sheet';
import { DEFAULT_ICON } from '@/icons';
import { confirmDestructive } from '@/lib/dialog';
import { closeSheet } from '@/lib/nav';
import { useCategories, useHabit, useStore } from '@/store/habits';
import type { Habit, Polarity, StreakGoal, TrackingType } from '@/store/types';
import { colors, HABIT_COLORS, radius, withAlpha } from '@/theme';

type Draft = {
  name: string;
  description: string;
  iconName: string;
  color: string;
  polarity: Polarity;
  categoryIds: string[];
  streakGoal: StreakGoal | null;
  trackingType: TrackingType;
  completionsPerDay: number;
};

const BLANK: Draft = {
  name: '',
  description: '',
  iconName: DEFAULT_ICON,
  color: HABIT_COLORS[1],
  polarity: 'build',
  categoryIds: [],
  streakGoal: null,
  trackingType: 'step',
  completionsPerDay: 1,
};

function draftFrom(habit: Habit): Draft {
  const { name, description, iconName, color, polarity, categoryIds, streakGoal,
    trackingType, completionsPerDay } = habit;
  return { name, description, iconName, color, polarity, categoryIds, streakGoal,
    trackingType, completionsPerDay };
}

export default function HabitSheet() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';

  const existing = useHabit(isNew ? undefined : id);
  const categories = useCategories();
  const addHabit = useStore((s) => s.addHabit);
  const updateHabit = useStore((s) => s.updateHabit);
  const removeHabit = useStore((s) => s.removeHabit);
  const setArchived = useStore((s) => s.setArchived);
  const addCategory = useStore((s) => s.addCategory);

  const [draft, setDraft] = useState<Draft>(() => (existing ? draftFrom(existing) : BLANK));
  const [advanced, setAdvanced] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  const isQuit = draft.polarity === 'quit';
  const canSave = draft.name.trim().length > 0;

  // Switching polarity flips what the daily number means, so reset it to the
  // sensible default rather than carrying "1 allowed per day" into a quit habit.
  const setPolarity = (polarity: Polarity) =>
    patch({
      polarity,
      completionsPerDay: polarity === 'quit' ? 0 : 1,
      streakGoal: polarity === 'quit' ? null : draft.streakGoal,
    });

  const save = () => {
    if (!canSave) return;
    const payload = { ...draft, name: draft.name.trim(), description: draft.description.trim() };
    if (isNew) addHabit(payload);
    else if (existing) updateHabit(existing.id, payload);
    closeSheet(router);
  };

  const confirmDelete = async () => {
    if (!existing) return;
    const ok = await confirmDestructive(
      'Delete habit?',
      `"${existing.name}" and all its history will be removed.`,
      'Delete'
    );
    if (!ok) return;
    removeHabit(existing.id);
    closeSheet(router);
  };

  const dayLabel = isQuit ? 'Allowed Per Day' : 'Completions Per Day';
  const dayHint = isQuit
    ? 'A day stays clean up to this number'
    : 'The square will be filled completely when this number is met';

  return (
    <Sheet
      title={isNew ? 'New Habit' : 'Edit Habit'}
      onClose={() => closeSheet(router)}
      footer={
        <Pressable
          onPress={save}
          disabled={!canSave}
          accessibilityRole="button"
          accessibilityLabel="Save habit"
          accessibilityState={{ disabled: !canSave }}
          style={[styles.save, canSave && { backgroundColor: withAlpha(draft.color, 0.2), borderColor: draft.color }]}
        >
          <Text style={[styles.saveText, canSave && { color: draft.color }]}>Save</Text>
        </Pressable>
      }
    >
      <IconPicker
        value={draft.iconName}
        color={draft.color}
        onChange={(iconName) => patch({ iconName })}
      />

      <Field label="Name">
        <TextInput
          value={draft.name}
          onChangeText={(name) => patch({ name })}
          placeholder="Read 10 pages"
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel="Habit name"
          style={styles.input}
        />
      </Field>

      <Field label="Description">
        <TextInput
          value={draft.description}
          onChangeText={(description) => patch({ description })}
          placeholder="Optional"
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel="Habit description"
          style={styles.input}
        />
      </Field>

      <Field label="Color">
        <ColorGrid value={draft.color} onChange={(color) => patch({ color })} />
      </Field>

      <Field label="Habit Type">
        <Segmented
          value={draft.polarity}
          onChange={setPolarity}
          accent={draft.color}
          options={[
            { value: 'build', label: 'Build' },
            { value: 'quit', label: 'Quit' },
          ]}
        />
        <Hint>
          {isQuit
            ? 'Something you want to avoid. A filled square marks a slip, and the streak counts clean days.'
            : 'Something you want to do. A filled square marks a completed day.'}
        </Hint>
      </Field>

      <Pressable
        onPress={() => setAdvanced((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel="Advanced Options"
        accessibilityState={{ expanded: advanced }}
        style={styles.advancedToggle}
      >
        <View style={styles.rule} />
        <Text style={styles.advancedLabel}>Advanced Options</Text>
        <Icon name={advanced ? 'ui-up' : 'ui-down'} size={18} color={colors.textSecondary} />
        <View style={styles.rule} />
      </Pressable>

      {advanced ? (
        <>
          <View style={styles.twoUp}>
            {isQuit ? null : (
              <View style={styles.half}>
                <Field label="Streak Goal">
                  <StreakGoalPicker
                    value={draft.streakGoal}
                    color={draft.color}
                    onChange={(streakGoal) => patch({ streakGoal })}
                  />
                </Field>
              </View>
            )}
            <View style={styles.half}>
              <Field label="Reminder">
                <View style={[styles.rowButton, styles.disabledRow]}>
                  <Text style={styles.rowValue}>None</Text>
                  <Icon name="ui-forward" size={18} color={colors.textTertiary} />
                </View>
              </Field>
              <Hint>Not available yet</Hint>
            </View>
          </View>

          <Field label="Categories">
            <View style={styles.chipWrap}>
              {categories.map((c) => {
                const active = draft.categoryIds.includes(c.id);
                return (
                  <Pressable
                    key={c.id}
                    onPress={() =>
                      patch({
                        categoryIds: active
                          ? draft.categoryIds.filter((x) => x !== c.id)
                          : [...draft.categoryIds, c.id],
                      })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Category ${c.name}`}
                    accessibilityState={{ selected: active }}
                    style={[
                      styles.chip,
                      active && { backgroundColor: withAlpha(draft.color, 0.18), borderColor: draft.color },
                    ]}
                  >
                    <Icon name={c.iconName} size={15} color={active ? draft.color : colors.textSecondary} />
                    <Text style={[styles.chipText, active && { color: draft.color }]}>{c.name}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.addCategory}>
              <TextInput
                value={newCategory}
                onChangeText={setNewCategory}
                placeholder="New category"
                placeholderTextColor={colors.textTertiary}
                accessibilityLabel="New category name"
                style={[styles.input, styles.flex]}
              />
              <Pressable
                disabled={!newCategory.trim()}
                onPress={() => {
                  const cid = addCategory(newCategory.trim());
                  patch({ categoryIds: [...draft.categoryIds, cid] });
                  setNewCategory('');
                }}
                accessibilityRole="button"
                accessibilityLabel="Add category"
                style={[styles.stepper, !newCategory.trim() && styles.dim]}
              >
                <Icon name="ui-plus" size={22} color={colors.textPrimary} />
              </Pressable>
            </View>
          </Field>

          <Field label="How should completions be tracked?">
            <Segmented
              value={draft.trackingType}
              onChange={(trackingType) => patch({ trackingType })}
              accent={draft.color}
              options={[
                { value: 'step', label: 'Step By Step' },
                { value: 'custom', label: 'Custom Value' },
              ]}
            />
            <Hint>
              {draft.trackingType === 'step'
                ? 'Increment by 1 with each completion'
                : 'Type the exact number for the day'}
            </Hint>
          </Field>

          <Field label={dayLabel}>
            <View style={styles.counterRow}>
              <View style={styles.counterValue}>
                <Text style={styles.counterNumber}>{draft.completionsPerDay}</Text>
                <Text style={styles.counterUnit}> / Day</Text>
              </View>
              <Pressable
                onPress={() =>
                  patch({
                    completionsPerDay: Math.max(
                      isQuit ? 0 : 1,
                      draft.completionsPerDay - 1
                    ),
                  })
                }
                accessibilityRole="button"
                accessibilityLabel="Decrease"
                style={styles.stepper}
              >
                <Text style={styles.stepperText}>−</Text>
              </Pressable>
              <Pressable
                onPress={() => patch({ completionsPerDay: draft.completionsPerDay + 1 })}
                accessibilityRole="button"
                accessibilityLabel="Increase"
                style={styles.stepper}
              >
                <Text style={styles.stepperText}>+</Text>
              </Pressable>
            </View>
            <Hint>{dayHint}</Hint>
          </Field>

          {existing ? (
            <View style={styles.dangerZone}>
              <Pressable
                onPress={() => {
                  setArchived(existing.id, !existing.archived);
                  closeSheet(router);
                }}
                accessibilityRole="button"
                accessibilityLabel={existing.archived ? 'Restore Habit' : 'Archive Habit'}
                style={styles.rowButton}
              >
                <Icon name={existing.archived ? 'ui-restore' : 'ui-archive'} size={20} color={colors.textPrimary} />
                <Text style={styles.rowValue}>
                  {existing.archived ? 'Restore Habit' : 'Archive Habit'}
                </Text>
              </Pressable>
              <Pressable
                onPress={confirmDelete}
                accessibilityRole="button"
                accessibilityLabel="Delete Habit"
                style={styles.rowButton}
              >
                <Icon name="ui-trash" size={20} color={colors.danger} />
                <Text style={[styles.rowValue, { color: colors.danger }]}>Delete Habit</Text>
              </Pressable>
            </View>
          ) : null}
        </>
      ) : null}
    </Sheet>
  );
}

const GOAL_COUNTS = [1, 2, 3, 4, 5, 6, 7];

function StreakGoalPicker({
  value, color, onChange,
}: {
  value: StreakGoal | null;
  color: string;
  onChange: (goal: StreakGoal | null) => void;
}) {
  const period = value?.period ?? 'week';
  const counts = useMemo(
    () => (period === 'week' ? GOAL_COUNTS : [...GOAL_COUNTS, 10, 15, 20, 25]),
    [period]
  );

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.chipWrap}>
        <Pressable
          onPress={() => onChange(null)}
          accessibilityRole="button"
          accessibilityLabel="Streak goal none"
          accessibilityState={{ selected: value === null }}
          style={[styles.chip, value === null && { backgroundColor: withAlpha(color, 0.18), borderColor: color }]}
        >
          <Text style={[styles.chipText, value === null && { color }]}>None</Text>
        </Pressable>
        {counts.map((count) => {
          const active = value?.count === count;
          return (
            <Pressable
              key={count}
              onPress={() => onChange({ count, period })}
              accessibilityRole="button"
              accessibilityLabel={`${count} per ${period}`}
              accessibilityState={{ selected: active }}
              style={[styles.chip, active && { backgroundColor: withAlpha(color, 0.18), borderColor: color }]}
            >
              <Text style={[styles.chipText, active && { color }]}>{count}</Text>
            </Pressable>
          );
        })}
      </View>
      {value ? (
        <Segmented
          value={value.period}
          onChange={(p) => onChange({ count: value.count, period: p })}
          accent={color}
          options={[
            { value: 'week', label: 'per Week' },
            { value: 'month', label: 'per Month' },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: colors.textPrimary,
    fontSize: 16,
  },
  flex: { flex: 1 },
  advancedToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  advancedLabel: { color: colors.textSecondary, fontSize: 16, fontWeight: '600' },
  rule: { flex: 1, height: 1, backgroundColor: colors.border },
  twoUp: { flexDirection: 'row', gap: 14 },
  half: { flex: 1, gap: 10 },
  rowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  disabledRow: { justifyContent: 'space-between', opacity: 0.5 },
  rowValue: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { color: colors.textSecondary, fontSize: 15, fontWeight: '600' },
  addCategory: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  counterRow: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  counterValue: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  counterNumber: { color: colors.textPrimary, fontSize: 22, fontWeight: '800' },
  counterUnit: { color: colors.textSecondary, fontSize: 16, fontWeight: '600' },
  stepper: {
    width: 58,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
  },
  stepperText: { color: colors.textPrimary, fontSize: 22, fontWeight: '700' },
  dim: { opacity: 0.35 },
  dangerZone: { gap: 10, marginTop: 4 },
  save: {
    alignItems: 'center',
    paddingVertical: 17,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  saveText: { color: colors.textTertiary, fontSize: 18, fontWeight: '700' },
});
