import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { colors, radius } from '@/theme';

type Props = {
  icon: string;
  tint: string;
  label: string;
  detail?: string;
  onPress: () => void;
  last?: boolean;
};

/** One row of a settings group: coloured icon tile, label, chevron. */
export function SettingsRow({ icon, tint, label, detail, onPress, last }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, !last && styles.divider, pressed && styles.pressed]}
    >
      <View style={[styles.tile, { backgroundColor: tint }]}>
        <Icon name={icon} size={19} color="#fff" />
      </View>
      <Text style={styles.label}>{label}</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      <Icon name="ui-forward" size={18} color={colors.textTertiary} />
    </Pressable>
  );
}

export function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  groupTitle: { color: colors.textSecondary, fontSize: 14, fontWeight: '700', paddingLeft: 4 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  pressed: { backgroundColor: colors.surfaceAlt },
  tile: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, color: colors.textPrimary, fontSize: 17, fontWeight: '600' },
  detail: { color: colors.textSecondary, fontSize: 15, fontWeight: '600' },
});
