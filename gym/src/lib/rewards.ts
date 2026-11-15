import type { Plan } from './types';
import type { Data } from './logic';
import { devicesOf, lastWeightBefore, trainedSessions } from './logic';
import { weekStart } from './format';

/*
 * Rewards werden komplett aus den Gym-Daten abgeleitet – nichts wird
 * gespeichert, nichts verfällt. Neue Challenges: einfach CHALLENGES erweitern.
 */

export const STAGES_PER_CYCLE = 5;

export interface ChallengeCtx {
  data: Data;
  /** Tag, für den ausgewertet wird (YYYY-MM-DD). */
  date: string;
}

export interface ChallengeDef {
  id: string;
  scope: 'day' | 'week';
  /** Blätter bei Abschluss. */
  reward: number;
  title: (ctx: ChallengeCtx) => string;
  progress: (ctx: ChallengeCtx) => { value: number; goal: number };
}

export interface ChallengeState {
  def: ChallengeDef;
  title: string;
  value: number;
  goal: number;
  done: boolean;
}

function entriesOnDate(data: Data, date: string) {
  const ids = new Set(data.sessions.filter((s) => s.date === date).map((s) => s.id));
  return data.entries.filter((e) => ids.has(e.sessionId) && e.weight != null);
}

/** Plan des Tages: heutiges Training, sonst der Tag nach dem letzten (A↔B). */
export function planForDate(data: Data, date: string): Plan {
  const todays = data.sessions.filter((s) => s.date === date);
  const trained = new Set(entriesOnDate(data, date).map((e) => e.sessionId));
  const t = todays.find((s) => trained.has(s.id)) ?? todays[0];
  if (t) return t.plan;
  const prev = trainedSessions(data).filter((s) => s.date < date).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  if (!prev) return 'A';
  return prev.plan === 'A' ? 'B' : 'A';
}

export const CHALLENGES: ChallengeDef[] = [
  {
    id: 'logged',
    scope: 'day',
    reward: 1,
    title: () => 'Training eingetragen',
    progress: ({ data, date }) => ({ value: entriesOnDate(data, date).length > 0 ? 1 : 0, goal: 1 }),
  },
  {
    id: 'step-up',
    scope: 'day',
    reward: 1,
    title: () => 'Bei einem Gerät eine Stufe hoch',
    progress: ({ data, date }) => {
      const up = entriesOnDate(data, date).some((e) => {
        const prev = lastWeightBefore(data, e.deviceId, date);
        return prev?.weight != null && e.weight! > prev.weight;
      });
      return { value: up ? 1 : 0, goal: 1 };
    },
  },
  {
    id: 'all-devices',
    scope: 'day',
    reward: 2,
    title: ({ data, date }) => `Alle Geräte von Tag ${planForDate(data, date)} eingetragen`,
    progress: ({ data, date }) => {
      const plan = planForDate(data, date);
      const devs = devicesOf(data, plan);
      const done = new Set(entriesOnDate(data, date).map((e) => e.deviceId));
      return { value: devs.filter((d) => done.has(d.id)).length, goal: Math.max(devs.length, 1) };
    },
  },
  {
    id: 'three-a-week',
    scope: 'week',
    reward: 3,
    title: () => '3 Trainings diese Woche',
    progress: ({ data, date }) => {
      const ws = weekStart(date);
      const days = new Set(trainedSessions(data).filter((s) => weekStart(s.date) === ws && s.date <= date).map((s) => s.date));
      return { value: Math.min(days.size, 3), goal: 3 };
    },
  },
];

export function evaluate(def: ChallengeDef, ctx: ChallengeCtx): ChallengeState {
  const { value, goal } = def.progress(ctx);
  return { def, title: def.title(ctx), value, goal, done: value >= goal };
}

export function challengesFor(data: Data, date: string, scope: 'day' | 'week'): ChallengeState[] {
  return CHALLENGES.filter((c) => c.scope === scope).map((c) => evaluate(c, { data, date }));
}

/** Gesamte Blätter: jede je erledigte Challenge an jedem Trainingstag/jeder Woche. */
export function totalLeaves(data: Data): number {
  const days = [...new Set(trainedSessions(data).map((s) => s.date))].sort();
  let leaves = 0;
  const weeks = new Map<string, string>(); // weekStart -> letzter Trainingstag
  for (const date of days) {
    for (const c of CHALLENGES.filter((x) => x.scope === 'day')) {
      if (evaluate(c, { data, date }).done) leaves += c.reward;
    }
    weeks.set(weekStart(date), date);
  }
  for (const date of weeks.values()) {
    for (const c of CHALLENGES.filter((x) => x.scope === 'week')) {
      if (evaluate(c, { data, date }).done) leaves += c.reward;
    }
  }
  return leaves;
}

export function plantState(data: Data): { trainings: number; stage: number; garden: number } {
  const n = new Set(trainedSessions(data).map((s) => s.id)).size;
  return { trainings: n, stage: n % STAGES_PER_CYCLE, garden: Math.floor(n / STAGES_PER_CYCLE) };
}
