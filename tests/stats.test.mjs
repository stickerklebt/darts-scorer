import assert from 'node:assert/strict';
import { createMatch } from '../js/match.js';
import * as X from '../js/x01.js';
import { overview, doubleAttempts, matchesOf } from '../js/stats.js';

const dart = (m, n, mult) => X.throwDart(m, n, mult);

/* Handgerechnetes Match: 501, a gegen b, 1 Leg.
   a: 180, 180, dann 141 per Einzeldart: T20 T19 D12  → 9 Darts, 501 Punkte → Ø 167
   b: 60, 60                                          → 6 Darts, 120 Punkte  → Ø 60 */
function nineDarter(now) {
  const m = createMatch('x01', [['a'], ['b']], { start: 501, out: 'double', mode: 'legs', target: 1 }, 0, now);
  X.submitSum(m, 180); X.submitSum(m, 60); X.submitSum(m, 180); X.submitSum(m, 60);
  dart(m, 20, 3); dart(m, 19, 3); dart(m, 12, 2);
  m.endedAt = now;
  return m;
}

test('Average, Siege, Legs aus gespeicherten Matches', () => {
  const ms = [nineDarter(Date.now())];
  const a = overview(ms, 'a'), b = overview(ms, 'b');
  assert.equal(a.avg, 167); assert.equal(a.darts, 9); assert.equal(a.wins, 1); assert.equal(a.legsWon, 1);
  assert.equal(b.avg, 60); assert.equal(b.wins, 0); assert.equal(b.legsTotal, 1);
});

test('Doppelversuch: S16 bei 32 ist verfehlter Versuch auf D16', () => {
  const m = createMatch('x01', [['a']], { start: 32, out: 'double', mode: 'legs', target: 1 });
  dart(m, 16, 1); dart(m, 8, 1); dart(m, 4, 2);
  m.endedAt = Date.now();
  // Für die Statistik zählen nur 501er – hier direkt die Funktion prüfen
  const d = doubleAttempts([m], 'a');
  assert.equal(d.attempts, 3); assert.equal(d.hits, 1);
  assert.deepEqual(d.fields.D16, { attempts: 1, hits: 0 });
  assert.deepEqual(d.fields.D4, { attempts: 1, hits: 1 });
});

test('Nur 501 zählt, Zeitfilter greift', () => {
  const now = Date.now();
  const old = nineDarter(now - 40 * 864e5);
  const fresh = nineDarter(now);
  const m301 = createMatch('x01', [['a']], { start: 301, out: 'double', mode: 'legs', target: 1 });
  m301.done = true; m301.endedAt = now;
  const all = [old, fresh, m301];
  assert.equal(matchesOf(all, 'a', 'all', now).length, 2);
  assert.equal(matchesOf(all, 'a', '30d', now).length, 1);
  assert.equal(overview(all, 'a', '7d', now).matches, 1);
});

test('Team: Statistik pro Werfer, Sieg für alle Mitglieder', () => {
  const m = createMatch('x01', [['t1', 't2'], ['solo']], { start: 501, out: 'double', mode: 'legs', target: 1 });
  // t1 180, solo 0, t2 180, solo 0, t1 141 (T20 T19 D12)
  X.submitSum(m, 180); X.submitSum(m, 0); X.submitSum(m, 180); X.submitSum(m, 0);
  dart(m, 20, 3); dart(m, 19, 3); dart(m, 12, 2);
  m.endedAt = Date.now();
  const t1 = overview([m], 't1'), t2 = overview([m], 't2'), solo = overview([m], 'solo');
  assert.equal(t1.darts, 6); assert.equal(t1.points, 321);
  assert.equal(t2.darts, 3); assert.equal(t2.avg, 180);
  assert.equal(t1.wins, 1); assert.equal(t2.wins, 1); assert.equal(solo.wins, 0);
});

import { fullStats, movingAvg } from '../js/stats.js';

/* Zwei handgerechnete 501-Matches für 'a' gegen 'b' (je 1 Leg):
   M1 (a gewinnt): a 180,180, Checkout 141 = T20 T19 D12 (9 Darter); b 60,60
   M2 (b gewinnt): a 100 (start), b 180; a 26 ; b 180 ; a Bust aus 375? – hier einfacher:
       b checkt: a 100, b 180, a 26, b 180, a 45, b 141 (T20 T19 D12) */
function m2(now) {
  const m = createMatch('x01', [['a'], ['b']], { start: 501, out: 'double', mode: 'legs', target: 1 }, 0, now);
  X.submitSum(m, 100); X.submitSum(m, 180); X.submitSum(m, 26); X.submitSum(m, 180); X.submitSum(m, 45);
  dart(m, 20, 3); dart(m, 19, 3); dart(m, 12, 2);
  m.endedAt = now;
  return m;
}

test('fullStats: Überblick, Serie, Scoring, Checkout, Legs', () => {
  const now = Date.now();
  const ms = [nineDarter(now - 2000), m2(now - 1000)];
  const a = fullStats(ms, 'a', 'all', now);
  assert.equal(a.matches, 2); assert.equal(a.wins, 1); assert.equal(a.winRate, 0.5); assert.equal(a.bestStreak, 1);
  assert.equal(a.points, 501 + 171); assert.equal(a.darts, 18);
  assert.equal(a.bestMatchAvg, 167);
  assert.equal(a.counts.t180, 2); assert.equal(a.counts.t140, 1); assert.equal(a.counts.t100, 1);
  assert.deepEqual(a.top5.map((t) => t.score), [180, 180, 141, 100, 45]);
  assert.equal(a.highestCo, 141); assert.equal(a.nine, 1); assert.equal(a.bestLeg, 9);
  assert.equal(a.favourite.field, 'D12');
  // Checkout-Chance: a hatte in M1 141 Rest (101–170) und checkte; in M2 keine checkbare Aufnahme
  assert.deepEqual(a.ranges.map((r) => [r.chances, r.hits]), [[0, 0], [0, 0], [1, 1]]);
  assert.equal(a.dartsPerCheckout, 1);
  assert.equal(a.list[0].won, false); // neueste zuerst
  assert.equal(a.list[0].result, '0 : 1 Legs');
  const b = fullStats(ms, 'b', 'all', now);
  assert.equal(b.wins, 1); assert.equal(b.bestStreak, 1);
  assert.equal(b.buckets[7], 2); // zwei 180er
});

test('movingAvg überspringt Lücken', () => {
  assert.deepEqual(movingAvg([10, null, 20, 30], 2), [10, 10, 20, 25]);
});
