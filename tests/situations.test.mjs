import assert from 'node:assert/strict';
import { createMatch } from '../js/match.js';
import * as X from '../js/x01.js';

/* a gegen b, 501, 1 Leg nur Summen: a wirft 20, 100, 45, 60 …; b immer 60 */
function game(t0) {
  const m = createMatch('x01', [['a'], ['b']], { start: 501, out: 'double', mode: 'legs', target: 1 }, 0, t0);
  for (const [x, y] of [[20, 60], [100, 60], [45, 60], [60, 60], [26, 60]]) { X.submitSum(m, x); X.submitSum(m, y); }
  return m;
}

test('Verlauf im Leg: Ø je Aufnahme-Nummer bis 170', async () => {
  const { legCurve } = await import('../js/situations.js');
  const t0 = new Date(2026, 10, 20, 19).getTime();
  const ms = [game(t0), game(t0 + 1), game(t0 + 2)]; // a: 20, 100, 45, 60, 26 (alle über 170)
  const r = legCurve(ms, 'a');
  assert.equal(r.avgTurns, 5);
  assert.deepEqual(r.points.map((p) => p.avg), [20, 100, 45, 60, 26]);
  assert.equal(r.points[1].count, 3);
  assert.equal(legCurve(ms.slice(0, 2), 'a').points.length, 0); // unter 3 Werten → nichts
});
