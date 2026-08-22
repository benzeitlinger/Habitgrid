# HabitKit (Eigenbau)

Ein Habit Tracker nach dem Vorbild von [HabitKit](https://www.habitkit.app/),
gebaut mit Expo, damit er ohne Xcode auf dem iPhone läuft. Alle Daten liegen
ausschließlich lokal auf dem Gerät.

Design-Referenz: die Screenshots in `../emulate_thsi_app/`.

## Auf dem iPhone starten

1. **Expo Go** aus dem App Store installieren
2. Mac und iPhone ins **gleiche WLAN**
3. Im Projektordner:

```bash
npx expo start
```

4. Den QR-Code mit der iPhone-Kamera scannen — die App öffnet sich in Expo Go.

Zum Entwickeln im Browser (kein Expo Go nötig, aber ohne Haptics und ohne
iOS-Share-Sheet):

```bash
npx expo start --web
```

## Was drin ist

| Screen | Inhalt |
|---|---|
| Checklist | Hauptscreen. Kategorie-Filter, Umschalter für **1 / 3 / 5 / 7 Tage**, Tap erhöht den Zähler, Long-Press setzt den Tag zurück. |
| Statistik | Jahres-Heatmap, Completed Days, Completion Rate, Completions/Month-Chart, Current & Best Streak — gesamt und pro Habit. |
| New / Edit Habit | Icon, Name, Beschreibung, Farbe, **Build/Quit**, Streak-Ziel, Kategorien, Tracking-Typ, Zielmenge pro Tag. |
| Settings | General, Theme, Archived Habits, Data Import/Export, Reorder Habits. |

### Build- und Quit-Habits

Das ist die eine bewusste Erweiterung gegenüber dem Original.

- **Build** (z. B. *Lesen*): eine gefüllte Zelle heißt „gemacht". Guter Tag =
  Tagesziel erreicht. Der Streak zählt Wochen bzw. Monate, in denen das
  Streak-Ziel erreicht wurde.
- **Quit** (z. B. *Alkohol trinken*): eine gefüllte Zelle markiert den
  **Ausrutscher**. Guter Tag = nicht mehr als erlaubt. Der Streak zählt
  aufeinanderfolgende saubere Tage. Ein vergangener Tag ohne Eintrag gilt als
  sauber — sonst müsstest du täglich „nichts getrunken" bestätigen, damit der
  Streak weiterläuft.

Eine einzige Funktion, `isGoodDay()` in [`src/lib/stats.ts`](src/lib/stats.ts),
entscheidet das für beide Fälle. Heatmap, Streak, Rate und Chart lesen
ausschließlich diese Funktion.

## Backups

Die Daten liegen nur im App-Storage. Wird Expo Go gelöscht, sind sie weg.
**Settings → Data Import/Export → Export** schreibt eine JSON-Datei ins
iOS-Share-Sheet — das ist die einzige Sicherung. Mach das nach jedem größeren
Nachtragen einmal.

Der Import ersetzt *alles*. `parseBackup()` ist deshalb absichtlich streng und
bricht bei einer beschädigten Datei mit einer Meldung ab, statt halb zu
importieren.

## Aufbau

```
app/                expo-router Screens
  index.tsx         Checklist
  stats.tsx         Statistik
  settings.tsx      Settings inkl. Unterseiten
  habit/[id].tsx    New / Edit Habit ("new" = anlegen)
src/
  theme.ts          Farben, Radien, die 21 Habit-Farben
  icons.ts          Icon-Katalog (reine Daten, ohne RN-Imports)
  lib/date.ts       Alle Datumslogik. Lokale YYYY-MM-DD-Strings, nie Date/UTC.
  lib/stats.ts      isGoodDay() und alles, was daraus folgt
  lib/backup.ts     Export-Format und strenger Parser
  store/habits.ts   zustand + persist auf AsyncStorage
```

### Zwei Fallen, die schon zugeschnappt sind

- **Datum:** immer `src/lib/date.ts` benutzen, nie `new Date()` direkt
  vergleichen. Abhaken um 23:50 muss auf heute landen, nicht auf morgen.
- **zustand v5:** ein Selektor, der ein neues Array oder Objekt baut, muss
  durch `useShallow` — sonst rendert die Komponente endlos. Dafür gibt es die
  fertigen Hooks `useVisibleHabits()`, `useCategories()` usw. in
  `src/store/habits.ts`.

## Tests

```bash
npx jest
```

Deckt `date.ts` (Zeitzonen, DST, Schaltjahr), `stats.ts` (jeder Fall einmal für
Build und einmal für Quit), `backup.ts` (Round-Trip und kaputte Dateien) und
den Icon-Katalog gegen die echten Glyph-Maps ab.

```bash
npx tsc --noEmit
```

## Noch offen

- **Import der echten HabitKit-Daten.** Braucht eine Export-Datei aus
  HabitKit (Settings → Data Import/Export). Das Format ist nicht dokumentiert,
  der Importer wird darauf zugeschnitten.
- Keine Erinnerungen, keine Home-Screen-Widgets, kein Cloud-Sync — siehe Plan.
