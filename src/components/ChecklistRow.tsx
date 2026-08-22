import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import type { DateKey } from '@/lib/date';
import { fillRatio, type HabitEntries } from '@/lib/stats';
import type { Habit } from '@/store/types';
import { colors, fillFor, radius, withAlpha } from '@/theme';

type Props = {
  habit: Habit;
  entries: HabitEntries;
  days: DateKey[];
  layout: { cell: number; cellGap: number; showIcon: boolean };
  onToggleDay: (date: DateKey) => void;
  onResetDay: (date: DateKey) => void;
  onOpenStats: () => void;
  onEdit: () => void;
};

function tap() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
}

function reset() {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  }
}

export function ChecklistRow({
  habit, entries, days, layout, onToggleDay, onResetDay, onOpenStats, onEdit,
}: Props) {
  const tint = withAlpha(habit.color, 0.14);

  return (
    <View style={styles.row}>
      {layout.showIcon ? (
        <Pressable
          onPress={onEdit}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${habit.name}`}
          style={[styles.iconTile, { backgroundColor: tint }]}
        >
          <Icon name={habit.iconName} size={24} color={habit.color} />
        </Pressable>
      ) : null}

      <Pressable
        onPress={onOpenStats}
        onLongPress={onEdit}
        accessibilityRole="button"
        accessibilityLabel={`${habit.name} statistics`}
        style={[styles.pill, { backgroundColor: tint }]}
      >
        {layout.showIcon ? null : (
          <Icon name={habit.iconName} size={20} color={habit.color} />
        )}
        <Text numberOfLines={1} style={styles.name}>
          {habit.name}
        </Text>
      </Pressable>

      {days.map((date, i) => {
        const ratio = fillRatio(habit, entries, date);
        const count = entries[date] ?? 0;
        return (
          <Pressable
            key={date}
            onPress={() => {
              tap();
              onToggleDay(date);
            }}
            onLongPress={() => {
              reset();
              onResetDay(date);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${habit.name} on ${date}, ${count} logged`}
            style={({ pressed }) => [
              styles.cell,
              {
                width: layout.cell,
                height: layout.cell,
                marginLeft: i === 0 ? 0 : layout.cellGap - GAP,
                backgroundColor: fillFor(habit.color, ratio),
              },
              pressed && styles.pressed,
            ]}
          />
        );
      })}
    </View>
  );
}

const GAP = 8;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: GAP, paddingVertical: 5 },
  iconTile: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flex: 1,
    minWidth: 0,
    height: 52,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  name: { flexShrink: 1, color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
  cell: { borderRadius: 8 },
  pressed: { opacity: 0.6 },
});
