import { db } from './db';
import type { Device, MaxTest, Plan } from './types';
import { DEFAULT_STEPS } from './types';
import { uid } from './format';

/** Training-Spalte für (Plan, Datum) holen oder anlegen. */
export async function ensureSession(plan: Plan, date: string): Promise<string> {
  const existing = await db.sessions.where('date').equals(date).filter((s) => s.plan === plan).first();
  if (existing) return existing.id;
  const id = uid();
  await db.sessions.add({ id, plan, date });
  return id;
}

export async function saveEntry(p: {
  plan: Plan; date: string; sessionId: string | null; deviceId: string; weight: number | null; note: string;
}): Promise<void> {
  await db.transaction('rw', db.sessions, db.entries, async () => {
    const sessionId = p.sessionId ?? (await ensureSession(p.plan, p.date));
    const existing = await db.entries.where('[sessionId+deviceId]').equals([sessionId, p.deviceId]).first();
    if (p.weight == null && !p.note.trim()) {
      if (existing) await db.entries.delete(existing.id);
      return;
    }
    if (existing) await db.entries.update(existing.id, { weight: p.weight, note: p.note.trim() });
    else await db.entries.add({ id: uid(), sessionId, deviceId: p.deviceId, weight: p.weight, note: p.note.trim() });
  });
}

export async function deleteEntry(sessionId: string, deviceId: string): Promise<void> {
  await db.entries.where('[sessionId+deviceId]').equals([sessionId, deviceId]).delete();
}

export async function deleteSession(sessionId: string): Promise<void> {
  await db.transaction('rw', db.sessions, db.entries, async () => {
    await db.entries.where('sessionId').equals(sessionId).delete();
    await db.sessions.delete(sessionId);
  });
}

export async function changeSessionDate(sessionId: string, date: string): Promise<void> {
  await db.sessions.update(sessionId, { date });
}

export async function addDevice(plan: Plan, name: string): Promise<string> {
  const devs = await db.devices.where('plan').equals(plan).toArray();
  const id = uid();
  await db.devices.add({
    id, plan, name, order: devs.reduce((m, d) => Math.max(m, d.order + 1), 0),
    target: null, targetNote: '', steps: [...DEFAULT_STEPS],
  });
  return id;
}

export async function updateDevice(id: string, patch: Partial<Device>): Promise<void> {
  await db.devices.update(id, patch);
}

export async function deleteDevice(id: string): Promise<void> {
  await db.transaction('rw', db.devices, db.entries, db.maxTests, async () => {
    await db.entries.where('deviceId').equals(id).delete();
    await db.maxTests.where('deviceId').equals(id).delete();
    await db.devices.delete(id);
  });
}

export async function moveDevice(plan: Plan, id: string, dir: -1 | 1): Promise<void> {
  await db.transaction('rw', db.devices, async () => {
    const devs = (await db.devices.where('plan').equals(plan).toArray()).sort((a, b) => a.order - b.order);
    const i = devs.findIndex((d) => d.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= devs.length) return;
    [devs[i], devs[j]] = [devs[j], devs[i]];
    await Promise.all(devs.map((d, k) => db.devices.update(d.id, { order: k })));
  });
}

export async function saveMaxTest(m: Omit<MaxTest, 'id'> & { id?: string }): Promise<void> {
  if (m.id) await db.maxTests.put(m as MaxTest);
  else await db.maxTests.add({ ...m, id: uid() });
}

export async function deleteMaxTest(id: string): Promise<void> {
  await db.maxTests.delete(id);
}
