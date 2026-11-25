import type { Device, Entry } from './types';
import type { Data } from './logic';
import { lastWeightBefore } from './logic';
import { addKg, fmtKg } from './format';

/*
 * Regelwerk für den Gewichtsvorschlag (doppelte Progression, wie Ben bisher trainiert):
 *
 * 1. Ziel gesetzt und seitdem noch nicht trainiert → das Ziel.
 *    (Ein manuell/mit Claude gesetztes Ziel gewinnt immer.)
 * 2. Letztes Mal alle Wiederholungen geschafft (keine Notiz, „sauber", „2×12")
 *    → eine Stufe hoch: die Zusatzgewicht-Stufe, die am nächsten an 2,5 %
 *    des Gewichts liegt (46 → +1,1 · 65 → +1,1 · 156 → +3,4).
 * 3. Letztes Mal Wiederholungen gefehlt (z. B. „2. Satz 9") → gleiches Gewicht,
 *    bis 2×12 klappt.
 * Nie automatisch weniger – runter geht nur, wenn Ben es selbst einträgt.
 */

export const INCREASE_PCT = 0.025;
const REPS_GOAL = 12;

export type SuggestKind = 'target' | 'up' | 'hold';

export interface Suggestion {
  weight: number;
  kind: SuggestKind;
  /** Kurze Begründung für die Anzeige. */
  reason: string;
  /** Gewicht vom letzten Mal. */
  last: number;
}

/** Wiederholungszahlen aus einer Notiz („2. Satz 9", „nur 10", „10 Wdh."). Zahlen > 15 sind Gewichte. */
export function repsInNote(note: string): number[] {
  const reps: number[] = [];
  const re = /(?:satz|nur|dann|nochmal)\s*(\d+)|(\d+)\s*(?:wdh|wiederh)/gi;
  for (const m of note.matchAll(re)) {
    const n = Number(m[1] ?? m[2]);
    if (n > 0 && n <= 15) reps.push(n);
  }
  return reps;
}

/** Hat Ben laut Eintrag alle Sätze mit 12 Wiederholungen geschafft? */
export function wasClean(e: Pick<Entry, 'note'>): boolean {
  const note = e.note.trim();
  if (!note || /sauber|2\s*[×x]\s*12/i.test(note)) return true;
  return !repsInNote(note).some((r) => r < REPS_GOAL);
}

export function increaseStep(device: Device, weight: number): number {
  const want = weight * INCREASE_PCT;
  const pos = device.steps.filter((s) => s > 0).sort((a, b) => a - b);
  if (pos.length === 0) return Math.max(1, Math.round(want)); // Gerät ohne Hebel
  // Stufe, die am nächsten an 2,5 % liegt (bei Gleichstand die kleinere).
  return pos.reduce((best, s) => (Math.abs(s - want) < Math.abs(best - want) - 1e-9 ? s : best), pos[0]);
}

/** Ist das Ziel noch offen (seit dem Setzen kein Training dieses Geräts)? */
export function targetActive(data: Data, device: Device, date: string): boolean {
  if (device.target == null) return false;
  const since = device.targetSetAt ?? '';
  const sessionDate = new Map(data.sessions.map((s) => [s.id, s.date]));
  return !data.entries.some((e) => {
    if (e.deviceId !== device.id || e.weight == null) return false;
    const d = sessionDate.get(e.sessionId);
    return !!d && d > since && d < date;
  });
}

export function suggest(data: Data, device: Device, date: string): Suggestion | null {
  const lastEntry = lastWeightBefore(data, device.id, date);
  if (!lastEntry || lastEntry.weight == null) {
    if (device.target != null) return { weight: device.target, kind: 'target', reason: 'Ziel', last: device.target };
    return null;
  }
  const last = lastEntry.weight;
  if (targetActive(data, device, date) && device.target! >= last) {
    const note = device.targetNote ? ` (${device.targetNote})` : '';
    return { weight: device.target!, kind: 'target', reason: `dein Ziel${note}`, last };
  }
  if (wasClean(lastEntry)) {
    const step = increaseStep(device, last);
    return { weight: addKg(last, step), kind: 'up', reason: `2×12 geschafft → +${fmtKg(step)}`, last };
  }
  return { weight: last, kind: 'hold', reason: 'letztes Mal nicht ganz 2×12 → gleich bleiben', last };
}
