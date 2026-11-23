import assert from 'node:assert/strict';
import { createMatch } from '../js/match.js';
import * as F from '../js/football.js';

const game = (opts = {}) => createMatch('football', [['a'], ['b']], { goal: 16, target: 2, ...opts }, 0);
const turn = (m, ...darts) => darts.map(([n, mult]) => F.throwDart(m, n, mult)).pop();

test('Fußball: gegenüberliegende Tore (16 ↔ 4, 20 ↔ 3, 6 ↔ 11)', () => {
  assert.equal(F.opposite(16), 4); assert.equal(F.opposite(4), 16); assert.equal(F.opposite(20), 3); assert.equal(F.opposite(6), 11);
  const m = game();
  assert.equal(F.goalOf(m, 0), 16); assert.equal(F.goalOf(m, 1), 4);
  assert.equal(F.targetOf(m, 0), 4); assert.equal(F.targetOf(m, 1), 16);
});

test('Fußball: ohne Ball kein Tor, Bull holt den Ball, dann gegnerisches Doppel = Tor', () => {
  const m = game();
  turn(m, [4, 2], [0, 1], [0, 1]);               // a trifft D4 ohne Ball → kein Tor
  assert.deepEqual(F.state(m).goals, [0, 0]); assert.equal(F.state(m).ball, null);
  turn(m, [0, 1], [0, 1], [0, 1]);               // b nichts
  const r1 = F.throwDart(m, 25, 1);              // a: 25 → Ball
  assert.equal(r1.event, 'ball'); assert.equal(F.state(m).ball, 0);
  const r2 = F.throwDart(m, 4, 2);               // a: D4 → Tor, Ball frei
  assert.equal(r2.event, 'goal'); assert.deepEqual(F.state(m).goals, [1, 0]); assert.equal(F.state(m).ball, null);
  F.throwDart(m, 25, 2);                         // a: Bullseye → wieder Ball, Ende der Aufnahme
  assert.equal(F.state(m).ball, 0);
  turn(m, [16, 1], [0, 1], [0, 1]);              // b ohne Ball: S16 zählt nicht
  assert.equal(F.state(m).ball, 0);              // a behält den Ball über die Aufnahme hinaus
  turn(m, [16, 2], [0, 1], [0, 1]);              // a auf eigenes Doppel: kein Tor
  assert.deepEqual(F.state(m).goals, [1, 0]);
  turn(m, [25, 1], [16, 2], [0, 1]);             // b: Ballgewinn, dann D16 = Tor für b
  assert.deepEqual(F.state(m).goals, [1, 1]);
});

test('Fußball: Sieg bei target Toren, Undo nimmt Dart für Dart zurück', () => {
  const m = game({ target: 1 });
  const r = turn(m, [25, 1], [4, 2]);
  assert.equal(r.type, 'match'); assert.deepEqual(m.winners, [0]); assert.equal(m.done, true);
  assert.ok(F.undo(m)); assert.equal(m.done, false); assert.deepEqual(F.state(m).goals, [0, 0]); assert.equal(F.state(m).ball, 0);
  assert.ok(F.undo(m)); assert.equal(F.state(m).ball, null);
});

test('Fußball: Bot zielt ohne Ball aufs Bull, mit Ball aufs gegnerische Doppel', () => {
  const m = game();
  assert.deepEqual(F.aim(m), { n: 25, m: 2 });
  F.throwDart(m, 25, 1);
  assert.deepEqual(F.aim(m), { n: 4, m: 2 });
});
