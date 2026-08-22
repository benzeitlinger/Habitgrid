import React, { useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { ICON_KEYS } from '@/icons';
import { colors, radius, withAlpha } from '@/theme';

type Props = { value: string; color: string; onChange: (key: string) => void };

const ROWS = 3;
const CELL = 44;
const COLUMN_GAP = 6;

/**
 * The original shows the picked icon large over a dimmed fan of the rest.
 * Here it is a large preview over three rows that scroll sideways — same
 * shape on screen, and it keeps a fixed height inside the sheet.
 */
export function IconPicker({ value, color, onChange }: Props) {
  // Column-major so scrolling sideways walks the list in order.
  const columns = useMemo(() => {
    const out: string[][] = [];
    for (let i = 0; i < ICON_KEYS.length; i += ROWS) {
      out.push(ICON_KEYS.slice(i, i + ROWS));
    }
    return out;
  }, []);

  const scroller = useRef<ScrollView>(null);
  const columnIndex = Math.floor(Math.max(0, ICON_KEYS.indexOf(value)) / ROWS);

  return (
    <View style={styles.wrap}>
      <View style={[styles.preview, { backgroundColor: withAlpha(color, 0.16) }]}>
        <Icon name={value} size={40} color={color} />
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.track}
        style={styles.scroller}
        // Start on the chosen icon, so editing a habit does not open on
        // a random slice of the list.
        onLayout={({ nativeEvent }) => {
          const centre =
            columnIndex * (CELL + COLUMN_GAP) - nativeEvent.layout.width / 2 + CELL / 2;
          scroller.current?.scrollTo({ x: Math.max(0, centre), animated: false });
        }}
      >
        {columns.map((column, i) => (
          <View key={i} style={styles.column}>
            {column.map((key) => {
              const active = key === value;
              return (
                <Pressable
                  key={key}
                  onPress={() => onChange(key)}
                  accessibilityRole="button"
                  accessibilityLabel={`Icon ${key}`}
                  accessibilityState={{ selected: active }}
                  style={[styles.cell, active && { backgroundColor: withAlpha(color, 0.18) }]}
                >
                  <Icon name={key} size={22} color={active ? color : colors.textTertiary} />
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // `alignSelf: stretch` on the scroller matters: inside a centred column a
  // ScrollView sizes to its content and overflows instead of scrolling.
  wrap: { alignItems: 'center', gap: 14 },
  scroller: { alignSelf: 'stretch' },
  preview: {
    width: 78,
    height: 78,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: { gap: COLUMN_GAP, paddingHorizontal: 4 },
  column: { gap: COLUMN_GAP },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
