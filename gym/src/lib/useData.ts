import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import type { Data } from './logic';

export function useData(): Data | undefined {
  return useLiveQuery(async () => {
    const [devices, sessions, entries, maxTests] = await Promise.all([
      db.devices.toArray(), db.sessions.toArray(), db.entries.toArray(), db.maxTests.toArray(),
    ]);
    return { devices, sessions, entries, maxTests };
  }, []);
}
