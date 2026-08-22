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

## Web-Version (online, ohne Mac)

```bash
npx expo export --platform web --output-dir dist
node scripts/bundle-single-file.mjs dist/habit-grid.html
```

Das packt den ganzen Build in **eine** HTML-Datei — Fonts und Bilder als
data:-URIs —, die sich als Claude-Artifact veröffentlichen lässt. Zwei Dinge
macht das Script dabei, ohne die es nicht funktioniert:

- Der Build setzt `experiments.baseUrl` auf den Platzhalter `/__HK_BASE__`.
  Das Script ersetzt das Literal durch `window.__HK_BASE__`, das beim Laden aus
  `location.pathname` berechnet wird. Sonst wäre die Datei an genau einen Pfad
  gebunden — und die URL steht erst nach dem Veröffentlichen fest.
- Es pinnt die Adresszeile. expo-router würde sonst `/settings` und `/stats`
  in die History schieben, und ein Reload dort liefert auf einem statischen
  Host einen 404.

Im Artifact-Viewer sind normale Download-Links wirkungslos, deshalb geht der
Export dort über die `downloads`-Capability (`src/lib/artifactHost.ts`) und
fällt außerhalb auf einen normalen Link zurück.

## Backups

Die Daten liegen nur im App-Storage. Wird Expo Go gelöscht, sind sie weg.
**Settings → Data Import/Export → Export** schreibt eine JSON-Datei ins
iOS-Share-Sheet — das ist die einzige Sicherung. Mach das nach jedem größeren
Nachtragen einmal.

Der Import ersetzt *alles*. `parseBackup()` ist deshalb absichtlich streng und
bricht bei einer beschädigten Datei mit einer Meldung ab, statt halb zu
importieren.

Zwei Wege führen hinein: **Import from file** über den Datei-Dialog, und
**Import pasted text** für Umgebungen ohne Datei-Dialog — dort öffnest du das
Backup in einem Editor und fügst es ins Textfeld ein.

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
- **Speicher:** nie direkt `AsyncStorage`, immer `src/store/storage.ts`. Ein
  eingebetteter Host kann `localStorage` verweigern; der Adapter fällt dann auf
  den Arbeitsspeicher zurück und die App zeigt einen roten Banner, statt still
  Daten zu verlieren.
- **Dialoge:** nie `Alert.alert`, `window.confirm` oder `window.alert`, immer
  `src/lib/dialog.tsx`. `Alert.alert` ist auf react-native-web eine leere
  Funktion, und ein sandboxed iframe ohne `allow-modals` lässt `window.confirm`
  stillschweigend `false` zurückgeben — eine Bestätigung sieht dann aus wie ein
  Nein. Der In-App-Dialog verhält sich überall gleich.

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
