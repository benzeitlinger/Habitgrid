import type { Backup, Device, Entry, MaxTest, Plan, Session } from './types';
import { DEFAULT_STEPS } from './types';

/**
 * Startdaten aus Bens Notes-Tabelle (Stand 15.11.2026).
 * Bei zwei Gewichten in einer Zelle steht das höhere als Gewicht, der Rest als Notiz.
 * Ohne Notiz = 2×12 geschafft.
 */
type Cell = number | [number, string];

const A_DATES = [
  '2026-10-21', '2026-10-26', '2026-10-28', '2026-10-30',
  '2026-11-02', '2026-11-05', '2026-11-06', '2026-11-13',
];

const A_ROWS: { name: string; cells: Cell[]; target?: number | null; targetNote?: string }[] = [
  {
    name: 'Brustpresse', target: 46,
    cells: [36, 39, [42, '2. Satz nur 10'], [42, '1. Satz 8, 2. Satz 7'], 41, 43.2, 43.2, 43.2],
  },
  {
    name: 'Schulterpresse', target: 25.3,
    cells: [
      [26, '10 Wdh., dann 23 kg nur 9'], [23, '10, dann 6, absetzen, nochmal 3'], [23, '2×12'],
      [25.3, '2. Satz 9'], [25.3, '2. Satz 10'], [25.3, '2. Satz 9'], [25.3, '2. Satz 11'], 25.3,
    ],
  },
  {
    name: 'Latzug', target: 67, targetNote: 'bis 70',
    cells: [[36, 'könnte auch 41'], 41, 43.2, 46, 50, [65, '1. Satz 60, 2. Satz 65'], 65, 65],
  },
  {
    name: 'Beinbeuger', target: 56,
    cells: [[40, 'bei 50 kg nur 9'], 45, 47.2, 51, [51, 'sauber'], 54, 54, 54],
  },
  {
    name: 'Beinpresse', target: 156,
    cells: [113, 117, 120, 124, 128, [150, '1. Satz 140, 2. Satz 150'], 150, 150],
  },
  {
    name: 'Ruderzug', target: 53,
    cells: [44, 47, 49, [51, '2. Satz 10'], 51, 53, [53, '2. Satz 9'], 53],
  },
];

const B_ROWS = ['Beinstrecker', 'Butterfly', 'Reverse Butterfly', 'Rückenstrecker', 'Adduktoren', 'Bauchmaschine'];

const MAX: { device: string; date: string; max: number; suggested: number | null; note: string }[] = [
  { device: 'Beinpresse', date: '2026-11-05', max: 238, suggested: 156, note: 'zweiter Messwert 232' },
  { device: 'Latzug', date: '2026-11-05', max: 116, suggested: 71, note: '' },
  { device: 'Ruderzug', date: '2026-11-06', max: 78, suggested: null, note: 'vor den Sätzen gemessen' },
];

/** Ziele wurden nach dem Training am 13.11. festgelegt. */
export const TARGETS_SET_AT = '2026-11-13';

export function buildSeed(): Backup {
  const devices: Device[] = [];
  const sessions: Session[] = [];
  const entries: Entry[] = [];
  const maxTests: MaxTest[] = [];

  const mkDevice = (plan: Plan, name: string, order: number, target: number | null = null, targetNote = ''): Device => ({
    id: `seed-${plan}-${order}`,
    plan, name, order, target, targetNote, steps: [...DEFAULT_STEPS],
    ...(target != null ? { targetSetAt: TARGETS_SET_AT } : {}),
  });

  A_ROWS.forEach((r, i) => devices.push(mkDevice('A', r.name, i, r.target, r.targetNote ?? '')));
  B_ROWS.forEach((n, i) => devices.push(mkDevice('B', n, i)));

  A_DATES.forEach((date) => sessions.push({ id: `seed-s-${date}`, plan: 'A', date }));

  A_ROWS.forEach((r, ri) => {
    r.cells.forEach((c, ci) => {
      const [weight, note] = typeof c === 'number' ? [c, ''] : c;
      entries.push({
        id: `seed-e-${ri}-${ci}`,
        sessionId: sessions[ci].id,
        deviceId: devices[ri].id,
        weight, note,
      });
    });
  });

  MAX.forEach((m, i) => {
    const dev = devices.find((d) => d.name === m.device)!;
    maxTests.push({ id: `seed-m-${i}`, deviceId: dev.id, date: m.date, max: m.max, suggested: m.suggested, note: m.note });
  });

  return { app: 'gym', version: 1, exportedAt: new Date().toISOString(), devices, sessions, entries, maxTests };
}
