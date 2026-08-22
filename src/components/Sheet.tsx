import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { colors, radius } from '@/theme';

type Props = {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

/** Full-screen modal shell with a centred title and a close button, as in the original. */
export function Sheet({ title, onClose, children, footer }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={styles.close}
        >
          <Icon name="ui-close" size={28} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.close} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: footer ? 24 : insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>

      {footer ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>{footer}</View>
      ) : null}
    </View>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

export function Hint({ children }: { children: React.ReactNode }) {
  return <Text style={styles.hint}>{children}</Text>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  close: { width: 40 },
  title: { flex: 1, textAlign: 'center', color: colors.textPrimary, fontSize: 22, fontWeight: '800' },
  body: { paddingHorizontal: 20, gap: 20 },
  field: { gap: 10 },
  fieldLabel: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  hint: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
});

export const sheetStyles = styles;
