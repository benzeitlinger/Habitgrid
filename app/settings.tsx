import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { SettingsGroup, SettingsRow } from '@/components/SettingsRow';
import { Field, Sheet } from '@/components/Sheet';
import { DeclinedError } from '@/lib/artifactHost';
import { backupFilename, BackupError, buildBackup } from '@/lib/backup';
import { HabitKitImportError, parseAnyBackup } from '@/lib/import/detect';
import { pickTextFile, shareTextFile } from '@/lib/dataFile';
import { confirmDestructive, notify, promptText } from '@/lib/dialog';
import { closeSheet } from '@/lib/nav';
import {
  useActiveProfile, useArchivedHabits, useProfiles, useStore, useVisibleHabits,
} from '@/store/habits';
import { colors, HABIT_COLORS, radius, withAlpha } from '@/theme';
import { Segmented } from '@/components/Segmented';
import { ColorGrid } from '@/components/ColorGrid';

type Page = 'root' | 'general' | 'theme' | 'archived' | 'data' | 'reorder' | 'profiles';

function count(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

/** Show the parser's own wording; only fall back for genuinely unexpected errors. */
function messageFor(e: unknown, kind: 'file' | 'text'): string {
  if (e instanceof BackupError || e instanceof HabitKitImportError) return e.message;
  return `That ${kind} could not be read.`;
}

const TINTS = {
  general: '#EC4899',
  theme: '#F59E0B',
  archived: '#22D3EE',
  data: '#6366F1',
  reorder: '#F87171',
  profiles: '#34D399',
};

export default function SettingsScreen() {
  const router = useRouter();
  const [page, setPage] = useState<Page>('root');

  const title =
    page === 'root' ? 'Settings'
    : page === 'general' ? 'General'
    : page === 'theme' ? 'Theme'
    : page === 'archived' ? 'Archived Habits'
    : page === 'data' ? 'Data Import/Export'
    : page === 'profiles' ? 'Profiles'
    : 'Reorder Habits';

  return (
    <Sheet title={title} onClose={() => (page === 'root' ? closeSheet(router) : setPage('root'))}>
      {page === 'root' ? <Root onNavigate={setPage} /> : null}
      {page === 'general' ? <General /> : null}
      {page === 'theme' ? <Theme /> : null}
      {page === 'archived' ? <Archived /> : null}
      {page === 'data' ? <Data /> : null}
      {page === 'reorder' ? <Reorder /> : null}
      {page === 'profiles' ? <Profiles /> : null}
    </Sheet>
  );
}

function Root({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const archived = useArchivedHabits();
  const habits = useVisibleHabits();
  const active = useActiveProfile();

  return (
    <>
      <SettingsGroup title="Profiles">
        <SettingsRow
          icon="ui-person"
          tint={TINTS.profiles}
          label="Profiles"
          detail={active?.name ?? ''}
          onPress={() => onNavigate('profiles')}
          last
        />
      </SettingsGroup>

      <SettingsGroup title="App">
        <SettingsRow icon="ui-general" tint={TINTS.general} label="General" onPress={() => onNavigate('general')} />
        <SettingsRow icon="ui-palette" tint={TINTS.theme} label="Theme" onPress={() => onNavigate('theme')} />
        <SettingsRow
          icon="ui-archive"
          tint={TINTS.archived}
          label="Archived Habits"
          detail={String(archived.length)}
          onPress={() => onNavigate('archived')}
        />
        <SettingsRow icon="ui-import" tint={TINTS.data} label="Data Import/Export" onPress={() => onNavigate('data')} />
        <SettingsRow
          icon="ui-reorder"
          tint={TINTS.reorder}
          label="Reorder Habits"
          detail={String(habits.length)}
          onPress={() => onNavigate('reorder')}
          last
        />
      </SettingsGroup>
    </>
  );
}

function Profiles() {
  const profiles = useProfiles();
  const active = useActiveProfile();
  const addProfile = useStore((s) => s.addProfile);
  const switchProfile = useStore((s) => s.switchProfile);
  const renameProfile = useStore((s) => s.renameProfile);
  const removeProfile = useStore((s) => s.removeProfile);

  const doAdd = async () => {
    const name = await promptText('New profile', {
      placeholder: 'e.g. Partner',
      confirmLabel: 'Create',
    });
    if (!name) return;
    const id = addProfile(name);
    switchProfile(id);
  };

  const doRename = async (id: string, current: string) => {
    const name = await promptText('Rename profile', { initialValue: current, confirmLabel: 'Save' });
    if (!name || name === current) return;
    renameProfile(id, name);
  };

  const doRemove = async (id: string, name: string) => {
    const ok = await confirmDestructive(
      'Delete profile?',
      `"${name}" and all of its habits and history will be permanently removed. This cannot be undone.`,
      'Delete'
    );
    if (ok) removeProfile(id);
  };

  return (
    <View style={{ gap: 14 }}>
      <Text style={styles.body}>
        Profiles are separate, local data sets on this device — not accounts. There is no login and
        nothing syncs between them.
      </Text>

      <View style={{ gap: 10 }}>
        {profiles.map((p) => {
          const isActive = p.id === active?.id;
          return (
            // A plain View, not a Pressable: the "switch" tap-area and the
            // rename/delete buttons below are siblings, not nested buttons —
            // a <button> inside a <button> is invalid HTML on web and makes
            // taps on the inner ones unreliable.
            <View key={p.id} style={[styles.habitRow, isActive && { borderColor: p.color }]}>
              <Pressable
                onPress={() => switchProfile(p.id)}
                accessibilityRole="button"
                accessibilityLabel={`Switch to ${p.name}`}
                style={styles.profileTapArea}
              >
                <View style={[styles.habitIcon, { backgroundColor: withAlpha(p.color, 0.16) }]}>
                  <Icon name="ui-person" size={20} color={p.color} />
                </View>
                <Text style={styles.habitName} numberOfLines={1}>{p.name}</Text>
                {isActive ? <Icon name="ui-check" size={18} color={p.color} /> : null}
              </Pressable>
              <Pressable
                onPress={() => doRename(p.id, p.name)}
                accessibilityRole="button"
                accessibilityLabel={`Rename ${p.name}`}
                hitSlop={8}
              >
                <Icon name="ui-edit" size={20} color={colors.textPrimary} />
              </Pressable>
              {profiles.length > 1 ? (
                <Pressable
                  onPress={() => doRemove(p.id, p.name)}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${p.name}`}
                  hitSlop={8}
                >
                  <Icon name="ui-trash" size={20} color={colors.danger} />
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>

      <Pressable
        onPress={doAdd}
        accessibilityRole="button"
        accessibilityLabel="New profile"
        style={styles.bigButton}
      >
        <Icon name="ui-plus" size={22} color={colors.textPrimary} />
        <Text style={styles.bigButtonText}>New Profile</Text>
      </Pressable>
    </View>
  );
}

function General() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);

  return (
    <>
      <Field label="First day of week">
        <Segmented
          value={String(settings.firstDayOfWeek)}
          onChange={(v) => update({ firstDayOfWeek: v === '1' ? 1 : 0 })}
          accent={settings.accent}
          options={[
            { value: '1', label: 'Monday' },
            { value: '0', label: 'Sunday' },
          ]}
        />
      </Field>

      <Field label="Days shown on the checklist">
        <Segmented
          value={String(settings.defaultRangeDays)}
          onChange={(v) => update({ defaultRangeDays: Number(v) as 1 | 3 | 5 | 7 })}
          accent={settings.accent}
          options={[
            { value: '1', label: '1' },
            { value: '3', label: '3' },
            { value: '5', label: '5' },
            { value: '7', label: '7' },
          ]}
        />
      </Field>
    </>
  );
}

function Theme() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);

  return (
    <Field label="Accent colour">
      <ColorGrid value={settings.accent} onChange={(accent) => update({ accent })} />
      <View style={styles.preview}>
        <Text style={styles.previewWordmark}>
          Habit<Text style={{ color: settings.accent }}>Grid</Text>
        </Text>
      </View>
      <Pressable
        onPress={() => update({ accent: HABIT_COLORS[13] })}
        accessibilityRole="button"
        accessibilityLabel="Reset accent colour"
        style={styles.secondaryButton}
      >
        <Text style={styles.secondaryText}>Reset to default</Text>
      </Pressable>
    </Field>
  );
}

function Archived() {
  const archived = useArchivedHabits();
  const setArchived = useStore((s) => s.setArchived);
  const removeHabit = useStore((s) => s.removeHabit);

  if (archived.length === 0) {
    return <Text style={styles.empty}>No archived habits.</Text>;
  }

  return (
    <View style={{ gap: 10 }}>
      {archived.map((h) => (
        <View key={h.id} style={styles.habitRow}>
          <View style={[styles.habitIcon, { backgroundColor: withAlpha(h.color, 0.16) }]}>
            <Icon name={h.iconName} size={20} color={h.color} />
          </View>
          <Text style={styles.habitName} numberOfLines={1}>{h.name}</Text>
          <Pressable
            onPress={() => setArchived(h.id, false)}
            accessibilityRole="button"
            accessibilityLabel={`Restore ${h.name}`}
            hitSlop={8}
          >
            <Icon name="ui-restore" size={22} color={colors.textPrimary} />
          </Pressable>
          <Pressable
            onPress={async () => {
              const ok = await confirmDestructive(
                'Delete habit?',
                `"${h.name}" and all its history will be removed.`,
                'Delete'
              );
              if (ok) removeHabit(h.id);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${h.name}`}
            hitSlop={8}
          >
            <Icon name="ui-trash" size={22} color={colors.danger} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function Data() {
  const exportData = useStore((s) => s.exportData);
  const replaceAll = useStore((s) => s.replaceAll);
  const habits = useStore((s) => s.habits);
  const [busy, setBusy] = useState(false);
  const [pasted, setPasted] = useState('');

  /** Shared tail of both import routes: detect the format, confirm, replace. */
  const applyBackup = async (text: string) => {
    const { source, data, note } = parseAnyBackup(text);
    const from = source === 'habitkit' ? 'This HabitKit export' : 'This backup';
    const days = Object.values(data.entries).reduce((n, e) => n + Object.keys(e).length, 0);

    const ok = await confirmDestructive(
      'Replace everything?',
      `${from} has ${count(data.habits.length, 'habit')} and ${count(days, 'logged day')}. ` +
        `Importing removes the ${count(habits.length, 'habit')} currently in the app.`,
      'Import'
    );
    if (!ok) return false;

    replaceAll(data);
    await notify(
      'Imported',
      `${count(data.habits.length, 'habit')} and ${count(days, 'logged day')} restored.` +
        (note ? `\n\n${note}` : '')
    );
    return true;
  };

  const doExport = async () => {
    setBusy(true);
    try {
      await shareTextFile(backupFilename(), JSON.stringify(buildBackup(exportData()), null, 2));
    } catch (e) {
      // Cancelling the save prompt is a normal outcome, not a failure.
      if (!(e instanceof DeclinedError)) {
        notify('Export failed', e instanceof Error ? e.message : 'Unknown error.');
      }
    } finally {
      setBusy(false);
    }
  };

  const doImport = async () => {
    try {
      // The picker promise never settles if the sheet is dismissed without a
      // cancel event, so `busy` is only raised once a file is actually back —
      // otherwise the button would stay disabled for good.
      const text = await pickTextFile();
      if (text === null) return;
      setBusy(true);
      await applyBackup(text);
    } catch (e) {
      notify('Import failed', messageFor(e, 'file'));
    } finally {
      setBusy(false);
    }
  };

  const doPasteImport = async () => {
    setBusy(true);
    try {
      if (await applyBackup(pasted)) setPasted('');
    } catch (e) {
      notify('Import failed', messageFor(e, 'text'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: 14 }}>
      <Text style={styles.body}>
        Your habits live only on this device. Export regularly — a backup file is the only way to
        get them back. Import takes a backup from this app or a HabitKit export; it works out
        which is which.
      </Text>

      <Pressable
        onPress={doExport}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Export data"
        style={[styles.bigButton, busy && styles.dim]}
      >
        <Icon name="ui-export" size={22} color={colors.textPrimary} />
        <Text style={styles.bigButtonText}>Export</Text>
      </Pressable>

      <Pressable
        onPress={doImport}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Import data"
        style={[styles.bigButton, busy && styles.dim]}
      >
        <Icon name="ui-import" size={22} color={colors.textPrimary} />
        <Text style={styles.bigButtonText}>Import from file</Text>
      </Pressable>

      <View style={styles.rule} />

      <Text style={styles.body}>
        No file picker here? Open the backup in any text editor, copy everything, and paste it
        below.
      </Text>

      <TextInput
        value={pasted}
        onChangeText={setPasted}
        placeholder='{"format":"habitkit-clone", ...}'
        placeholderTextColor={colors.textTertiary}
        accessibilityLabel="Backup text"
        multiline
        numberOfLines={5}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.textArea}
      />

      <Pressable
        onPress={doPasteImport}
        disabled={busy || pasted.trim().length === 0}
        accessibilityRole="button"
        accessibilityLabel="Import pasted text"
        style={[styles.bigButton, (busy || pasted.trim().length === 0) && styles.dim]}
      >
        <Icon name="ui-import" size={22} color={colors.textPrimary} />
        <Text style={styles.bigButtonText}>Import pasted text</Text>
      </Pressable>
    </View>
  );
}

function Reorder() {
  const habits = useVisibleHabits();
  const reorder = useStore((s) => s.reorderHabits);

  const move = (index: number, delta: number) => {
    const next = [...habits];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    reorder(next.map((h) => h.id));
  };

  if (habits.length === 0) return <Text style={styles.empty}>No habits yet.</Text>;

  return (
    <View style={{ gap: 10 }}>
      {habits.map((h, i) => (
        <View key={h.id} style={styles.habitRow}>
          <View style={[styles.habitIcon, { backgroundColor: withAlpha(h.color, 0.16) }]}>
            <Icon name={h.iconName} size={20} color={h.color} />
          </View>
          <Text style={styles.habitName} numberOfLines={1}>{h.name}</Text>
          <Pressable
            onPress={() => move(i, -1)}
            disabled={i === 0}
            accessibilityRole="button"
            accessibilityLabel={`Move ${h.name} up`}
            hitSlop={8}
            style={i === 0 && styles.dim}
          >
            <Icon name="ui-up" size={24} color={colors.textPrimary} />
          </Pressable>
          <Pressable
            onPress={() => move(i, 1)}
            disabled={i === habits.length - 1}
            accessibilityRole="button"
            accessibilityLabel={`Move ${h.name} down`}
            hitSlop={8}
            style={i === habits.length - 1 && styles.dim}
          >
            <Icon name="ui-down" size={24} color={colors.textPrimary} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { color: colors.textSecondary, fontSize: 15, lineHeight: 21 },
  empty: { color: colors.textSecondary, fontSize: 15, textAlign: 'center', paddingVertical: 24 },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  habitIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  habitName: { flex: 1, color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  profileTapArea: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  bigButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 17,
  },
  bigButtonText: { color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
  rule: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  textArea: {
    minHeight: 110,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    color: colors.textPrimary,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  secondaryButton: { alignItems: 'center', paddingVertical: 14 },
  secondaryText: { color: colors.textSecondary, fontSize: 15, fontWeight: '600' },
  preview: {
    alignItems: 'center',
    paddingVertical: 18,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewWordmark: { color: colors.textPrimary, fontSize: 26, fontWeight: '800' },
  dim: { opacity: 0.3 },
});
