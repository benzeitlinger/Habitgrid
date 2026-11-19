import Dexie, { type EntityTable } from 'dexie';
import type { Backup, Device, Entry, MaxTest, Session } from './types';
import { buildSeed, TARGETS_SET_AT } from './seed';

export class GymDB extends Dexie {
  devices!: EntityTable<Device, 'id'>;
  sessions!: EntityTable<Session, 'id'>;
  entries!: EntityTable<Entry, 'id'>;
  maxTests!: EntityTable<MaxTest, 'id'>;

  constructor(name = 'gym') {
    super(name);
    this.version(1).stores({
      devices: 'id, plan, order',
      sessions: 'id, plan, date',
      entries: 'id, sessionId, deviceId, &[sessionId+deviceId]',
      maxTests: 'id, deviceId, date',
    });
    // v2: Ziele bekommen ein Datum (für automatische Vorschläge).
    this.version(2).stores({}).upgrade((tx) =>
      tx.table('devices').toCollection().modify((d: Device) => {
        if (d.target != null && !d.targetSetAt) d.targetSetAt = TARGETS_SET_AT;
      }),
    );
    // Erststart: Startdaten aus der Notes-Tabelle einspielen.
    this.on('populate', (tx) => {
      const s = buildSeed();
      tx.table('devices').bulkAdd(s.devices);
      tx.table('sessions').bulkAdd(s.sessions);
      tx.table('entries').bulkAdd(s.entries);
      tx.table('maxTests').bulkAdd(s.maxTests);
    });
  }
}

export const db = new GymDB();

export async function exportBackup(d: GymDB = db): Promise<Backup> {
  const [devices, sessions, entries, maxTests] = await Promise.all([
    d.devices.toArray(), d.sessions.toArray(), d.entries.toArray(), d.maxTests.toArray(),
  ]);
  return { app: 'gym', version: 1, exportedAt: new Date().toISOString(), devices, sessions, entries, maxTests };
}

/** Streng prüfen – lieber abbrechen als halb importieren. */
export function parseBackup(text: string): Backup {
  let o: unknown;
  try { o = JSON.parse(text); } catch { throw new Error('Datei ist kein gültiges JSON.'); }
  const b = o as Partial<Backup>;
  if (!b || b.app !== 'gym' || b.version !== 1) throw new Error('Das ist kein Gym-Backup.');
  for (const k of ['devices', 'sessions', 'entries', 'maxTests'] as const) {
    if (!Array.isArray(b[k])) throw new Error(`Backup unvollständig („${k}" fehlt).`);
  }
  const ids = new Set<string>();
  for (const dv of b.devices!) {
    if (typeof dv.id !== 'string' || typeof dv.name !== 'string' || (dv.plan !== 'A' && dv.plan !== 'B'))
      throw new Error('Backup enthält ein ungültiges Gerät.');
    if (!Array.isArray(dv.steps)) dv.steps = [];
    ids.add(dv.id);
  }
  const sids = new Set<string>();
  for (const s of b.sessions!) {
    if (typeof s.id !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s.date)) throw new Error('Backup enthält ein ungültiges Training.');
    sids.add(s.id);
  }
  for (const e of b.entries!) {
    if (!sids.has(e.sessionId) || !ids.has(e.deviceId)) throw new Error('Backup enthält Einträge ohne Gerät/Training.');
    if (e.weight !== null && typeof e.weight !== 'number') throw new Error('Backup enthält ein ungültiges Gewicht.');
    e.note = e.note ?? '';
  }
  for (const m of b.maxTests!) {
    if (!ids.has(m.deviceId) || typeof m.max !== 'number') throw new Error('Backup enthält einen ungültigen Maximalkraft-Eintrag.');
    m.note = m.note ?? '';
  }
  return b as Backup;
}

/** Ersetzt alles. */
export async function importBackup(b: Backup, d: GymDB = db): Promise<void> {
  await d.transaction('rw', [d.devices, d.sessions, d.entries, d.maxTests], async () => {
    await Promise.all([d.devices.clear(), d.sessions.clear(), d.entries.clear(), d.maxTests.clear()]);
    await d.devices.bulkAdd(b.devices);
    await d.sessions.bulkAdd(b.sessions);
    await d.entries.bulkAdd(b.entries);
    await d.maxTests.bulkAdd(b.maxTests);
  });
}
