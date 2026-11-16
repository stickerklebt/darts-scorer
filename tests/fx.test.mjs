import assert from 'node:assert/strict';
import { POOLS, scorePool, finishPool, poolFor, pickAnim } from '../js/fx.js';

test('Animation: Zuordnung Aufnahme → Topf', () => {
  assert.equal(scorePool(26), 'breakfast');
  assert.equal(scorePool(60), 'triangle');
  assert.equal(scorePool(99), null);
  assert.equal(scorePool(100), 's100');
  assert.equal(scorePool(120), 's100');
  assert.equal(scorePool(121), 's121');
  assert.equal(scorePool(179), 's121');
  assert.equal(scorePool(180), 's180');
  assert.equal(scorePool(45), null);
});

test('Animation: Zuordnung Finish → Topf, 170 nur beim Checkout', () => {
  assert.equal(finishPool(2), 'f2'); assert.equal(finishPool(60), 'f2');
  assert.equal(finishPool(61), 'f61'); assert.equal(finishPool(99), 'f61');
  assert.equal(finishPool(100), 'f100'); assert.equal(finishPool(167), 'f100');
  assert.equal(finishPool(170), 'f170');
  assert.equal(poolFor('x01', { score: 170 }), 's121', '170 geworfen (kein Finish) → normaler 121–179-Topf');
  assert.equal(poolFor('x01', { score: 170, out: true }), 'f170');
  assert.equal(poolFor('x01', { score: 140, bust: true }), null, 'Busts nie');
  assert.equal(poolFor('highscore', { v: 180 }), 's180');
  assert.equal(poolFor('shanghai', { v: 180 }), null);
});

test('Animation: nie zweimal hintereinander dieselbe', () => {
  let last = null;
  for (let i = 0; i < 500; i++) {
    const a = pickAnim('s121', last);
    assert.notEqual(a, last);
    last = a;
  }
  assert.equal(pickAnim('s180', 'lootbox'), 'lootbox', 'Topf mit nur einer Animation');
});

test('Animation: zufällig und gleich häufig', () => {
  // deterministischer Zufall
  let seed = 42;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const count = Object.fromEntries(POOLS.s100.map((a) => [a, 0]));
  let last = null;
  const N = 20000;
  for (let i = 0; i < N; i++) { last = pickAnim('s100', last, rnd); count[last]++; }
  for (const a of POOLS.s100) assert.ok(Math.abs(count[a] / N - 0.2) < 0.02, `${a}: ${count[a]}`);
});
