export type Plan = 'A' | 'B';

export interface Device {
  id: string;
  plan: Plan;
  name: string;
  order: number;
  /** Ziel-Gewicht fürs nächste Training (optional). */
  target?: number | null;
  targetNote?: string;
  /** Wann das Ziel gesetzt wurde (YYYY-MM-DD). Gilt bis zum nächsten Training danach. */
  targetSetAt?: string;
  /** Zusatzgewicht-Stufen (Matrix-Hebel), z. B. [0, 1.1, 2.3, 3.4, 4.5]. */
  steps: number[];
}

export interface Session {
  id: string;
  plan: Plan;
  /** ISO-Datum YYYY-MM-DD (lokal). */
  date: string;
}

export interface Entry {
  id: string;
  sessionId: string;
  deviceId: string;
  weight: number | null;
  note: string;
}

export interface MaxTest {
  id: string;
  deviceId: string;
  date: string;
  max: number;
  suggested?: number | null;
  note: string;
}

export interface Backup {
  app: 'gym';
  version: 1;
  exportedAt: string;
  devices: Device[];
  sessions: Session[];
  entries: Entry[];
  maxTests: MaxTest[];
}

export const DEFAULT_STEPS = [0, 1.1, 2.3, 3.4, 4.5];
