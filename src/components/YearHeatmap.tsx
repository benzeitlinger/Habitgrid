import React, { useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  addDays, MONTH_LABELS, month, toKey, todayKey, WEEKDAY_LABELS, weekday,
  type DateKey,
} from '@/lib/date';
import { colors, fillFor } from '@/theme';

const CELL = 13;
const GAP = 3;
const COL = CELL + GAP;
const LABEL_W = 22;

type Props = {
  year: number;
  color: string;
  /** 0..1 per day; 0 draws the faint empty cell. */
  ratioFor: (date: DateKey) => number;
  firstDayOfWeek?: number;
};

/**
 * A GitHub-style year grid: 7 rows of weekdays, one column per week.
 * Scrolls sideways and opens at the current week.
 */
export function YearHeatmap({ year, color, ratioFor, firstDayOfWeek = 1 }: Props) {
  const scroller = useRef<ScrollView>(null);

  const { weeks, monthTicks } = useMemo(() => {
    const first = new Date(year, 0, 1);
    // Back up to the start of the week containing Jan 1.
    const lead = (weekday(toKey(first)) - firstDayOfWeek + 7) % 7;
    let cursor = addDays(toKey(first), -lead);

    const cols: (DateKey | null)[][] = [];
    const ticks: { label: string; column: number }[] = [];
    let lastMonth = -1;

    while (Number(cursor.slice(0, 4)) <= year) {
      const column: (DateKey | null)[] = [];
      for (let row = 0; row < 7; row++) {
        const key = addDays(cursor, row);
        column.push(Number(key.slice(0, 4)) === year ? key : null);
      }
      const firstReal = column.find(Boolean);
      if (firstReal) {
        const m = month(firstReal);
        if (m !== lastMonth) {
          ticks.push({ label: MONTH_LABELS[m], column: cols.length });
          lastMonth = m;
        }
      }
      cols.push(column);
      cursor = addDays(cursor, 7);
      if (cols.length > 54) break;
    }
    return { weeks: cols, monthTicks: ticks };
  }, [year, firstDayOfWeek]);

  const today = todayKey();
  const currentColumn = weeks.findIndex((w) => w.some((d) => d === today));

  return (
    <View style={styles.card}>
      {/* The weekday column sits outside the scroller so it stays readable
          however far the grid is scrolled. */}
      <View style={styles.weekdayColumn}>
        {WEEKDAY_LABELS.map((_, row) => {
          const day = (firstDayOfWeek + row) % 7;
          // Match the original: label every other row only.
          return (
            <Text key={row} style={styles.weekdayLabel}>
              {row % 2 === 1 ? WEEKDAY_LABELS[day] : ''}
            </Text>
          );
        })}
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroller}
        contentContainerStyle={styles.track}
        onLayout={({ nativeEvent }) => {
          if (currentColumn < 0) return;
          const x = (currentColumn + 1) * COL - nativeEvent.layout.width;
          scroller.current?.scrollTo({ x: Math.max(0, x), animated: false });
        }}
      >
        <View>
          <View style={styles.monthRow}>
            {monthTicks.map((t) => (
              <Text
                key={`${t.label}-${t.column}`}
                style={[styles.monthLabel, { left: t.column * COL }]}
              >
                {t.label}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {weeks.map((column, i) => (
              <View key={i} style={styles.column}>
                {column.map((date, row) => (
                  <View
                    key={row}
                    style={[
                      styles.cell,
                      date
                        ? { backgroundColor: fillFor(color, ratioFor(date)) }
                        : styles.blank,
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
  },
  scroller: { flex: 1 },
  track: { paddingRight: 14 },
  monthRow: { height: 16, flexDirection: 'row' },
  monthLabel: {
    position: 'absolute',
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  weekdayColumn: { width: LABEL_W, gap: GAP, paddingLeft: 6, marginTop: 16 },
  weekdayLabel: {
    height: CELL,
    lineHeight: CELL,
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '600',
  },
  grid: { flexDirection: 'row', gap: GAP },
  column: { gap: GAP },
  cell: { width: CELL, height: CELL, borderRadius: 3.5 },
  blank: { backgroundColor: 'transparent' },
});
