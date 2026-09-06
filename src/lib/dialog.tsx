import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { create } from 'zustand';

import { colors, radius } from '@/theme';

/**
 * Dialogs are drawn by the app, never by the host.
 *
 * `Alert.alert` is an empty function on react-native-web, and an embedded host
 * (the artifact viewer, any sandboxed iframe without `allow-modals`) makes
 * `window.confirm` return false and `window.alert` do nothing — silently, so a
 * confirmation just looks like the user said no. One in-app implementation is
 * the only version that behaves the same everywhere.
 */

type Request = {
  title: string;
  message?: string;
  confirmLabel?: string;
  destructive: boolean;
  resolve: (ok: boolean) => void;
};

type DialogState = { request: Request | null; open: (r: Request) => void; close: () => void };

const useDialogStore = create<DialogState>((set) => ({
  request: null,
  open: (request) => set({ request }),
  close: () => set({ request: null }),
}));

export function notify(title: string, message?: string): Promise<void> {
  return new Promise((resolve) => {
    useDialogStore.getState().open({
      title,
      message,
      destructive: false,
      resolve: () => resolve(),
    });
  });
}

export function confirmDestructive(
  title: string,
  message: string,
  confirmLabel: string
): Promise<boolean> {
  return new Promise((resolve) => {
    useDialogStore.getState().open({ title, message, confirmLabel, destructive: true, resolve });
  });
}

/** Mounted once at the root. */
export function DialogHost() {
  const request = useDialogStore((s) => s.request);
  const close = useDialogStore((s) => s.close);
  if (!request) return null;

  const finish = (ok: boolean) => {
    close();
    request.resolve(ok);
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={() => finish(false)}>
      <Pressable
        style={styles.backdrop}
        accessibilityLabel="Dismiss dialog"
        onPress={() => finish(false)}
      >
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{request.title}</Text>
          {request.message ? <Text style={styles.message}>{request.message}</Text> : null}

          <View style={styles.actions}>
            {request.destructive ? (
              <Pressable
                onPress={() => finish(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                style={styles.button}
              >
                <Text style={styles.cancel}>Cancel</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => finish(true)}
              accessibilityRole="button"
              accessibilityLabel={request.confirmLabel ?? 'OK'}
              style={styles.button}
            >
              <Text style={[styles.confirm, request.destructive && styles.danger]}>
                {request.confirmLabel ?? 'OK'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type PromptRequest = {
  title: string;
  message?: string;
  initialValue: string;
  placeholder?: string;
  confirmLabel?: string;
  resolve: (value: string | null) => void;
};

type PromptState = { request: PromptRequest | null; open: (r: PromptRequest) => void; close: () => void };

const usePromptStore = create<PromptState>((set) => ({
  request: null,
  open: (request) => set({ request }),
  close: () => set({ request: null }),
}));

/** A single-line text prompt, resolving to `null` on cancel. */
export function promptText(
  title: string,
  options?: { message?: string; initialValue?: string; placeholder?: string; confirmLabel?: string }
): Promise<string | null> {
  return new Promise((resolve) => {
    usePromptStore.getState().open({
      title,
      message: options?.message,
      initialValue: options?.initialValue ?? '',
      placeholder: options?.placeholder,
      confirmLabel: options?.confirmLabel,
      resolve,
    });
  });
}

/** Mounted once at the root, alongside `DialogHost`. */
export function PromptHost() {
  const request = usePromptStore((s) => s.request);
  const close = usePromptStore((s) => s.close);
  const [text, setText] = useState('');

  // Re-seed the input every time a *new* request opens, not on every render.
  useEffect(() => {
    if (request) setText(request.initialValue);
  }, [request]);

  if (!request) return null;

  const finish = (value: string | null) => {
    close();
    request.resolve(value);
  };

  const trimmed = text.trim();

  return (
    <Modal transparent animationType="fade" onRequestClose={() => finish(null)}>
      <Pressable style={styles.backdrop} accessibilityLabel="Dismiss dialog" onPress={() => finish(null)}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{request.title}</Text>
          {request.message ? <Text style={styles.message}>{request.message}</Text> : null}

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={request.placeholder}
            placeholderTextColor={colors.textTertiary}
            autoFocus
            selectTextOnFocus
            style={styles.input}
          />

          <View style={styles.actions}>
            <Pressable
              onPress={() => finish(null)}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              style={styles.button}
            >
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
            <Pressable
              disabled={trimmed.length === 0}
              onPress={() => finish(trimmed)}
              accessibilityRole="button"
              accessibilityLabel={request.confirmLabel ?? 'Save'}
              style={styles.button}
            >
              <Text style={[styles.confirm, trimmed.length === 0 && styles.disabled]}>
                {request.confirmLabel ?? 'Save'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: 22,
    gap: 10,
  },
  title: { color: colors.textPrimary, fontSize: 19, fontWeight: '800' },
  message: { color: colors.textSecondary, fontSize: 15, lineHeight: 21 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 4, marginTop: 8 },
  button: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: radius.sm },
  cancel: { color: colors.textSecondary, fontSize: 16, fontWeight: '700' },
  confirm: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
  danger: { color: colors.danger },
  input: {
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 16,
  },
  disabled: { opacity: 0.4 },
});
