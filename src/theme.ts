/** Design tokens derived from the HabitKit screenshots in ../emulate_thsi_app/. */

export const colors = {
  bg: '#000000',
  surface: '#0E0E0F',
  surfaceAlt: '#1C1C1E',
  surfaceHigh: '#2C2C2E',
  border: 'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.14)',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E8E93',
  textTertiary: '#5A5A5F',
  accent: '#A855F7',
  danger: '#FB7185',
} as const;

export const radius = { sm: 10, md: 14, lg: 18, xl: 22, pill: 999 } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const font = {
  title: { fontSize: 26, fontWeight: '800' },
  heading: { fontSize: 20, fontWeight: '700' },
  body: { fontSize: 16, fontWeight: '600' },
  label: { fontSize: 14, fontWeight: '600' },
  caption: { fontSize: 12, fontWeight: '600' },
  stat: { fontSize: 40, fontWeight: '800' },
} as const;

/** The 21 habit colours from the New Habit screen (3 rows x 7). */
export const HABIT_COLORS = [
  '#F87171', '#FB923C', '#FBBF24', '#FACC15', '#A3E635', '#34D399', '#2DD4A7',
  '#2DD4BF', '#22D3EE', '#38BDF8', '#3B82F6', '#6366F1', '#A78BFA', '#C084FC',
  '#E879F9', '#F472B6', '#FB7185', '#94A3B8', '#9CA3AF', '#A8A29E', '#8B8378',
] as const;

/** Alpha applied to a habit colour for an empty / unfilled cell. */
export const EMPTY_ALPHA = 0.12;

/** `#RRGGBB` + alpha -> `rgba(...)`. */
export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Fill colour for one heatmap / checklist cell.
 * `ratio` 0 -> barely tinted, 1 -> the full habit colour.
 */
export function fillFor(color: string, ratio: number): string {
  const clamped = Math.max(0, Math.min(1, ratio));
  return withAlpha(color, EMPTY_ALPHA + clamped * (1 - EMPTY_ALPHA));
}
