import assert from 'node:assert/strict';
import { segmentAt, aimPoint, createBulloff, bullNext, bullThrow, bullUndo, evaluateRound, MM } from '../js/bulloff.js';

test('Geometrie: Felder an echten Positionen', () => {
  assert.deepEqual(segmentAt(0, 0), { n: 25, m: 2 });
  assert.deepEqual(segmentAt(0, -10), { n: 25, m: 1 });
  assert.deepEqual(segmentAt(0, -103), { n: 20, m: 3 });
  assert.deepEqual(segmentAt(0, -166), { n: 20, m: 2 });
  assert.deepEqual(segmentAt(0, 166), { n: 3, m: 2 });
  assert.deepEqual(segmentAt(166, 0), { n: 6, m: 2 });
  assert.deepEqual(segmentAt(-130, 0), { n: 11, m: 1 });
  assert.deepEqual(segmentAt(0, -180), { n: 0, m: 1 });
});

test('Geometrie: Zielpunkt liegt im Zielfeld (alle Felder)', () => {
  for (let n = 1; n <= 20; n++) for (const m of [1, 2, 3]) {
    const p = aimPoint({ n, m });
    assert.deepEqual(segmentAt(p.x, p.y), { n, m }, `${m}×${n}`);
  }
  const b = aimPoint({ n: 25, m: 1 });
  assert.deepEqual(segmentAt(b.x, b.y), { n: 25, m: 1 });
});

test('Ausbullen: Nächster am Mittelpunkt gewinnt (geometrisch)', () => {
  const b = createBulloff(3);
  assert.equal(bullNext(b), 0);
  assert.equal(bullThrow(b, 30, 40).type, 'next');   // 50 mm
  assert.equal(bullThrow(b, 0, -20).type, 'next');   // 20 mm
  const r = bullThrow(b, 25, 25);                    // 35,4 mm
  assert.equal(r.type, 'winner');
  assert.equal(b.winner, 1);
  assert.equal(bullNext(b), null);
});

test('Ausbullen: beide im Bull → nur diese werfen nochmal', () => {
  const b = createBulloff(3);
  bullThrow(b, 1, 1); bullThrow(b, 50, 0); const r = bullThrow(b, -3, 2);
  assert.equal(r.type, 'tie');
  assert.deepEqual(r.group, [0, 2]);
  assert.deepEqual(b.contenders, [0, 2]);
  assert.equal(bullNext(b), 0);
  bullThrow(b, 10, 0);
  assert.equal(bullNext(b), 2);
  const r2 = bullThrow(b, 0, 12);
  assert.equal(r2.type, 'tie', 'beide Single Bull → wieder Gleichstand');
  bullThrow(b, 0, 40); const r3 = bullThrow(b, 0, 30);
  assert.equal(r3.type, 'winner'); assert.equal(b.winner, 2);
  assert.equal(b.rounds.length, 3);
});

test('Ausbullen: beide Single Bull trotz unterschiedlichem Abstand = Gleichstand', () => {
  const r = evaluateRound([{ s: 0, x: 7, y: 0 }, { s: 1, x: 0, y: 15 }, { s: 2, x: 40, y: 0 }]);
  assert.deepEqual(r.group, [0, 1]); assert.equal(r.winner, null);
});

test('Ausbullen: exakt gleicher Abstand außerhalb = Gleichstand, Bull schlägt 25', () => {
  assert.deepEqual(evaluateRound([{ s: 0, x: 30, y: 40 }, { s: 1, x: -50, y: 0 }]).group, [0, 1]);
  assert.equal(evaluateRound([{ s: 0, x: 0, y: MM.bull }, { s: 1, x: 0, y: 8 }]).winner, 0);
});

test('Ausbullen: Rückgängig nimmt den letzten bestätigten Dart zurück', () => {
  const b = createBulloff(2);
  bullThrow(b, 5, 5);
  assert.equal(bullUndo(b), true);
  assert.equal(bullNext(b), 0);
  assert.equal(bullUndo(b), false);
});
