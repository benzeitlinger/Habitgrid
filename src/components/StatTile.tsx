import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { colors, radius, withAlpha } from '@/theme';

type Props = { icon: string; value: string | number; label: string; color: string };

export function StatTile({ icon, value, label, color }: Props) {
  return (
    <View style={styles.tile}>
      <View style={[styles.badge, { backgroundColor: withAlpha(color, 0.18) }]}>
        <Icon name={icon} size={22} color={color} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 4,
  },
  badge: {
    alignSelf: 'flex-end',
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  value: { color: colors.textPrimary, fontSize: 38, fontWeight: '800' },
  label: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
});
