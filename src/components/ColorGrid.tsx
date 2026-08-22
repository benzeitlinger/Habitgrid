import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { HABIT_COLORS } from '@/theme';

type Props = { value: string; onChange: (color: string) => void };

/** The 21 swatches in 3 rows of 7; the active one gets the inner dot. */
export function ColorGrid({ value, onChange }: Props) {
  return (
    <View style={styles.grid}>
      {HABIT_COLORS.map((c) => (
        <Pressable
          key={c}
          onPress={() => onChange(c)}
          accessibilityRole="button"
          accessibilityLabel={`Colour ${c}`}
          accessibilityState={{ selected: c === value }}
          style={[styles.swatch, { backgroundColor: c }]}
        >
          {c === value ? <View style={styles.dot} /> : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 15, height: 15, borderRadius: 5, backgroundColor: '#000' },
});
