import assert from 'node:assert/strict';
import { route, label, val, isDouble, BOGEYS, ALL_DARTS, setupFor, targetFor, isDoubleAttempt } from '../js/checkout.js';

const show = (r) => (r ? r.map(label).join(' ') : null);

test('Pflicht-Testfälle (3 Darts übrig)', () => {
  const cases = {
    170: 'T20 T20 Bull', 167: 'T20 T19 Bull', 164: 'T20 T18 Bull', 161: 'T20 T17 Bull',
    160: 'T20 T20 D20', 141: 'T20 T19 D12', 137: 'T20 T15 D16', 135: '25 T20 Bull', 110: 'T20 S10 D20', 82: 'Bull D16', 100: 'T20 D20',
    64: 'T16 D8', 40: 'D20', 32: 'D16',
  };
  for (const [n, exp] of Object.entries(cases)) assert.equal(show(route(Number(n), 3)), exp, `Rest ${n}`);
});

// Brute force: Ist `rem` mit höchstens k Darts auf Doppel checkbar?
const dbl = ALL_DARTS.filter(isDouble);
function checkable(rem, k) {
  const vals = [0, ...new Set(ALL_DARTS.map(val))];
  const pre = k === 1 ? [0] : k === 2 ? vals : vals.flatMap((a) => vals.map((b) => a + b));
  return dbl.some((d) => pre.includes(rem - val(d)));
}

test('Jede Zahl 2–170 × 1/2/3 Darts: Summe, Doppel am Ende, Anzahl Darts', () => {
  for (let n = 2; n <= 170; n++) {
    for (let k = 1; k <= 3; k++) {
      const r = route(n, k);
      if (r) {
        assert.equal(r.reduce((a, d) => a + val(d), 0), n, `Summe bei ${n}/${k}: ${show(r)}`);
        assert.ok(isDouble(r[r.length - 1]), `Letzter Dart kein Doppel bei ${n}/${k}: ${show(r)}`);
        assert.ok(r.length <= k, `Zu viele Darts bei ${n}/${k}: ${show(r)}`);
      }
      assert.equal(!!r, checkable(n, k), `Tabelle unvollständig/zu viel bei ${n} mit ${k} Darts`);
    }
  }
});

test('Bogeys haben keinen Weg, aber einen Setup-Wurf', () => {
  for (const b of BOGEYS) {
    assert.equal(route(b, 3), null);
    const s = setupFor(b, 3);
    assert.ok(s && s.leave >= 2 && route(s.leave, 3), `Setup bei ${b}`);
  }
});

test('Keine Mini-Doppel (D1–D3), wenn es eine Alternative gibt', () => {
  for (let n = 2; n <= 170; n++) {
    const r = route(n, 3);
    if (!r) continue;
    const last = r[r.length - 1];
    if (last.n <= 3) assert.ok(n <= 7, `${n}: ${show(r)}`);
  }
});

test('Ziel eines Darts', () => {
  assert.equal(label(targetFor(32, 3)), 'D16');
  assert.equal(label(targetFor(137, 3)), 'T20');
  assert.equal(label(targetFor(50, 1)), 'Bull');
  assert.equal(label(targetFor(41, 1)), 'S1'); // Setup auf 40
  assert.ok(isDoubleAttempt(32) && isDoubleAttempt(50) && !isDoubleAttempt(33) && !isDoubleAttempt(42));
});

test('Summen-Eingabe: ohne OK übernehmen, wenn keine Ziffer mehr folgen kann', async () => {
  const { entryDone, entryPossible } = await import('../js/checkout.js');
  for (const s of ['43', '19', '100', '140', '180', '26', '0', '99']) assert.equal(entryDone(s), true, s);
  for (const s of ['', '1', '4', '9', '18', '17', '16', '10', '12']) assert.equal(entryDone(s), false, s);
  assert.equal(entryPossible('179'), false);
  assert.equal(entryPossible('17'), true);
  assert.equal(entryPossible('163'), false);
  assert.equal(entryPossible('160'), true);
});

test('Dartcoach-Tabelle: mit 2 Darts geht 110 noch übers Bull', () => {
  assert.equal(show(route(110, 2)), 'T20 Bull');
  assert.equal(show(route(82, 2)), 'Bull D16');
});
