export type Theme = 'system' | 'light' | 'dark';
const KEY = 'gym-theme';

export function getTheme(): Theme {
  try { return (localStorage.getItem(KEY) as Theme) || 'system'; } catch { return 'system'; }
}

export function applyTheme(t: Theme = getTheme()): void {
  const root = document.documentElement;
  if (t === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', t);
  const dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1E1E20' : '#F2F1EE');
}

export function setTheme(t: Theme): void {
  try { localStorage.setItem(KEY, t); } catch { /* egal */ }
  applyTheme(t);
}
