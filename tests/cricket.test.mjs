import assert from 'node:assert/strict';
import { createMatch } from '../js/match.js';
import * as C from '../js/cricket.js';
import { rng, throwAt } from '../js/botsim.js';

const mk = (mode = 'points', rounds = 20, sides = [['a'], ['b']]) => createMatch('cricket', sides, { mode, rounds });
const turn = (m, ...darts) => { let r; for (const [n, x] of darts) r = C.throwDart(m, n, x); return r; };

test('Cricket: Treffer schließen (3), Triple schließt sofort, Bull zählt 25 = 1 / Bull = 2', () => {
  const m = mk();
  turn(m, [20, 3], [19, 1], [25, 2]);
  const st = C.state(m);
  assert.equal(st.marks[0][20], 3); assert.equal(st.marks[0][19], 1); assert.equal(st.marks[0][25], 2);
  assert.equal(st.pts[0], 0);
  assert.equal(m.turns[0].marks, 6);
});

test('Cricket: Punkte nur auf eigenen, beim Gegner offenen Feldern', () => {
  const m = mk();
  turn(m, [20, 3], [20, 3], [20, 1]);     // zu + 4 Treffer drüber → 80
  assert.equal(C.score(m, 0), 80);
  assert.equal(m.turns[0].v, 80);
  turn(m, [20, 3], [20, 2], [5, 3]);     // b schließt 20, bekommt 2×20 → 40 (a hat die 20 zu → aber b punktet nur, wenn a offen ist: a ist zu → 0)
  assert.equal(C.score(m, 1), 0, 'Gegner hat 20 schon zu → keine Punkte');
  turn(m, [20, 3], [0, 1], [0, 1]);
  assert.equal(C.score(m, 0), 80, 'beide zu → keine Punkte mehr');
});

test('Cricket: Sieg erst mit allen Feldern zu und mindestens gleich vielen Punkten', () => {
  const m = mk();
  for (const n of [20, 19, 18]) { turn(m, [n, 3], [0, 1], [0, 1]); turn(m, [0, 1], [0, 1], [0, 1]); }
  turn(m, [17, 3], [16, 3], [15, 3]);
  turn(m, [20, 3], [20, 3], [0, 1]);       // b: 20 zu, keine Punkte (a hat zu)
  const r = turn(m, [25, 2], [25, 1]);     // a hat alles zu, 0:0 Punkte → gewonnen
  assert.equal(r.type, 'match'); assert.deepEqual(m.winners, [0]);
  assert.equal(m.turns.at(-1).throws.length, 2, 'Aufnahme endet mit dem Siegdart');
});

test('Cricket: alles zu, aber hinten in Punkten → noch kein Sieg', () => {
  const m = mk();
  turn(m, [0, 1], [0, 1], [0, 1]);
  turn(m, [20, 3], [20, 3], [20, 3]);     // b: 120 Punkte
  for (const n of [20, 19, 18, 17, 16, 15]) { turn(m, [n, 3], [0, 1], [0, 1]); turn(m, [0, 1], [0, 1], [0, 1]); }
  const r = turn(m, [25, 2], [25, 1], [0, 1]);
  assert.notEqual(r.type, 'match');
  assert.equal(m.done, false);
});

test('Cricket: Modus „Nur Schließen“ und Rundenlimit', () => {
  const m = mk('close');
  turn(m, [20, 3], [20, 3], [20, 3]);
  assert.equal(C.score(m, 0), 0, 'keine Punkte im Schließ-Modus');
  const r2 = mk('points', 2);
  turn(r2, [20, 3], [20, 1], [0, 1]); turn(r2, [19, 1], [0, 1], [0, 1]);
  turn(r2, [0, 1], [0, 1], [0, 1]); const r = turn(r2, [0, 1], [0, 1], [0, 1]);
  assert.equal(r.type, 'match'); assert.deepEqual(r2.winners, [0], '20 Punkte gewinnen nach 2 Runden');
});

test('Cricket: Undo nimmt Dart für Dart zurück', () => {
  const m = mk();
  turn(m, [20, 3], [19, 3], [18, 3]);
  assert.equal(m.turns.length, 1);
  C.undo(m);
  assert.equal(m.turns.length, 0); assert.equal(m.pending.length, 2);
  C.undo(m); C.undo(m);
  assert.equal(m.pending.length, 0);
  assert.equal(C.undo(m), false);
});

test('Cricket: Bot-Simulation spielt ein Spiel zu Ende', () => {
  const r = rng(3);
  for (const mode of ['points', 'close']) {
    const m = mk(mode);
    for (let g = 0; !m.done && g < 500; g++) { const d = throwAt(C.aim(m), 18, r); const res = C.throwDart(m, d.n, d.m); assert.notEqual(res.type, 'error'); }
    assert.equal(m.done, true);
    assert.ok(m.winners.length >= 1);
  }
});
