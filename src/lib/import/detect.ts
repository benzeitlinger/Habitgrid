import { BACKUP_FORMAT, BackupError, parseBackup } from '@/lib/backup';
import { HabitKitImportError, parseHabitKitExport, type ImportReport } from '@/lib/import/habitkit';
import type { AppData } from '@/store/types';

export type ImportSource = 'own' | 'habitkit';

export type ParsedImport = {
  source: ImportSource;
  data: AppData;
  /** One line about anything the import had to drop or guess. */
  note: string | null;
};

/**
 * One entry point for both file formats, so the user never has to know which
 * kind of file they are holding — the earlier error told them to use a button
 * that did not exist.
 */
export function parseAnyBackup(json: string): ParsedImport {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new BackupError('That is not valid JSON. Make sure the whole file was copied.');
  }

  const obj = raw as Record<string, unknown> | null;

  if (obj && obj.format === BACKUP_FORMAT) {
    return { source: 'own', data: parseBackup(json), note: null };
  }

  if (obj && Array.isArray(obj.habits) && Array.isArray(obj.completions)) {
    const report = parseHabitKitExport(json);
    return { source: 'habitkit', data: report.data, note: noteFor(report) };
  }

  throw new BackupError(
    'That file is neither a backup from this app nor a HabitKit export. ' +
      'A HabitKit export contains "habits" and "completions".'
  );
}

function noteFor(report: ImportReport): string | null {
  const parts: string[] = [];
  if (report.archived > 0) parts.push(`${report.archived} archived`);
  if (report.droppedZeroCompletions > 0) {
    parts.push(`${report.droppedZeroCompletions} empty entries skipped`);
  }
  if (report.unknownIcons.length > 0) {
    parts.push(`unknown icons replaced: ${report.unknownIcons.join(', ')}`);
  }
  if (report.unknownColors.length > 0) {
    parts.push(`unknown colours replaced: ${report.unknownColors.join(', ')}`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

export { HabitKitImportError };
