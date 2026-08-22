import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { Icon } from '@/components/Icon';
import { colors, radius, withAlpha } from '@/theme';
import type { Category } from '@/store/types';

type Props = {
  categories: Category[];
  selected: string[];
  onToggle: (id: string) => void;
  accent: string;
};

export function CategoryChips({ categories, selected, onToggle, accent }: Props) {
  if (categories.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {categories.map((c) => {
        const active = selected.includes(c.id);
        return (
          <Pressable
            key={c.id}
            onPress={() => onToggle(c.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[
              styles.chip,
              active && { backgroundColor: withAlpha(accent, 0.18), borderColor: accent },
            ]}
          >
            <Icon
              name={c.iconName}
              size={16}
              color={active ? accent : colors.textPrimary}
            />
            <Text style={[styles.label, active && { color: accent }]}>{c.name}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 16, gap: 10, paddingVertical: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
});
