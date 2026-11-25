import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { applyTheme } from './lib/theme';
import './styles.css';
import { registerSW } from 'virtual:pwa-register';

// Updates aktiv holen: iOS-Homescreen-Apps werden oft nur aus dem Hintergrund
// zurückgeholt (keine Navigation), dann prüft der Browser nie auf eine neue Version.
// Neue Version → Service Worker übernimmt → Seite lädt sich einmal neu.
registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (!reg) return;
    const check = () => { if (navigator.onLine) reg.update().catch(() => {}); };
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
    window.setInterval(check, 30 * 60 * 1000);
  },
});

applyTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => applyTheme());

// Dauerhaften Speicher anfragen, damit iOS/Browser die Daten nicht wegräumt.
navigator.storage?.persist?.().catch(() => {});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
