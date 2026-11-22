import assert from 'node:assert/strict';
import { CHALLENGES, LEVELS, draw, start, toMatch, left, allDone, DURATION } from '../js/bruch.js';
import { resultText } from '../js/history.js';

test('Bruchchallenge: 100 Herausforderungen, je Level 25, eindeutige ids', () => {
  assert.equal(CHALLENGES.length, 100);
  for (const l of LEVELS) assert.equal(CHALLENGES.filter((c) => c.level === l.id).length, 25);
  assert.equal(new Set(CHALLENGES.map((c) => c.id)).size, 100);
  assert.equal(new Set(CHALLENGES.map((c) => c.text)).size, 100);
});

test('Bruchchallenge: 3 verschiedene aus dem Level, 1 Stunde, als Match gespeichert', () => {
  for (let k = 0; k < 50; k++) {
    const ids = draw(3);
    assert.equal(new Set(ids).size, 3);
    assert.ok(ids.every((id) => CHALLENGES.find((c) => c.id === id).level === 3));
  }
  const b = start(2, 1000);
  assert.equal(left(b, 1000), DURATION);
  b.done = [true, false, true];
  assert.equal(allDone(b), false);
  const m = toMatch(b, 'pa', 5000);
  assert.deepEqual(m.winners, []);
  assert.equal(resultText(m), '2 / 3 geschafft');
  b.done[1] = true;
  assert.deepEqual(toMatch(b, 'pa', 5000).winners, [0]);
  assert.equal(toMatch(b, 'pa', 1000 + DURATION + 99).endedAt, 1000 + DURATION);
});
