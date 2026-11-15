# Gym

Bens Gym-Tabelle als Web-App (PWA): dieselbe Tabelle wie in Apple Notes, nur
mit fixierter Gerätespalte und der Heute-Spalte direkt daneben.

- **Technik:** Vite + React + TypeScript, Daten lokal in IndexedDB (Dexie), Service Worker
  (vite-plugin-pwa) → läuft offline. Kein Login, kein Server.
- **Hosting:** derselbe GitHub-Pages-Workflow wie Habit Grid (`.github/workflows/deploy.yml`)
  baut die App bei jedem Push auf `main` mit und legt sie unter `<pages-url>/gym/` ab.
- **Aufs iPhone:** `https://benzeitlinger.github.io/Habitgrid/gym/` in Safari öffnen →
  Teilen → „Zum Home-Bildschirm".

## Entwickeln

```bash
cd gym
npm install
npm run dev      # lokaler Server
npm test         # Startdaten, Challenges, Backup-Roundtrip
npm run build    # Typecheck + Build nach dist/
```

## Wo was liegt

| Datei | Inhalt |
|---|---|
| `src/lib/seed.ts` | Startdaten aus der Notes-Tabelle (werden beim allerersten Start eingespielt) |
| `src/lib/db.ts` | Dexie-Schema, Backup-Export/-Import (Import ersetzt alles, prüft streng) |
| `src/lib/logic.ts` | Spalten, letztes Gewicht, Verlauf, Markdown für Claude |
| `src/lib/rewards.ts` | Pflanze + Challenges. Neue Challenge = neuer Eintrag in `CHALLENGES` |
| `src/screens/` | Start, Tabelle, More, Einstellungen, Rewards |

Rewards werden nur aus den Trainingsdaten berechnet und nicht gespeichert. Deshalb verfällt nichts,
und ein Backup enthält automatisch alles.
