/**
 * Runs the HabitKit importer over a real export and prints the resulting
 * numbers, so they can be held against the screenshots of the original app.
 */
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const exportFile = process.argv[2];
const outFile = process.argv[3];

const dir = mkdtempSync(join(tmpdir(), 'hk-'));
const bundle = join(dir, 'bundle.mjs');

await build({
  entryPoints: ['scripts/entry-verify.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: bundle,
  logLevel: 'error',
  alias: { '@': new URL('../src', import.meta.url).pathname },
});

const { run } = await import(bundle);
run(exportFile, outFile);
