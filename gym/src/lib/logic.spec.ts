import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { buildSeed } from './seed';
import { columnsFor, devicesOf, entryMap, lastWeightBefore, markdownForClaude, type Data } from './logic';
import { challengesFor, plantState, totalLeaves } from './rewards';
import { GymDB, exportBackup, importBackup, parseBackup } from './db';
import { shortDate, parseKg, fmtKg, addKg } from './format';

const seed = (): Data => buildSeed();

describe('Startdaten', () => {
  it('Tag A stimmt mit der Notes-Tabelle überein', () => {
    const d = seed();
    const devs = devicesOf(d, 'A');
    expect(devs.map((x) => x.name)).toEqual(['Brustpresse', 'Schulterpresse', 'Latzug', 'Beinbeuger', 'Beinpresse', 'Ruderzug']);
    const cols = columnsFor(d, 'A', '2026-11-15');
    expect(cols.map((c) => shortDate(c.date))).toEqual([
      'So 15.11.', 'Fr 13.11.', 'Fr 6.11.', 'Do 5.11.', 'Mo 2.11.', 'Fr 30.10.', 'Mi 28.10.', 'Mo 26.10.', 'Mi 21.10.',
    ]);
    expect(cols[0].session).toBeNull(); // Heute-Spalte virtuell
    const em = entryMap(d.entries);
    const at = (dev: string, date: string) => {
      const s = d.sessions.find((x) => x.date === date)!;
      const id = devs.find((x) => x.name === dev)!.id;
      return em.get(`${s.id}|${id}`)!;
    };
    expect(at('Latzug', '2026-11-05')).toMatchObject({ weight: 65, note: '1. Satz 60, 2. Satz 65' });
    expect(at('Schulterpresse', '2026-10-21')).toMatchObject({ weight: 26, note: '10 Wdh., dann 23 kg nur 9' });
    expect(at('Brustpresse', '2026-11-13')).toMatchObject({ weight: 43.2, note: '' });
    expect(d.entries).toHaveLength(48);
    expect(devs.find((x) => x.name === 'Latzug')).toMatchObject({ target: 67, targetNote: 'bis 70' });
    expect(devicesOf(d, 'B').map((x) => x.name)).toEqual(['Beinstrecker', 'Butterfly', 'Reverse Butterfly', 'Rückenstrecker', 'Adduktoren', 'Bauchmaschine']);
    expect(d.maxTests).toHaveLength(3);
  });

  it('Platzhalter = letztes Gewicht', () => {
    const d = seed();
    const bp = devicesOf(d, 'A').find((x) => x.name === 'Beinpresse')!;
    expect(lastWeightBefore(d, bp.id, '2026-11-15')?.weight).toBe(150);
    expect(lastWeightBefore(d, bp.id, '2026-11-05')?.weight).toBe(128);
  });
});

describe('Format', () => {
  it('Dezimalkomma', () => {
    expect(parseKg('43,2')).toBe(43.2);
    expect(fmtKg(25.3)).toBe('25,3');
    expect(addKg(43.2, 1.1)).toBe(44.3);
    expect(parseKg('')).toBeNull();
  });
});

describe('Für Claude kopieren', () => {
  it('letzte 3 Spalten als Markdown', () => {
    const md = markdownForClaude(seed(), 'A');
    expect(md).toContain('| Gerät | Fr 13.11. | Fr 6.11. | Do 5.11. |');
    expect(md).toContain('| Ruderzug | 53 | 53 (2. Satz 9) | 53 |');
  });
});

describe('Rewards', () => {
  it('Pflanze wächst mit jedem Training', () => {
    expect(plantState(seed())).toEqual({ trainings: 8, stage: 3, garden: 1 });
  });

  it('Daily Challenges zählen korrekt', () => {
    const d = seed();
    const fri = challengesFor(d, '2026-11-13', 'day');
    expect(fri.map((c) => [c.def.id, c.value, c.goal])).toEqual([
      ['logged', 1, 1], ['step-up', 0, 1], ['all-devices', 6, 6],
    ]);
    expect(fri[2].title).toBe('Alle Geräte von Tag A eingetragen');
    const thu = challengesFor(d, '2026-11-05', 'day');
    expect(thu[1].done).toBe(true); // Steigerung am 5.11.
    const today = challengesFor(d, '2026-11-15', 'day');
    expect(today[0].value).toBe(0);
    expect(today[2].title).toBe('Alle Geräte von Tag B eingetragen');
    // Woche 2.–8.11.: Mo, Do, Fr
    expect(challengesFor(d, '2026-11-08', 'week')[0]).toMatchObject({ value: 3, done: true });
    expect(totalLeaves(d)).toBeGreaterThan(0);
  });
});

describe('Backup', () => {
  it('Export → leere DB → Import stellt alles wieder her', async () => {
    const a = new GymDB('t1');
    await a.open();
    const b1 = await exportBackup(a);
    expect(b1.entries).toHaveLength(48);
    const text = JSON.stringify(b1);
    await a.delete();

    const b = new GymDB('t2');
    await b.open();
    await b.entries.clear();
    await importBackup(parseBackup(text), b);
    const b2 = await exportBackup(b);
    const strip = (x: typeof b1) => ({ ...x, exportedAt: '' });
    const sort = <T extends { id: string }>(xs: T[]) => [...xs].sort((p, q) => p.id.localeCompare(q.id));
    expect(sort(b2.entries)).toEqual(sort(b1.entries));
    expect(sort(b2.devices)).toEqual(sort(b1.devices));
    expect(sort(b2.maxTests)).toEqual(sort(b1.maxTests));
    expect(strip(b2).sessions.length).toBe(8);
    await b.delete();
  });

  it('lehnt fremde Dateien ab', () => {
    expect(() => parseBackup('{"habits":[]}')).toThrow();
    expect(() => parseBackup('kaputt')).toThrow();
  });
});
