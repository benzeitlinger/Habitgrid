import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Tastaturhöhe als CSS-Variable --kb, damit Sheets über der iOS-Tastatur bleiben. */
export function useKeyboardInset(): boolean {
  const [kb, setKb] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const upd = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty('--kb', `${inset}px`);
      setKb(inset > 80);
    };
    vv.addEventListener('resize', upd);
    vv.addEventListener('scroll', upd);
    upd();
    return () => { vv.removeEventListener('resize', upd); vv.removeEventListener('scroll', upd); };
  }, []);
  return kb;
}

export function Sheet(props: { open: boolean; onClose: () => void; children: ReactNode; kb?: boolean }) {
  return (
    <>
      <div className={`backdrop ${props.open ? 'open' : ''}`} onClick={props.onClose} />
      <div className={`sheet ${props.open ? 'open' : ''} ${props.kb ? 'kb' : ''}`} role="dialog" aria-modal="true">
        <div className="grab" />
        {props.children}
      </div>
    </>
  );
}

/** Aktionsliste als Sheet. */
export interface MenuItem { label: string; onClick: () => void; danger?: boolean }
export function MenuSheet(props: { open: boolean; title?: ReactNode; subtitle?: ReactNode; items: MenuItem[]; onClose: () => void; children?: ReactNode }) {
  return (
    <Sheet open={props.open} onClose={props.onClose}>
      {props.title && <h2>{props.title}</h2>}
      {props.subtitle && <div className="subtitle">{props.subtitle}</div>}
      {props.children}
      <div className="menu">
        {props.items.map((it) => (
          <button key={it.label} className={it.danger ? 'danger' : ''} onClick={it.onClick}>{it.label}</button>
        ))}
      </div>
    </Sheet>
  );
}

let toastTimer: number | undefined;
export function toast(msg: string): void {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('show'), 2200);
}

export function TopBar(props: { title?: ReactNode; onBack?: () => void; backLabel?: string; right?: ReactNode }) {
  return (
    <div className="topbar">
      {props.onBack && (
        <button className="back" onClick={props.onBack} aria-label="Zurück">
          <Icon name="chevron-left" size={22} /> {props.backLabel ?? 'Start'}
        </button>
      )}
      <h1>{props.title}</h1>
      {props.right}
    </div>
  );
}

const PATHS: Record<string, ReactNode> = {
  'chevron-left': <path d="M15 5l-7 7 7 7" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2.5" />
      <path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" />
    </>
  ),
  edit: <path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" />,
  gauge: (
    <>
      <path d="M4.5 17a8.5 8.5 0 1 1 15 0" />
      <path d="M12 13l3.5-4" />
    </>
  ),
  up: <path d="M12 19V5M6 11l6-6 6 6" />,
  down: <path d="M12 5v14M6 13l6 6 6-6" />,
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  leaf: <path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15M5 19l7-7" />,
};

export function Icon({ name, size = 20, stroke = 1.8 }: { name: keyof typeof PATHS | string; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

/** Langes Drücken (≈450 ms) ohne Konflikt mit Scrollen. */
export function useLongPress(onLong: () => void, onTap?: () => void) {
  const st = useRef<{ timer?: number; x: number; y: number; fired: boolean }>({ x: 0, y: 0, fired: false });
  const cancel = () => window.clearTimeout(st.current.timer);
  return {
    onPointerDown: (e: React.PointerEvent) => {
      cancel();
      st.current = {
        x: e.clientX, y: e.clientY, fired: false,
        timer: window.setTimeout(() => { st.current.fired = true; onLong(); }, 450),
      };
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (Math.hypot(e.clientX - st.current.x, e.clientY - st.current.y) > 8) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onClick: () => { if (!st.current.fired) onTap?.(); },
  };
}
