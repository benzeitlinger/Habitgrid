import { readFileSync, writeFileSync } from 'node:fs';

import { parseHabitKitExport } from '@/lib/import/habitkit';
import {
  completionRate, entriesFor, goodDays, overallCompletionRate, overallGoodDays,
  streaks, totalCompletions,
} from '@/lib/stats';

/** Numbers read off the original app's screenshots, taken 2026-08-22. */
const EXPECTED = {
  overallCompletedDays: 422,
  overallRate: 68,
  journalCompletions: 53,
  journalRate: 30,
  bestStreak: 11,
};

export function run(exportFile: string, outFile?: string) {
  const report = parseHabitKitExport(readFileSync(exportFile, 'utf8'));
  const { data } = report;
  const active = data.habits.filter((h) => !h.archived);
  const Y = 2026;

  const journal = active.find((h) => h.name === '3 min Journal')!;
  const je = entriesFor(data.entries, journal.id);
  const bestStreak = Math.max(
    ...active.map((h) => streaks(h, entriesFor(data.entries, h.id), 1)?.best ?? 0)
  );

  const got = {
    overallCompletedDays: overallGoodDays(active, data.entries, Y),
    overallRate: overallCompletionRate(active, data.entries, Y),
    journalCompletions: totalCompletions(journal, je, Y),
    journalRate: completionRate(journal, je, Y),
    bestStreak,
  };

  console.log('=== Abgleich mit den HabitKit-Screenshots ===');
  let allMatch = true;
  for (const [k, want] of Object.entries(EXPECTED)) {
    const have = got[k as keyof typeof got];
    const ok = have === want;
    if (!ok) allMatch = false;
    console.log(`${ok ? 'OK  ' : 'ABW '} ${k.padEnd(22)} HabitKit ${String(want).padStart(4)}   hier ${String(have).padStart(4)}`);
  }
  console.log(allMatch ? '\nAlle Referenzwerte stimmen überein.' : '\nEs gibt Abweichungen.');

  console.log('\n=== pro Habit (2026) ===');
  console.log('Name'.padEnd(20), 'Compl'.padStart(6), 'Gute Tage'.padStart(10), 'Rate'.padStart(5), 'Cur'.padStart(4), 'Best'.padStart(5));
  console.log('-'.repeat(60));
  for (const h of [...active].sort((a, b) => a.order - b.order)) {
    const e = entriesFor(data.entries, h.id);
    const s = streaks(h, e, 1);
    console.log(
      h.name.padEnd(20),
      String(totalCompletions(h, e, Y)).padStart(6),
      String(goodDays(h, e, Y)).padStart(10),
      String(completionRate(h, e, Y)).padStart(5),
      String(s ? s.current : '—').padStart(4),
      String(s ? s.best : '—').padStart(5)
    );
  }

  if (outFile) {
    writeFileSync(outFile, JSON.stringify(
      { format: 'habitkit-clone', version: 1, exportedAt: new Date().toISOString(), ...data }
    ));
    console.log('\ngeschrieben:', outFile);
  }
  if (!allMatch) process.exitCode = 1;
}
