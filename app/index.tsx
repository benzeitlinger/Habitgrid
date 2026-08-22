import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryChips } from '@/components/CategoryChips';
import { ChecklistRow } from '@/components/ChecklistRow';
import { ScreenHeader, Wordmark } from '@/components/ScreenHeader';
import { dayOfMonth, lastNDays, WEEKDAY_LABELS, weekday, type DateKey } from '@/lib/date';
import { entriesFor } from '@/lib/stats';
import { useCategories, useStore, useVisibleHabits } from '@/store/habits';
import type { Habit } from '@/store/types';
import { colors, radius } from '@/theme';

const RANGES = [1, 3, 5, 7] as const;
type Range = (typeof RANGES)[number];

const SCREEN_PADDING = 16;
const GAP = 8;
const ICON_SIZE = 52;
/** The habit name must stay readable, so it gets its width first. */
const MIN_PILL = 110;

export type RowLayout = { cell: number; cellGap: number; showIcon: boolean };

/**
 * Seven columns plus an icon tile plus a readable name do not fit a phone,
 * so the wider ranges drop the separate icon tile — the name pill already
 * carries the habit colour.
 */
const LAYOUTS: Record<Range, RowLayout> = {
  1: { cell: 52, cellGap: GAP, showIcon: true },
  3: { cell: 44, cellGap: GAP, showIcon: true },
  5: { cell: 34, cellGap: 6, showIcon: false },
  7: { cell: 28, cellGap: 5, showIcon: false },
};

/** Shrinks the cells further if the real screen is narrower than an iPhone 14. */
export function layoutFor(range: Range, windowWidth: number): RowLayout {
  const base = LAYOUTS[range];
  const inner = windowWidth - SCREEN_PADDING * 2;
  const fixed =
    (base.showIcon ? ICON_SIZE + GAP : 0) + GAP + (range - 1) * base.cellGap + MIN_PILL;
  const maxCell = Math.floor((inner - fixed) / range);
  return { ...base, cell: Math.max(18, Math.min(base.cell, maxCell)) };
}

export default function ChecklistScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const habits = useVisibleHabits();
  const categories = useCategories();
  const entries = useStore((s) => s.entries);
  const settings = useStore((s) => s.settings);
  const bump = useStore((s) => s.bump);
  const setCount = useStore((s) => s.setCount);

  const [range, setRange] = useState<Range>(settings.defaultRangeDays);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [customTarget, setCustomTarget] = useState<{ habit: Habit; date: DateKey } | null>(null);

  const { width } = useWindowDimensions();
  const days = useMemo(() => lastNDays(range), [range]);
  const layout = useMemo(() => layoutFor(range, width), [range, width]);

  const visible = useMemo(
    () =>
      selectedCategories.length === 0
        ? habits
        : habits.filter((h) => h.categoryIds.some((c) => selectedCategories.includes(c))),
    [habits, selectedCategories]
  );

  // Functional update, so two quick taps advance two steps rather than one.
  const cycleRange = () =>
    setRange((prev) => RANGES[(RANGES.indexOf(prev) + 1) % RANGES.length]);

  const onToggleDay = (habit: Habit, date: DateKey) => {
    if (habit.trackingType === 'custom') {
      setCustomTarget({ habit, date });
      return;
    }
    bump(habit.id, date, 1);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScreenHeader
        left={{ icon: 'ui-settings', onPress: () => router.push('/settings'), accessibilityLabel: 'Settings' }}
        title={<Wordmark accent={settings.accent} />}
        right={[
          { icon: 'ui-chart', onPress: () => router.push('/stats'), accessibilityLabel: 'Statistics' },
          { icon: 'ui-plus', onPress: () => router.push('/habit/new'), accessibilityLabel: 'New habit' },
        ]}
      />

      <CategoryChips
        categories={categories}
        selected={selectedCategories}
        accent={settings.accent}
        onToggle={(id) =>
          setSelectedCategories((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
          )
        }
      />

      <View style={styles.rangeRow}>
        <Pressable
          onPress={cycleRange}
          accessibilityRole="button"
          accessibilityLabel={`Showing ${rangeLabel(range)}. Tap to change.`}
          style={styles.rangeChip}
        >
          <Text numberOfLines={1} style={styles.rangeLabel}>
            {rangeLabel(range)}
          </Text>
        </Pressable>

        <View style={[styles.dayHeads, { gap: layout.cellGap }]}>
          {days.map((d) => (
            <View key={d} style={{ width: layout.cell, alignItems: 'center' }}>
              <Text style={styles.dayName}>{WEEKDAY_LABELS[weekday(d)]}</Text>
              <Text style={styles.dayNum}>{dayOfMonth(d)}</Text>
            </View>
          ))}
        </View>
      </View>

      {visible.length === 0 ? (
        <EmptyState hasHabits={habits.length > 0} onAdd={() => router.push('/habit/new')} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          {visible.map((habit) => (
            <ChecklistRow
              key={habit.id}
              habit={habit}
              entries={entriesFor(entries, habit.id)}
              days={days}
              layout={layout}
              onToggleDay={(date) => onToggleDay(habit, date)}
              onResetDay={(date) => setCount(habit.id, date, 0)}
              onOpenStats={() => router.push({ pathname: '/stats', params: { habit: habit.id } })}
              onEdit={() => router.push(`/habit/${habit.id}`)}
            />
          ))}
        </ScrollView>
      )}

      {customTarget ? (
        <CustomValuePrompt
          habit={customTarget.habit}
          current={entries[customTarget.habit.id]?.[customTarget.date] ?? 0}
          onCancel={() => setCustomTarget(null)}
          onSubmit={(value) => {
            setCount(customTarget.habit.id, customTarget.date, value);
            setCustomTarget(null);
          }}
        />
      ) : null}
    </View>
  );
}

function rangeLabel(range: Range): string {
  return range === 1 ? 'Today' : `Last ${range} days`;
}

function EmptyState({ hasHabits, onAdd }: { hasHabits: boolean; onAdd: () => void }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>
        {hasHabits ? 'Nothing in this category' : 'No habits yet'}
      </Text>
      <Text style={styles.emptyBody}>
        {hasHabits
          ? 'Clear the category filter to see everything.'
          : 'Add your first habit to start tracking.'}
      </Text>
      {hasHabits ? null : (
        <Pressable onPress={onAdd} style={styles.emptyButton}>
          <Text style={styles.emptyButtonText}>New Habit</Text>
        </Pressable>
      )}
    </View>
  );
}

function CustomValuePrompt({
  habit, current, onCancel, onSubmit,
}: {
  habit: Habit;
  current: number;
  onCancel: () => void;
  onSubmit: (value: number) => void;
}) {
  const [text, setText] = useState(String(current));
  const parsed = Number.parseInt(text, 10);
  const valid = Number.isFinite(parsed) && parsed >= 0;

  return (
    <Modal transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.dialog} onPress={() => {}}>
          <Text style={styles.dialogTitle}>{habit.name}</Text>
          <Text style={styles.dialogBody}>
            {habit.polarity === 'quit' ? 'How many today?' : 'How many completions?'}
          </Text>
          <TextInput
            value={text}
            onChangeText={setText}
            keyboardType="number-pad"
            autoFocus
            selectTextOnFocus
            style={styles.dialogInput}
          />
          <View style={styles.dialogActions}>
            <Pressable onPress={onCancel} style={styles.dialogButton}>
              <Text style={styles.dialogCancel}>Cancel</Text>
            </Pressable>
            <Pressable
              disabled={!valid}
              onPress={() => onSubmit(parsed)}
              style={[styles.dialogButton, !valid && styles.disabled]}
            >
              <Text style={[styles.dialogSave, { color: habit.color }]}>Save</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 8,
  },
  rangeChip: {
    flexShrink: 1,
    minWidth: 0,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rangeLabel: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  dayHeads: { flexDirection: 'row', flexShrink: 0 },
  dayName: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  dayNum: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 32 },
  emptyTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '700' },
  emptyBody: { color: colors.textSecondary, fontSize: 15, textAlign: 'center' },
  emptyButton: {
    marginTop: 12,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  emptyButtonText: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  dialog: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.xl,
    padding: 22,
    gap: 10,
  },
  dialogTitle: { color: colors.textPrimary, fontSize: 19, fontWeight: '700' },
  dialogBody: { color: colors.textSecondary, fontSize: 14 },
  dialogInput: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: 14,
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6, marginTop: 4 },
  dialogButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.sm },
  dialogCancel: { color: colors.textSecondary, fontSize: 16, fontWeight: '600' },
  dialogSave: { fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.4 },
});
