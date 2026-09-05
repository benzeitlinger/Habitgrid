import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { colors, radius } from '@/theme';

type Action = { icon: string; onPress: () => void; accessibilityLabel: string };

type Props = {
  left?: Action;
  right?: Action[];
  title?: React.ReactNode;
};

export function ScreenHeader({ left, right = [], title }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.side}>
        {left ? <HeaderButton {...left} /> : null}
      </View>
      <View style={styles.center}>{title}</View>
      <View style={[styles.side, styles.sideRight]}>
        {right.map((a) => (
          <HeaderButton key={a.accessibilityLabel} {...a} />
        ))}
      </View>
    </View>
  );
}

function HeaderButton({ icon, onPress, accessibilityLabel }: Action) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={10}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Icon name={icon} size={24} color={colors.textPrimary} />
    </Pressable>
  );
}

/** The wordmark: white "Habit" + accent "Grid". */
export function Wordmark({ accent = colors.accent }: { accent?: string }) {
  return (
    <Text style={styles.wordmark}>
      Habit<Text style={{ color: accent }}>Grid</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 48,
  },
  side: { flexDirection: 'row', alignItems: 'center', gap: 14, minWidth: 72 },
  sideRight: { justifyContent: 'flex-end' },
  center: { flex: 1, alignItems: 'center' },
  button: { borderRadius: radius.pill, padding: 2 },
  pressed: { opacity: 0.5 },
  wordmark: { color: colors.textPrimary, fontSize: 24, fontWeight: '800' },
});
