# Gym-App für eine zweite Person bauen

Mit dieser Anleitung baust du auf deinem PC eine eigene Kopie der Gym-App, z. B. für deine
Freundin. Sie bekommt einen eigenen Link, eigene Geräte und eigene Startdaten.
Deine App bleibt davon unberührt.

> **Wichtig:** Die Daten liegen immer nur auf dem Handy, auf dem die App installiert ist.
> Zwei Personen teilen sich also nie Daten, auch nicht bei derselben App-Kopie.
> Eine eigene Kopie braucht es nur, weil deine App beim ersten Start **deine** Startdaten
> (Tag A mit deinen Gewichten) einspielt und weil ihre Geräte andere sind.

---

## Weg 1: Mit Claude Code (empfohlen)

1. Neues, leeres GitHub-Repo anlegen, z. B. `gym-<name>` (öffentlich, sonst geht GitHub Pages
   im Gratis-Plan nicht).
2. Auf dem PC Claude Code in einem leeren Ordner starten und diesen Prompt einfügen.
   Die Teile in `<…>` vorher ausfüllen:

```text
Kopiere den Ordner gym/ aus https://github.com/benzeitlinger/Habitgrid in dieses neue Repo
(<dein-github-name>/gym-<name>), und zwar so, dass der Inhalt von gym/ im Repo-Root liegt.
Dann anpassen:

1. App-Name: in vite.config.ts (manifest name/short_name) und index.html
   (<title>, apple-mobile-web-app-title) "Gym" → "<App-Name, z. B. Gym Lena>".
2. Datenbankname: in src/lib/db.ts den Standardnamen 'gym' → 'gym-<name>',
   damit sich die beiden Apps im selben Browser nie in die Quere kommen.
3. Startdaten: src/lib/seed.ts neu schreiben:
   - Tag A Geräte (Reihenfolge): <Gerät 1>, <Gerät 2>, …
   - Tag B Geräte (Reihenfolge): <Gerät 1>, <Gerät 2>, …
   - Bisherige Werte: <keine | Tabelle einfügen wie unten>
   - Ziele / Maximalkraft: <keine | Liste>
   Bei zwei Gewichten in einer Zelle das höhere als Gewicht, den Rest als Notiz.
   Tests in src/lib/logic.spec.ts und src/lib/suggest.spec.ts an die neuen Startdaten anpassen
   (oder die seed-spezifischen Tests entfernen und nur die allgemeinen behalten).
4. GitHub-Pages-Deploy: .github/workflows/deploy.yml anlegen, das bei Push auf main
   npm ci, npm test, npm run build ausführt und dist/ mit actions/upload-pages-artifact
   + actions/deploy-pages veröffentlicht (Node 22).
5. README kurz anpassen (Name, Link).
Danach: npm install, npm test, npm run build lokal laufen lassen, committen und auf main pushen.
```

3. Auf GitHub im neuen Repo: **Settings → Pages → Source: GitHub Actions**.
4. Unter **Actions** warten, bis der Deploy grün ist (1–2 Minuten).
5. Link: `https://<dein-github-name>.github.io/gym-<name>/`. Auf **ihrem** iPhone in Safari
   öffnen → Teilen → **Zum Home-Bildschirm**.

---

## Weg 2: Von Hand

Voraussetzungen: [Node.js 22](https://nodejs.org), Git, ein GitHub-Konto.

```bash
git clone https://github.com/benzeitlinger/Habitgrid.git
mkdir gym-<name>
cp -r Habitgrid/gym/. gym-<name>/        # Windows: robocopy Habitgrid\gym gym-<name> /E
cd gym-<name>
rm -rf node_modules dist                  # falls mitkopiert
npm install
```

### 1. Name ändern
- `vite.config.ts`: `name: 'Gym'` und `short_name: 'Gym'` → z. B. `'Gym Lena'`
- `index.html`: `<title>Gym</title>` und `apple-mobile-web-app-title`

### 2. Eigener Datenbankname
`src/lib/db.ts`: `constructor(name = 'gym')` → `constructor(name = 'gym-lena')`

### 3. Startdaten
`src/lib/seed.ts` bearbeiten:

```ts
// Tag-A-Termine (leer lassen, wenn es noch keine gibt)
const A_DATES: string[] = [];

// Tag A: Name, bisherige Werte (eine Zahl pro Termin aus A_DATES, oder [Gewicht, 'Notiz']), Ziel optional
const A_ROWS: { name: string; cells: Cell[]; target?: number | null; targetNote?: string }[] = [
  { name: 'Beinpresse', cells: [] },
  { name: 'Latzug',     cells: [] },
  // …
];

const B_ROWS = ['Beinstrecker', 'Butterfly' /* … */];

// Maximalkraft-Einträge: Typ-Angabe stehen lassen, nur den Inhalt leeren
const MAX: { device: string; date: string; max: number; suggested: number | null; note: string }[] = [];
```

Wenn sie noch keine Werte hat, reichen leere Listen. Die Geräte lassen sich später auch
direkt in der App unter „Geräte“ anlegen, umbenennen und sortieren.

Danach die Tests in `src/lib/logic.spec.ts` und `src/lib/suggest.spec.ts`, die deine
konkreten Werte prüfen (Brustpresse, 48 Einträge usw.), löschen oder anpassen.

### 4. Testen
```bash
npm test
npm run dev        # öffnet die App lokal im Browser
```

### 5. Deploy-Workflow
Datei `.github/workflows/deploy.yml` anlegen:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: false
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

### 6. Hochladen
```bash
git init -b main
git add -A
git commit -m "Gym-App für <Name>"
git remote add origin https://github.com/<dein-github-name>/gym-<name>.git
git push -u origin main
```

Dann wie bei Weg 1, Schritte 3–5: Pages auf „GitHub Actions“ stellen, Deploy abwarten,
Link auf ihrem iPhone zum Home-Bildschirm hinzufügen.

---

## Gut zu wissen

- **Backup:** Auch bei ihr gilt: Einstellungen → Exportieren ab und zu machen. Wird die
  Homescreen-App gelöscht, sind die Daten sonst weg.
- **Updates:** Die Kopie ist unabhängig. Verbesserungen an deiner App kommen nicht automatisch
  rüber. Dafür den Ordner neu kopieren und dabei `seed.ts`, `db.ts`-Name und App-Name
  beibehalten. Ihre Daten bleiben erhalten, die liegen auf ihrem Handy.
- **Zusatzgewicht-Stufen:** Standard sind 0 / 1,1 / 2,3 / 3,4 / 4,5. Hat ihr Studio andere
  Maschinen, pro Gerät in der App unter „Gerät bearbeiten“ ändern.
- **Vorschläge:** Funktionieren ab dem ersten eingetragenen Training automatisch, genau wie bei dir.
