/**
 * Generates a demo dataset matching Ben's real habit list, for local
 * verification only. Written to scripts/seed.json and pasted into
 * localStorage on web.
 */
import { writeFileSync } from 'node:fs';

const TODAY = new Date();
const pad = (n) => String(n).padStart(2, '0');
const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const shift = (days) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + days);
  return key(d);
};

const categories = [
  { id: 'c1', name: 'Study', iconName: 'school', order: 0 },
  { id: 'c2', name: 'Good to have', iconName: 'pray', order: 1 },
  { id: 'c3', name: 'Morning', iconName: 'sunrise', order: 2 },
];

const defs = [
  ['No Reel Morning', 'Du hast am Morgen im Bett keinen Reel geschaut', 'pulse', '#FB923C', 'build', ['c3']],
  ['Liegestühle', 'Jeden Morgen nachdem du geduscht hast', 'pulse', '#FB923C', 'build', ['c3']],
  ['5 min aufräumen', 'Jeden Morgen gehört zur Morgenroutine', 'alarm', '#FB923C', 'build', ['c3']],
  ['3 min Journal', '1 Ziel, 1 Sache für die du dankbar bist, 1 Gedanke', 'pen', '#FB923C', 'build', ['c3']],
  ['Wiegen', '', 'scale', '#FB7185', 'build', ['c2']],
  ['60 min Uni', '', 'aperture', '#3B82F6', 'build', ['c1']],
  ['Draußen Zeit', '', 'sun', '#E879F9', 'build', ['c2']],
  ['Lesen', '', 'book', '#FB7185', 'build', ['c2']],
  ['Meditieren', '', 'eye', '#FACC15', 'build', ['c2']],
  ['Filme', '', 'film', '#94A3B8', 'build', ['c2']],
  ['Alkohol trinken', '', 'wine', '#FB7185', 'quit', ['c2']],
  ['Smoken', '', 'cannabis', '#A3E635', 'quit', ['c2']],
];

const habits = defs.map(([name, description, iconName, color, polarity, categoryIds], i) => ({
  id: `h${i + 1}`,
  name,
  description,
  iconName,
  color,
  categoryIds,
  polarity,
  streakGoal: polarity === 'build' && i % 3 === 0 ? { count: 4, period: 'week' } : null,
  trackingType: 'step',
  completionsPerDay: polarity === 'quit' ? 0 : 1,
  archived: false,
  order: i,
  createdAt: shift(-200),
  reminder: null,
}));

// Deterministic pseudo-random history so screenshots stay comparable.
let seed = 42;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

const entries = {};
for (const h of habits) {
  const days = {};
  const hitRate = h.polarity === 'quit' ? 0.12 : 0.45 + rnd() * 0.3;
  for (let i = 200; i >= 0; i--) {
    if (rnd() < hitRate) days[shift(-i)] = 1;
  }
  entries[h.id] = days;
}

const data = {
  state: {
    habits,
    categories,
    entries,
    settings: { firstDayOfWeek: 1, defaultRangeDays: 3, accent: '#A855F7' },
  },
  version: 0,
};

writeFileSync(new URL('./seed.json', import.meta.url), JSON.stringify(data));
console.log(`seeded ${habits.length} habits, ${Object.values(entries).reduce((a, e) => a + Object.keys(e).length, 0)} entries`);
