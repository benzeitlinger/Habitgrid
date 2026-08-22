import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AreaChart } from '@/components/AreaChart';
import { Icon } from '@/components/Icon';
import { StatTile } from '@/components/StatTile';
import { YearHeatmap } from '@/components/YearHeatmap';
import { todayKey, year as yearOf, type DateKey } from '@/lib/date';
import { closeSheet } from '@/lib/nav';
import {
  completionRate, completionsPerMonth, entriesFor, fillRatio, goodDays,
  overallCompletionRate, overallCompletionsPerMonth, overallFillRatio,
  overallGoodDays, streaks, totalCompletions,
} from '@/lib/stats';
import { useStore, useVisibleHabits } from '@/store/habits';
import { colors, radius, withAlpha } from '@/theme';

export default function StatsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const habits = useVisibleHabits();
  const entries = useStore((s) => s.entries);
  const settings = useStore((s) => s.settings);

  const params = useLocalSearchParams<{ habit?: string }>();
  const [selectedId, setSelectedId] = useState<string | null>(params.habit ?? null);
  const [year, setYear] = useState(yearOf(todayKey()));

  const habit = habits.find((h) => h.id === selectedId) ?? null;
  const color = habit?.color ?? settings.accent;
  const isQuit = habit?.polarity === 'quit';

  const habitEntries = useMemo(
    () => (habit ? entriesFor(entries, habit.id) : {}),
    [entries, habit]
  );

  const ratioFor = useMemo(
    () =>
      habit
        ? (date: DateKey) => fillRatio(habit, habitEntries, date)
        : (date: DateKey) => overallFillRatio(habits, entries, date),
    [habit, habitEntries, habits, entries]
  );

  const monthly = useMemo(
    () =>
      habit
        ? completionsPerMonth(habit, habitEntries, year)
        : overallCompletionsPerMonth(habits, entries, year),
    [habit, habitEntries, habits, entries, year]
  );

  const days = habit ? goodDays(habit, habitEntries, year) : overallGoodDays(habits, entries, year);
  const rate = habit
    ? completionRate(habit, habitEntries, year)
    : overallCompletionRate(habits, entries, year);
  const completions = habit ? totalCompletions(habit, habitEntries, year) : null;
  const streak = habit ? streaks(habit, habitEntries, settings.firstDayOfWeek) : null;

  const chartWidth = width - 32 - 36; // screen padding + card padding

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.pickerRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerTrack}>
          {habits.map((h) => {
            const active = h.id === selectedId;
            return (
              <Pressable
                key={h.id}
                onPress={() => setSelectedId(active ? null : h.id)}
                accessibilityRole="button"
                accessibilityLabel={`Stats for ${h.name}`}
                accessibilityState={{ selected: active }}
                style={[
                  styles.pickerDot,
                  { borderColor: active ? h.color : colors.borderStrong },
                  active && { backgroundColor: h.color },
                ]}
              >
                <Icon name={h.iconName} size={20} color={active ? '#000' : colors.textSecondary} />
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          onPress={() => closeSheet(router)}
          accessibilityRole="button"
          accessibilityLabel="Done"
          style={[styles.done, { backgroundColor: color }]}
        >
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {habit ? (
          <View style={styles.habitHeader}>
            <View style={[styles.habitIcon, { backgroundColor: withAlpha(habit.color, 0.16) }]}>
              <Icon name={habit.iconName} size={26} color={habit.color} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.habitName} numberOfLines={1}>{habit.name}</Text>
              {habit.description ? (
                <Text style={styles.habitDesc} numberOfLines={1}>{habit.description}</Text>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.yearNav}>
          <Pressable
            onPress={() => setYear((y) => y - 1)}
            accessibilityRole="button"
            accessibilityLabel="Previous year"
            hitSlop={12}
          >
            <Icon name="ui-back" size={26} color={colors.textSecondary} />
          </Pressable>
          <Text style={styles.yearText}>{year}</Text>
          <Pressable
            onPress={() => setYear((y) => y + 1)}
            accessibilityRole="button"
            accessibilityLabel="Next year"
            hitSlop={12}
          >
            <Icon name="ui-forward" size={26} color={colors.textSecondary} />
          </Pressable>
        </View>

        <YearHeatmap
          year={year}
          color={color}
          ratioFor={ratioFor}
          firstDayOfWeek={settings.firstDayOfWeek}
        />

        <View style={styles.row}>
          <StatTile
            icon="ui-hash"
            color={color}
            value={habit ? completions! : days}
            label={habit ? (isQuit ? 'Slips' : 'Completions') : 'Completed Days'}
          />
          <StatTile icon="ui-percent" color={color} value={rate} label="Completion Rate" />
        </View>

        {isQuit ? (
          <View style={styles.row}>
            <StatTile icon="ui-check" color={color} value={days} label="Clean Days" />
          </View>
        ) : null}

        <View style={styles.chartCard}>
          <View style={styles.chartHead}>
            <Text style={styles.chartTitle}>{isQuit ? 'Slips / Month' : 'Completions / Month'}</Text>
            <View style={[styles.badge, { backgroundColor: withAlpha(color, 0.18) }]}>
              <Icon name="ui-trend" size={22} color={color} />
            </View>
          </View>
          <AreaChart values={monthly} color={color} width={chartWidth} />
        </View>

        {habit && !streak ? (
          <View style={styles.warning}>
            <View style={[styles.badge, { backgroundColor: withAlpha(color, 0.18) }]}>
              <Icon name="ui-warning" size={22} color={color} />
            </View>
            <Text style={styles.warningText}>
              You need to set a streak goal for this habit to see streak data. You can do this when
              editing the habit.
            </Text>
          </View>
        ) : null}

        {streak ? (
          <View style={styles.row}>
            <StatTile icon="ui-flame" color={color} value={streak.current} label="Current Streak" />
            <StatTile icon="ui-flame" color={color} value={streak.best} label="Best Streak" />
          </View>
        ) : null}

        {habit ? null : (
          <Text style={styles.hint}>
            Pick a habit above to see its own numbers.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  pickerTrack: { gap: 8, paddingVertical: 4 },
  pickerDot: {
    width: 46,
    height: 46,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  done: { paddingHorizontal: 22, paddingVertical: 13, borderRadius: radius.md },
  doneText: { color: '#000', fontSize: 17, fontWeight: '800' },
  body: { padding: 16, gap: 14 },
  habitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  habitIcon: { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  habitName: { color: colors.textPrimary, fontSize: 19, fontWeight: '800' },
  habitDesc: { color: colors.textSecondary, fontSize: 14, fontWeight: '600', marginTop: 2 },
  yearNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  yearText: { color: colors.textPrimary, fontSize: 22, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 14 },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  chartHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  chartTitle: { color: colors.textPrimary, fontSize: 22, fontWeight: '800' },
  badge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  warning: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 4 },
  warningText: { flex: 1, color: colors.textPrimary, fontSize: 15, fontWeight: '600', lineHeight: 21 },
  hint: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', paddingTop: 4 },
});
