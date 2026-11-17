import assert from 'node:assert/strict';
import { fieldAt, fieldKey, fieldName, AR, aimBoard } from '../js/ui/aimboard.js';

const at = (r, deg) => { const a = (deg * Math.PI) / 180; return fieldAt(r * Math.sin(a), -r * Math.cos(a)); }; // 0° = oben

test('Scheibe: Feld an Position (Bull, 25, Triple, Double, Single innen/außen, daneben)', () => {
  assert.deepEqual(fieldAt(0, 0), { n: 25, m: 2, z: '' });
  assert.deepEqual(fieldAt(AR.outer - 1, 0), { n: 25, m: 1, z: '' });
  assert.deepEqual(at((AR.triIn + AR.triOut) / 2, 0), { n: 20, m: 3, z: '' });
  assert.deepEqual(at((AR.dblIn + AR.dblOut) / 2, 0), { n: 20, m: 2, z: '' });
  assert.deepEqual(at(40, 0), { n: 20, m: 1, z: 'i' });
  assert.deepEqual(at(90, 0), { n: 20, m: 1, z: 'o' });
  assert.equal(at(AR.dblOut + 5, 0).n, 0);
  assert.equal(at(90, 18).n, 1);        // rechts neben der 20
  assert.equal(at(90, 180).n, 3);       // unten
  assert.equal(at(90, 270).n, 11);      // links
  assert.equal(at(90, 8.9).n, 20);      // knapp vor der Grenze 20|1
  assert.equal(at(90, 9.1).n, 1);
});

test('Scheibe: Namen, Schlüssel und Markierung der getroffenen Felder', () => {
  assert.equal(fieldName({ n: 16, m: 2 }), 'D16');
  assert.equal(fieldName({ n: 0, m: 1 }), 'Daneben');
  assert.equal(fieldKey({ n: 13, m: 1, z: 'i' }), '13-1i');
  assert.equal(fieldKey({ n: 25, m: 2 }), 'b2');
  const svg = aimBoard([{ n: 20, m: 3, z: '', x: 0, y: -70 }, { n: 25, m: 2, z: '' }]);
  assert.match(svg, /class="af hit" data-k="20-3"/);
  assert.match(svg, /class="af hit" data-k="b2"/);
  assert.equal((svg.match(/class="amark"/g) || []).length, 1); // Wurfstelle nur mit Position
});

import { axisRange } from '../js/ui/charts.js';
test('Diagramm-Achse passt sich den Werten an (5–10 % nicht bis 100 %)', () => {
  const r = axisRange([5, 7, 10], 100);
  assert.ok(r.lo >= 0 && r.lo <= 5 && r.hi >= 10 && r.hi <= 15, JSON.stringify(r));
  assert.deepEqual(axisRange([0, 100], 100).hi, 100);
  const a = axisRange([40, 62]);
  assert.ok(a.lo > 0 && a.hi < 100, JSON.stringify(a));
});
