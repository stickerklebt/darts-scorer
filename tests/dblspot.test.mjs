import assert from 'node:assert/strict';
import { spotXY, spotSVG } from '../js/ui/dblspot.js';
import { fullStats } from '../js/stats.js';

test('Doppel-Stelle: Mitte innen/außen liegt auf der Achse, Punkte werden gezeichnet', () => {
  const [x0, y0] = spotXY({ a: 0, r: 0 }), [x1, y1] = spotXY({ a: 0, r: 1 });
  assert.ok(Math.abs(x0) < 1e-9 && Math.abs(x1) < 1e-9);
  assert.ok(y1 < y0, 'außen liegt oben');
  const [xl] = spotXY({ a: -1, r: 0.5 }), [xr] = spotXY({ a: 1, r: 0.5 });
  assert.ok(xl < 0 && xr > 0);
  const svg = spotSVG(16, [{ a: 0, r: 0.5 }, { a: 0.4, r: 0.2 }]);
  assert.equal((svg.match(/class="ds-dot blk"/g) || []).length, 2);
  assert.ok(svg.includes('Doppel 16'));
});

test('Doppel-Stelle: Statistik sammelt throw.spot je Doppel', () => {
  const pid = 'p1';
  const m = { id: 'm1', game: 'x01', opts: { start: 501, out: 'double', mode: 'legs', target: 1 }, sides: [[pid]], playerIds: [pid], done: true, winners: [0],
    startedAt: 1, endedAt: 2, first: 0, pending: [],
    legs: [{ set: 1, starter: 0, winner: 0, turns: [{ s: 0, pid, startRem: 32, input: 'darts', score: 32, darts: 1, out: true, throws: [{ n: 16, m: 2, before: 32, target: null, spot: { a: 0.3, r: 0.6 } }] }] }] };
  const st = fullStats([m], pid, 'all');
  assert.deepEqual(st.spots.D16, [{ a: 0.3, r: 0.6 }]);
});
