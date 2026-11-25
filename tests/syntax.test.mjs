import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

/* Jede App-Datei muss syntaktisch gültig sein – ein Fehler in einem einzigen Modul macht die ganze App schwarz. */
test('Syntax: alle JS-Dateien der App lassen sich parsen', () => {
  const files = [...readdirSync('js').filter((f) => f.endsWith('.js')).map((f) => `js/${f}`), ...readdirSync('js/ui').filter((f) => f.endsWith('.js')).map((f) => `js/ui/${f}`), 'sw.js'];
  const bad = [];
  for (const f of files) { try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); } catch (e) { bad.push(`${f}: ${String(e.stderr).split('\n').slice(0, 4).join(' ')}`); } }
  assert.deepEqual(bad, []);
});
