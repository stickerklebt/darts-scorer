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
