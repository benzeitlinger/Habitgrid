import { describe, expect, it } from 'vitest';
import { buildSeed } from './seed';
import { devicesOf, type Data } from './logic';
import { repsInNote, suggest, wasClean } from './suggest';

const dev = (d: Data, name: string) => d.devices.find((x) => x.name === name)!;
const add = (d: Data, date: string, deviceName: string, weight: number, note = '') => {
  const id = `s-${date}`;
  if (!d.sessions.some((s) => s.id === id)) d.sessions.push({ id, plan: 'A', date });
  d.entries.push({ id: `e-${date}-${deviceName}`, sessionId: id, deviceId: dev(d, deviceName).id, weight, note });
};

describe('Notizen lesen', () => {
  it('erkennt fehlende Wiederholungen', () => {
    expect(repsInNote('10 Wdh., dann 23 kg nur 9').sort()).toEqual([10, 9].sort());
    expect(wasClean({ note: '2. Satz 9' })).toBe(false);
    expect(wasClean({ note: '1. Satz 8, 2. Satz 7' })).toBe(false);
    expect(wasClean({ note: '' })).toBe(true);
    expect(wasClean({ note: 'sauber' })).toBe(true);
    expect(wasClean({ note: '1. Satz 60, 2. Satz 65' })).toBe(true); // Gewichte, keine Wdh.
    expect(wasClean({ note: 'könnte auch 41' })).toBe(true);
  });
});

describe('Vorschlag', () => {
  it('nächstes Training: die gesetzten Ziele', () => {
    const d = buildSeed();
    const s = (n: string) => suggest(d, dev(d, n), '2026-11-19')!;
    expect(s('Brustpresse')).toMatchObject({ weight: 46, kind: 'target' });
    expect(s('Latzug')).toMatchObject({ weight: 67, kind: 'target' });
    expect(s('Beinpresse')).toMatchObject({ weight: 156, kind: 'target' });
  });

  it('nach Erreichen des Ziels: Stufe hoch bei 2×12, sonst halten', () => {
    const d = buildSeed();
    add(d, '2026-11-19', 'Brustpresse', 46);
    add(d, '2026-11-19', 'Schulterpresse', 25.3, '2. Satz 10');
    add(d, '2026-11-19', 'Latzug', 67);
    add(d, '2026-11-19', 'Beinpresse', 156);
    const s = (n: string) => suggest(d, dev(d, n), '2026-11-23')!;
    expect(s('Brustpresse')).toMatchObject({ weight: 47.1, kind: 'up' });     // 2,5 % = 1,15 → +1,1
    expect(s('Schulterpresse')).toMatchObject({ weight: 25.3, kind: 'hold' });
    expect(s('Latzug')).toMatchObject({ weight: 68.1, kind: 'up' });          // 2,5 % = 1,6 → +1,1
    expect(s('Beinpresse')).toMatchObject({ weight: 159.4, kind: 'up' });     // 2,5 % = 3,9 → +3,4
  });

  it('Tag B ohne Daten: kein Vorschlag', () => {
    const d = buildSeed();
    expect(suggest(d, devicesOf(d, 'B')[0], '2026-11-19')).toBeNull();
  });
});
