import assert from 'node:assert/strict';
import { createMatch } from '../js/match.js';
import * as X from '../js/x01.js';
import { situations } from '../js/situations.js';

/* a gegen b, 501, 1 Leg nur Summen: a wirft 20, 100, 45, 60 …; b immer 60 */
function game(t0) {
  const m = createMatch('x01', [['a'], ['b']], { start: 501, out: 'double', mode: 'legs', target: 1 }, 0, t0);
  for (const [x, y] of [[20, 60], [100, 60], [45, 60], [60, 60], [26, 60]]) { X.submitSum(m, x); X.submitSum(m, y); }
  return m;
}

test('Umstände: nach schlechter/guter Aufnahme, Aufnahme im Leg, Gegner im Finish', () => {
  const r = situations([game(new Date(2026, 10, 20, 19).getTime())], 'a');
  // a: Rest vor der Aufnahme 501, 481, 381, 336, 276 → alle Scoring
  assert.equal(r.base.n, 5);
  assert.equal(r.base.avg, (20 + 100 + 45 + 60 + 26) / 5);
  assert.equal(r.rows.afterBad.n, 1); assert.equal(r.rows.afterBad.avg, 100); // nach 20 kam 100
  assert.equal(r.rows.afterTon.avg, 45);
  assert.equal(r.rows.afterGood.n, 2); // nach 100 → 45, nach 60 → 26
  assert.equal(r.rows.turn1.avg, 20); assert.equal(r.rows.turn4.n, 2);
  // b liegt nach 60er-Aufnahmen: 441, 381, 321, 261 – nie ≤ 170 → immer „weit weg“
  assert.equal(r.rows.oppFar.n, 5); assert.equal(r.rows.oppFinish, undefined);
  // a hinten im Leg nach dem 1. Wechsel (481 > 441)
  assert.ok(r.rows.legBehind.n >= 1);
  assert.equal(r.rows.matchLevel.n, 5);
});

test('Umstände: Gegner im Finish', () => {
  const t0 = new Date(2026, 10, 21, 9).getTime();
  const m = createMatch('x01', [['a'], ['b']], { start: 501, out: 'double', mode: 'legs', target: 1 }, 0, t0);
  for (const [x, y] of [[40, 180], [40, 180]]) { X.submitSum(m, x); X.submitSum(m, y); } // b steht nach 2 Aufnahmen auf 141
  X.submitSum(m, 40);
  const r = situations([game(t0 - 1000), m], 'a');
  assert.equal(r.rows.oppFinish.n, 1); // 3. Aufnahme von a
  assert.equal(r.base.n, 8);
});
