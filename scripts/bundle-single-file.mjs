/**
 * Packs `expo export --platform web` output into one self-contained HTML file.
 *
 * An Artifact page may not fetch anything from another host, so every asset the
 * bundle references by URL is turned into a data: URI first.
 *
 * The build sets `experiments.baseUrl` to BASE_TOKEN. Expo bakes that in as a
 * string literal, which would pin the app to a single path — but an artifact's
 * URL is only known after publishing. So the literal is swapped for a global
 * that is computed at load time, and the same file then works at any path.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIST = 'dist';
const OUT = process.argv[2] ?? 'dist/single.html';
const BASE_TOKEN = '/__HK_BASE__';
// The hosted page is Ben's own build, so it is not named after the product it
// replaces — the wordmark inside the app is unchanged.
const PAGE_TITLE = 'Habit Grid';

const MIME = {
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

const bundlePath = walk(join(DIST, '_expo')).find((p) => p.endsWith('.js'));
if (!bundlePath) throw new Error('no js bundle in dist/_expo');
let bundle = readFileSync(bundlePath, 'utf8');

// Assets are referenced as "<BASE_TOKEN>/assets/..." inside the bundle.
let inlined = 0;
let inlinedBytes = 0;
for (const path of walk(join(DIST, 'assets'))) {
  const url = BASE_TOKEN + '/' + path.slice(DIST.length + 1).split('\\').join('/');
  if (!bundle.includes('"' + url + '"')) continue;
  const mime = MIME[extname(path)] ?? 'application/octet-stream';
  const data = `data:${mime};base64,${readFileSync(path).toString('base64')}`;
  bundle = bundle.split('"' + url + '"').join(JSON.stringify(data));
  inlined++;
  inlinedBytes += statSync(path).size;
}

// Only absolute runtime asset URLs matter here; relative paths in the app
// config ("./assets/icon.png") are never fetched by the page.
const leftovers = [
  ...bundle.matchAll(new RegExp('"(?:' + BASE_TOKEN + ')?/assets/[^"]+"', 'g')),
].map((m) => m[0]);
if (leftovers.length) {
  throw new Error('asset URLs left unresolved:\n' + [...new Set(leftovers)].join('\n'));
}

const literal = '"' + BASE_TOKEN + '"';
const baseHits = bundle.split(literal).length - 1;
if (baseHits === 0) {
  throw new Error(`no ${literal} found — was the app exported with experiments.baseUrl?`);
}
bundle = bundle.split(literal).join('window.__HK_BASE__');
console.log(`base path: replaced ${baseHits} literal(s)`);

// A literal </script> in the bundle would close the tag early.
const scriptSafe = bundle.split('</script').join('<\\/script');

const BASE_SETUP = [
  '(function () {',
  '  // Where this page is served from, whatever path that turns out to be.',
  '  window.__HK_BASE__ = location.pathname',
  String.raw`    .replace(/\/index\.html$/, '')`,
  String.raw`    .replace(/\/+$/, '');`,
  '',
  '  // Keep the address bar pinned to this one URL. The router would otherwise',
  '  // push /settings and /stats, and a reload there would 404 on a static host',
  '  // — which matters because this page is meant to be kept on a home screen.',
  '  // History entries are still created, so back still works.',
  '  var pinned = location.href;',
  '  var push = history.pushState.bind(history);',
  '  var replace = history.replaceState.bind(history);',
  '  history.pushState = function (state, title) { return push(state, title, pinned); };',
  '  history.replaceState = function (state, title) { return replace(state, title, pinned); };',
  '})();',
].join('\n');

const html = `<title>${PAGE_TITLE}</title>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, shrink-to-fit=no" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="theme-color" content="#000000" />
<style>
  html, body { height: 100%; background: #000; }
  body { overflow: hidden; margin: 0; }
  #root { display: flex; height: 100%; flex: 1; }
</style>
<div id="root"></div>
<script>
${BASE_SETUP}
</script>
<script>${scriptSafe}</script>
`;

writeFileSync(OUT, html);
console.log(
  `inlined ${inlined} assets (${(inlinedBytes / 1024 / 1024).toFixed(2)} MB raw)\n` +
    `wrote ${OUT} — ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB`
);
