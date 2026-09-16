---

editor_options: 
  markdown: 
    wrap: 72
---

# Habit Grid

Ein Habit Tracker, gebaut mit Expo, damit er ohne Xcode auf dem iPhone läuft. Alle Daten liegen ausschließlich lokal auf dem Gerät. Design und Funktionsumfang sind an eine bekannte kommerzielle App angelehnt; Import unterstützt deren Export-Format (siehe „HabitKit-Import" unten) — Code, Assets und Name sind komplett eigenständig.

Design-Referenz: die Screenshots in `../emulate_thsi_app/`.

## Auf dem iPhone: täglich nutzen (GitHub Pages)

Kein Mac, kein Expo Go, keine laufende Entwicklungssitzung nötig — einmal einrichten,
danach ist es eine normale Web-App mit Icon auf dem Home-Bildschirm.

1. **Einmalig einrichten:** GitHub-Repo anlegen und pushen (siehe unten), GitHub
   Pages in den Repo-Settings auf **Source: GitHub Actions** stellen.
2. Danach reicht für jedes Update: `git push`. `.github/workflows/deploy.yml`
   baut bei jedem Push auf `main` den Web-Export, packt ihn mit
   `scripts/bundle-single-file.mjs` in eine Datei und published sie.
3. Die Pages-URL (`https://<user>.github.io/<repo>/`) einmal in **Safari**
   öffnen → Teilen-Symbol → **Zum Home-Bildschirm** → fertig. Läuft danach im
   Vollbild, ohne Adressleiste, mit eigenem Icon.

Die einmalige Einrichtung braucht deinen eigenen GitHub-Login (siehe
`git remote add` / `gh auth login` in der Projekt-Historie bzw. was Claude Code
dir dazu ausgegeben hat) — das kann kein Agent für dich erledigen.

## Entwickeln

1.  **Expo Go** aus dem App Store installieren
2.  Mac und iPhone ins **gleiche WLAN**
3.  Im Projektordner:

``` bash
npx expo start
```

4.  Den QR-Code mit der iPhone-Kamera scannen — die App öffnet sich in Expo Go.

Zum Entwickeln im Browser (kein Expo Go nötig, aber ohne Haptics und ohne iOS-Share-Sheet):

``` bash
npx expo start --web
```

## Was drin ist

| Screen | Inhalt |
|------------------------------------|------------------------------------|
| Checklist | Hauptscreen. Kategorie-Filter, Umschalter für **1 / 3 / 5 / 7 Tage**. Bei Tagesziel 1 (bzw. Quit-Habits) ist Tap ein echtes Toggle; darüber Tap = hochzählen, Long-Press = Tag zurücksetzen. Ein Tap, der einen Streak neu erreicht, zeigt kurz eine Flamme an genau der Zelle. Habits mit Tracking-Typ **Custom Value** zeigen die eingetragene Zahl direkt auf der Zelle (z. B. Liegestütze-Wiederholungen), nicht nur die Füllfarbe. |
| Statistik | Jahres-Heatmap, Completed Days, Completion Rate, Completions/Month-Chart, Current & Best Streak — gesamt und pro Habit. |
| New / Edit Habit | Icon, Name, Beschreibung, Farbe, **Build/Quit**, Streak-Ziel (Tag/Woche/Monat), Kategorien, Tracking-Typ, Zielmenge pro Tag. |
| Settings | **Profiles**, General, Theme, Archived Habits, Data Import/Export, Reorder Habits. |

### Profile

Kein Login, kein Account, kein Sync — ein Profil ist einfach ein zweiter, komplett
getrennter Datensatz auf demselben Gerät (eigene Habits, eigene Historie, eigene
Kategorien und eigenes Farbschema), z. B. um dich und eine zweite Person auf einem
Handy nebeneinander zu tracken. **Settings → Profiles**: neues Profil anlegen
(schaltet sofort dorthin um), umbenennen, oder löschen (nur wenn mehr als eines
existiert — das letzte Profil lässt sich nicht entfernen). Export/Import in
Settings → Data Import/Export bezieht sich immer nur auf das gerade aktive Profil.

Intern bleibt das aktive Profil in genau den Feldern (`habits`, `categories`,
`entries`, `settings`), die es vorher schon gab — nur die *anderen* Profile liegen
als Schnappschuss in `archive` (`src/store/habits.ts`). Ein Umschalten tauscht
diese Felder gegen den Schnappschuss des Zielprofils. Dadurch bleibt jede
bestehende Stelle, die `habits`/`entries`/… liest, unverändert, und ein
Backup, das vor dieser Funktion exportiert wurde, landet beim Import unverändert
im aktuell aktiven Profil.

### Build- und Quit-Habits

Das ist die eine bewusste Erweiterung gegenüber dem Original.

- **Build** (z. B. *Lesen*): eine gefüllte Zelle heißt „gemacht". Guter Tag = Tagesziel erreicht. Der Streak zählt Wochen bzw. Monate, in denen das Streak-Ziel erreicht wurde.
- **Quit** (z. B. *Alkohol trinken*): eine gefüllte Zelle markiert den **Ausrutscher**. Guter Tag = nicht mehr als erlaubt. Der Streak zählt aufeinanderfolgende saubere Tage. Ein vergangener Tag ohne Eintrag gilt als sauber — sonst müsstest du täglich „nichts getrunken" bestätigen, damit der Streak weiterläuft.

Eine einzige Funktion, `isGoodDay()` in [`src/lib/stats.ts`](src/lib/stats.ts), entscheidet das für beide Fälle. Heatmap, Streak, Rate und Chart lesen ausschließlich diese Funktion.

**Checklist vs. Jahres-Heatmap zeigen Quit-Habits absichtlich unterschiedlich.**
Im Checklist-Screen ist eine Quit-Zelle **standardmäßig gefüllt** (clean = erledigt
aussehend, kein Tap nötig), ein Tap markiert bewusst einen Ausrutscher (Zelle
kippt auf leer), nochmal tippen macht ihn rückgängig — dafür gibt es
`checklistFillRatio()` in `stats.ts`. Die Jahres-Heatmap in `stats.tsx` nutzt
weiterhin das normale `fillRatio()` (leer = clean, Farbe = Ausrutscher), weil
dort über ein ganzes Jahr das Scannen nach seltenen schlechten Tagen der Zweck
ist — ein fast durchgehend grünes Jahr wäre dort nicht hilfreich.

## Web-Version (online, ohne Mac)

``` bash
npx expo export --platform web --output-dir dist
node scripts/bundle-single-file.mjs dist/habit-grid.html
```

Das packt den ganzen Build in **eine** HTML-Datei — Fonts und Bilder als <data:-URIs> —, die sich als Claude-Artifact veröffentlichen lässt. Zwei Dinge macht das Script dabei, ohne die es nicht funktioniert:

- Der Build setzt `experiments.baseUrl` auf den Platzhalter `/__HG_BASE__`. Das Script ersetzt das Literal durch `window.__HG_BASE__`, das beim Laden aus `location.pathname` berechnet wird. Sonst wäre die Datei an genau einen Pfad gebunden — und die URL steht erst nach dem Veröffentlichen fest.
- Es pinnt die Adresszeile. expo-router würde sonst `/settings` und `/stats` in die History schieben, und ein Reload dort liefert auf einem statischen Host einen 404.

Im Artifact-Viewer sind normale Download-Links wirkungslos, deshalb geht der Export dort über die `downloads`-Capability (`src/lib/artifactHost.ts`) und fällt außerhalb auf einen normalen Link zurück.

## Backups

Die Daten liegen nur im App-Storage. Wird Expo Go gelöscht, sind sie weg. **Settings → Data Import/Export → Export** schreibt eine JSON-Datei ins iOS-Share-Sheet — das ist die einzige Sicherung. Mach das nach jedem größeren Nachtragen einmal.

Der Import ersetzt *alles*. `parseBackup()` ist deshalb absichtlich streng und bricht bei einer beschädigten Datei mit einer Meldung ab, statt halb zu importieren.

Zwei Wege führen hinein: **Import from file** über den Datei-Dialog, und **Import pasted text** für Umgebungen ohne Datei-Dialog — dort öffnest du das Backup in einem Editor und fügst es ins Textfeld ein.

Beide erkennen selbst, ob es ein Backup dieser App oder ein **HabitKit-Export** ist (`src/lib/import/detect.ts`).

### HabitKit-Import

`src/lib/import/habitkit.ts` liest das Original-Format. Drei Dinge, die dabei zählen:

- HabitKit speichert jede Completion als UTC **plus** den Offset, der beim Eintragen galt: `2025-07-14T22:00:00Z` mit Offset 120 ist lokal schon der
  15. Ohne diese Korrektur rutscht die halbe Historie einen Tag zurück.
- Ein Habit kann mehrere `intervals` haben. Maßgeblich ist das offene (`endDate: null`), sonst das zuletzt begonnene.
- HabitKits Voreinstellungs-Kategorien kommen alle mit, auch ungenutzte. Der Import behält nur die, unter denen wirklich etwas liegt.

**Kalibrierung.** `scripts/verify-import.mjs` prüft den Import gegen die Zahlen, die das Original am 22.08.2026 anzeigte:

``` bash
node scripts/verify-import.mjs ../habitkit_export.json
```

Alle fünf Referenzwerte stimmen überein: 422 Completed Days, 68 % Completion Rate, „3 min Journal" 53 Completions und 30 %, Best Streak 11.

Dabei kam heraus, dass HabitKit die Rate anders rechnet als ursprünglich angenommen — und gesamt anders als pro Habit:

|           | Formel                                                         |
|------------------------------------|------------------------------------|
| Gesamt    | Tage mit mindestens einem Häkchen ÷ vergangene Tage des Jahres |
| Pro Habit | gute Tage ÷ Tage seit dem ersten Eintrag **in diesem Jahr**    |

Beides wird abgeschnitten, nicht gerundet. `src/lib/stats.ts` bildet das nach, damit die Zahlen nach dem Umstieg dieselben bleiben.

## Aufbau

```         
app/                expo-router Screens
  index.tsx         Checklist — Toggle-Logik, Streak-Flame-Trigger
  stats.tsx         Statistik
  settings.tsx      Settings inkl. Unterseiten
  habit/[id].tsx    New / Edit Habit ("new" = anlegen)
src/
  theme.ts          Farben, Radien, die 21 Habit-Farben
  icons.ts          Icon-Katalog (reine Daten, ohne RN-Imports)
  components/FlameBurst.tsx  Reanimated Pop-Animation für den Streak-Flame
  lib/date.ts       Alle Datumslogik. Lokale YYYY-MM-DD-Strings, nie Date/UTC.
  lib/stats.ts      isGoodDay() und alles, was daraus folgt
  lib/backup.ts     Export-Format und strenger Parser
  store/habits.ts   zustand + persist auf AsyncStorage
.github/workflows/deploy.yml  Baut + published nach GitHub Pages bei jedem Push auf main
scripts/bundle-single-file.mjs  Web-Export -> eine portable HTML-Datei (Artifact + GitHub Pages)
```

### Fallen, die schon zugeschnappt sind

- **Datum:** immer `src/lib/date.ts` benutzen, nie `new Date()` direkt vergleichen. Abhaken um 23:50 muss auf heute landen, nicht auf morgen.
- **zustand v5:** ein Selektor, der ein neues Array oder Objekt baut, muss durch `useShallow` — sonst rendert die Komponente endlos. Dafür gibt es die fertigen Hooks `useVisibleHabits()`, `useCategories()` usw. in `src/store/habits.ts`.
- **Speicher:** nie direkt `AsyncStorage`, immer `src/store/storage.ts`. Ein eingebetteter Host kann `localStorage` verweigern; der Adapter fällt dann auf den Arbeitsspeicher zurück und die App zeigt einen roten Banner, statt still Daten zu verlieren.
- **Dialoge:** nie `Alert.alert`, `window.confirm` oder `window.alert`, immer `src/lib/dialog.tsx`. `Alert.alert` ist auf react-native-web eine leere Funktion, und ein sandboxed iframe ohne `allow-modals` lässt `window.confirm` stillschweigend `false` zurückgeben — eine Bestätigung sieht dann aus wie ein Nein. Der In-App-Dialog verhält sich überall gleich.
- **Web-Export-Head:** nie `app/+html.tsx` für PWA-/Meta-Tags verwenden — das greift nur unter `web.output: "static"`, was dieses Projekt nicht nutzt (`npx expo export --platform web` ignoriert die Datei sonst stillschweigend). Der tatsächlich wirksame Head steht in `scripts/bundle-single-file.mjs`.

## Tests

``` bash
npx jest
```

Deckt `date.ts` (Zeitzonen, DST, Schaltjahr), `stats.ts` (jeder Fall einmal für Build und einmal für Quit), `backup.ts` (Round-Trip und kaputte Dateien), den Icon-Katalog gegen die echten Glyph-Maps und `store/habits.ts` (Profile bleiben beim Umschalten sauber getrennt) ab.

Der Store importiert `@react-native-async-storage/async-storage`, dessen natives Modul es außerhalb einer laufenden App nicht gibt — `jest.config.js` mappt das Paket deshalb testweise auf dessen offiziellen Jest-Mock.

``` bash
npx tsc --noEmit
```

## Noch offen

- Keine Erinnerungen, kein Cloud-Sync.
- Kein echtes Home-Screen-**Widget** (nur ein App-Icon via "Zum Home-Bildschirm",
  siehe oben) — dafür bräuchte es z. B. die iOS-App "Scriptable", die per
  JS-Widget Daten von einer URL abrufen kann. Nicht umgesetzt, nur als Option
  im Hinterkopf.
