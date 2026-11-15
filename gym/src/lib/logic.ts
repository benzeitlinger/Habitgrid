import type { Device, Entry, MaxTest, Plan, Session } from './types';
import { fmtKg, shortDate } from './format';

export interface Data {
  devices: Device[];
  sessions: Session[];
  entries: Entry[];
  maxTests: MaxTest[];
}

export interface Column {
  /** null = virtuelle Heute-Spalte, wird beim ersten Eintrag gespeichert. */
  session: Session | null;
  date: string;
  isToday: boolean;
}

export function devicesOf(data: Data, plan: Plan): Device[] {
  return data.devices.filter((d) => d.plan === plan).sort((a, b) => a.order - b.order);
}

/** Heute | letztes Training | vorletztes | … */
export function columnsFor(data: Data, plan: Plan, today: string): Column[] {
  const ss = data.sessions
    .filter((s) => s.plan === plan)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const cols: Column[] = ss.map((s) => ({ session: s, date: s.date, isToday: s.date === today }));
  if (!cols.some((c) => c.isToday)) cols.unshift({ session: null, date: today, isToday: true });
  return cols;
}

export function entryMap(entries: Entry[]): Map<string, Entry> {
  const m = new Map<string, Entry>();
  for (const e of entries) m.set(`${e.sessionId}|${e.deviceId}`, e);
  return m;
}

/** Letztes eingetragenes Gewicht eines Geräts vor einem Datum. */
export function lastWeightBefore(data: Data, deviceId: string, date: string): Entry | null {
  const sessionDate = new Map(data.sessions.map((s) => [s.id, s.date]));
  let best: Entry | null = null;
  let bestDate = '';
  for (const e of data.entries) {
    if (e.deviceId !== deviceId || e.weight == null) continue;
    const d = sessionDate.get(e.sessionId);
    if (!d || d >= date) continue;
    if (d > bestDate) { best = e; bestDate = d; }
  }
  return best;
}

/** Verlauf eines Geräts, älteste zuerst. */
export function historyOf(data: Data, deviceId: string): { date: string; weight: number; note: string }[] {
  const sessionDate = new Map(data.sessions.map((s) => [s.id, s.date]));
  return data.entries
    .filter((e) => e.deviceId === deviceId && e.weight != null && sessionDate.has(e.sessionId))
    .map((e) => ({ date: sessionDate.get(e.sessionId)!, weight: e.weight!, note: e.note }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function latestMax(data: Data, deviceId: string): MaxTest | null {
  const ms = data.maxTests.filter((m) => m.deviceId === deviceId).sort((a, b) => (a.date < b.date ? 1 : -1));
  return ms[0] ?? null;
}

/** Sessions mit mindestens einem Gewicht = „echte" Trainings. */
export function trainedSessions(data: Data): Session[] {
  const has = new Set(data.entries.filter((e) => e.weight != null).map((e) => e.sessionId));
  return data.sessions.filter((s) => has.has(s.id));
}

/** Letzte 3 Trainings als Markdown-Tabelle für Claude. */
export function markdownForClaude(data: Data, plan: Plan): string {
  const devs = devicesOf(data, plan);
  const trained = new Set(trainedSessions(data).map((s) => s.id));
  const cols = data.sessions
    .filter((s) => s.plan === plan && trained.has(s.id))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 3);
  const em = entryMap(data.entries);
  const cell = (s: Session, d: Device) => {
    const e = em.get(`${s.id}|${d.id}`);
    if (!e || e.weight == null) return '–';
    return e.note ? `${fmtKg(e.weight)} (${e.note.replace(/\|/g, '/')})` : fmtKg(e.weight);
  };
  const lines = [
    `Gym Tag ${plan} – letzte ${cols.length} Trainings (Gewicht in kg, neueste links; ohne Notiz = 2×12 geschafft)`,
    '',
    `| Gerät | ${cols.map((c) => shortDate(c.date)).join(' | ')} |`,
    `|---|${cols.map(() => '---').join('|')}|`,
    ...devs.map((d) => `| ${d.name} | ${cols.map((c) => cell(c, d)).join(' | ')} |`),
  ];
  return lines.join('\n');
}
