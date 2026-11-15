const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

export function todayISO(now = new Date()): string {
  return toISO(now);
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** „Fr 13.11." */
export function shortDate(iso: string): string {
  const d = parseISO(iso);
  return `${WD[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}.`;
}

/** „Fr 13.11.2026" */
export function longDate(iso: string): string {
  return `${shortDate(iso)}${parseISO(iso).getFullYear()}`;
}

/** 43.2 → „43,2", 150 → „150" */
export function fmtKg(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '';
  const r = Math.round(n * 100) / 100;
  return String(r).replace('.', ',');
}

/** Differenz mit Vorzeichen: „+2,3", „−1" */
export function fmtDiff(n: number): string {
  const s = fmtKg(Math.abs(n));
  return (n > 0 ? '+' : '−') + s;
}

/** „43,2" / „43.2" → 43.2; leer/ungültig → null */
export function parseKg(s: string): number | null {
  const t = s.trim().replace(/\s/g, '').replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

export function addKg(a: number, b: number): number {
  return Math.round((a + b) * 100) / 100;
}

/** Montag der Woche (ISO-Datum). */
export function weekStart(iso: string): string {
  const d = parseISO(iso);
  const dow = (d.getDay() + 6) % 7; // Mo = 0
  d.setDate(d.getDate() - dow);
  return toISO(d);
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
