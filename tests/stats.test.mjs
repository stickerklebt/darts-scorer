import assert from 'node:assert/strict';
import { createMatch } from '../js/match.js';
import * as X from '../js/x01.js';
import { overview, doubleAttempts, matchesOf, legDetail, doubleMisses, finishOdds } from '../js/stats.js';

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
  // Checkout-Chance: a hatte in M1 141 Rest (141–160) und checkte; in M2 keine checkbare Aufnahme
  assert.deepEqual(a.ranges.map((r) => [r.chances, r.hits]), [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [1, 1], [0, 0]]);
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

import { doubleTier, doubleRating } from '../js/stats.js';
test('Doppelfarben relativ zur eigenen Gesamtquote', () => {
  // Gesamtquote 5 %, D4 mit 8 % (2/25) → deutlich besser (grün)
  assert.equal(doubleTier(2, 25, 0.05), 'great');
  assert.equal(doubleTier(1, 20, 0.05), 'avg');       // 5 % ≈ eigene Quote → gold
  assert.equal(doubleTier(1, 16, 0.05), 'good');      // 6,25 % → 1,25× → hellgrün
  assert.equal(doubleTier(1, 30, 0.05), 'weak');      // 3,3 % → 0,67×
  assert.equal(doubleTier(0, 12, 0.05), 'bad');       // 0 % → rot
  assert.equal(doubleTier(4, 10, 0.4), 'avg', 'feste 40-%-Grenze gilt nicht mehr');
  assert.equal(doubleTier(3, 9, 0.05), null, 'unter 10 Versuchen: keine Farbe');
  assert.equal(doubleTier(0, 12, 0), 'avg', 'Gesamtquote 0 und Feld 0 → wie die eigene Quote');
});

test('Doppel: die 3 besten werden markiert, zu wenige Versuche nie', () => {
  const r = doubleRating({ rate: 0.1, fields: {
    D20: { attempts: 20, hits: 2 }, D16: { attempts: 10, hits: 3 }, D8: { attempts: 12, hits: 2 },
    D10: { attempts: 10, hits: 2 }, D1: { attempts: 2, hits: 2 }, D5: { attempts: 9, hits: 0 },
  } });
  assert.equal(r.D16.top, 1); assert.equal(r.D10.top, 2); assert.equal(r.D8.top, 3);
  assert.equal(r.D20.top, null);
  assert.equal(r.D1.top, null); assert.equal(r.D1.tier, null);
  assert.equal(r.D5.top, null); assert.equal(r.D5.tier, null); // 9 Versuche: noch nicht bewertet
});

import { quickScores } from '../js/stats.js';
test('Schnellwahl: erst ab 30 Summen-Aufnahmen, dann 8 häufigste nach Wert sortiert', () => {
  const mk = (scores, extra = {}) => ({ id: 'q' + Math.random(), game: 'x01', legs: [{ turns: scores.map((sc) => ({ pid: 'a', input: 'sum', score: sc, ...extra })) }] });
  const few = mk(Array(29).fill(60));
  assert.deepEqual(quickScores([few], 'a'), []);
  const scores = [...Array(9).fill(60), ...Array(6).fill(45), ...Array(5).fill(100), ...Array(4).fill(26), ...Array(3).fill(41), ...Array(2).fill(81), 140, 85, 180, 22, 11];
  const m = mk(scores);
  assert.equal(scores.length, 34);
  // 60×9, 45×6, 100×5, 26×4, 41×3, 81×2, dann Gleichstand (je 1×) → höhere Werte zuerst: 180, 140
  assert.deepEqual(quickScores([m], 'a'), [26, 41, 45, 60, 81, 100, 140, 180]);
  // Busts, Einzeldart-Aufnahmen und andere Spieler zählen nicht
  const busts = mk(Array(40).fill(0), { bust: true });
  assert.deepEqual(quickScores([busts], 'a'), []);
  const darts = { id: 'd', game: 'x01', legs: [{ turns: Array(40).fill({ pid: 'a', input: 'darts', score: 60 }) }] };
  assert.deepEqual(quickScores([darts], 'a'), []);
  assert.deepEqual(quickScores([m], 'b'), []);
  // Highscore zählt mit, laufendes Match zählt mit
  const hs = { id: 'h', game: 'highscore', turns: Array(30).fill({ pid: 'b', v: 100 }) };
  assert.deepEqual(quickScores([], 'b', hs), [100]);
});

test('Schnellwahl: nur die letzten 50 Aufnahmen, Checkout-Bereich (Rest ≤ 170) zählt nicht', () => {
  const turns = (sc, n, startRem = 501) => Array.from({ length: n }, () => ({ pid: 'a', input: 'sum', score: sc, startRem }));
  const old = { id: 'o', game: 'x01', startedAt: 1, legs: [{ turns: turns(100, 60) }] };          // alt: 60× 100
  const neu = { id: 'n', game: 'x01', startedAt: 2, legs: [{ turns: turns(45, 50) }] };           // neu: 50× 45
  assert.deepEqual(quickScores([old, neu], 'a'), [45]);                                           // 100 fällt aus dem Fenster
  const co = { id: 'c', game: 'x01', startedAt: 3, legs: [{ turns: turns(26, 40, 150) }] };      // im Checkout-Bereich
  assert.deepEqual(quickScores([neu, co], 'a'), [45]);
  assert.deepEqual(quickScores([co], 'a'), []);
});

test('legDetail: Aufnahmen, geworfene Darts und Kennzahlen eines Legs', () => {
  const m = nineDarter(Date.now());
  const d = legDetail(m, 0, 'a');
  assert.equal(d.no, 1); assert.equal(d.winner, 0); assert.equal(d.sides[0].s, 0);
  const a = d.sides[0], b = d.sides[1];
  assert.equal(a.turns.length, 3); assert.equal(a.darts, 9); assert.equal(a.avg, 167); assert.equal(a.t180, 2);
  assert.equal(a.high, 180); assert.equal(a.checkout, 141); assert.equal(a.f9, 167);
  assert.deepEqual(a.turns[2].throws, ['T20', 'T19', 'D12']); assert.equal(a.turns[2].rest, 0); assert.equal(a.turns[2].out, true);
  assert.equal(a.turns[0].throws, null); assert.equal(a.turns[0].rest, 321);
  assert.equal(b.avg, 60); assert.equal(b.turns.length, 2);
  assert.equal(legDetail(m, 5, 'a'), null);
  // Aus Sicht des Gegners steht dessen Seite zuerst
  assert.equal(legDetail(m, 0, 'b').sides[0].s, 1);
});

test('fullStats: Verweise auf Rekord-Leg, besten Average, höchste Aufnahme und Checkout', () => {
  const m = nineDarter(Date.now());
  const st = fullStats([m], 'a');
  assert.deepEqual(st.bestLegRef, { mid: m.id, li: 0 });
  assert.deepEqual(st.bestAvgRef, { mid: m.id });
  assert.equal(st.top5[0].mid, m.id); assert.equal(st.top5[0].li, 0); assert.equal(m.legs[0].turns[st.top5[0].ti].score, 180);
  assert.equal(st.topCo[0].mid, m.id); assert.equal(m.legs[0].turns[st.topCo[0].ti].out, true);
});

test('Doppel antippen: häufigste Fehlwürfe, auch Busts (S1/D20 auf D1)', () => {
  const m = createMatch('x01', [['a']], { start: 2, out: 'double', mode: 'legs', target: 1 });
  dart(m, 1, 1);                       // Rest 2 → S1 = Bust (Versuch auf D1)
  dart(m, 20, 2);                      // D20 = Bust
  dart(m, 0, 1); dart(m, 0, 1); dart(m, 1, 2); // daneben, daneben, D1 Check
  const d = doubleAttempts([m], 'a');
  assert.deepEqual(d.fields.D1, { attempts: 5, hits: 1 });
  assert.deepEqual(doubleMisses(d, 'D1').map((x) => [x.field, x.count]), [['Miss', 2], ['D20', 1], ['S1', 1]]);
  assert.equal(doubleMisses(d, 'D1')[0].rate, 0.4);
});

test('Doppel: Fehlwürfe inside (ins Board) gegen outside (daneben)', async () => {
  const { doubleSides } = await import('../js/stats.js');
  const d = { fields: { D16: { attempts: 10, hits: 2 } }, outcomes: { D16: { D16: 2, S16: 4, S8: 1, Miss: 3 } } };
  assert.deepEqual(doubleSides(d, 'D16'), { misses: 8, inside: 5, outside: 3, insideRate: 5 / 8, outsideRate: 3 / 8 });
});

test('Statistik-Modi: Standard nur 501, weitere X01-Modi zuschaltbar', async () => {
  const S = await import('../js/stats.js');
  const mk = (start, extra = {}) => ({ game: 'x01', done: true, playerIds: ['p'], endedAt: Date.now(), opts: { start, out: 'double', ...extra }, legs: [] });
  const ms = [mk(501), mk(301), mk(301, { in: 'double' }), { game: 'cricket', done: true, playerIds: ['p'], opts: {} }];
  S.setStatsModes(null);
  assert.equal(S.matchesOf(ms, 'p').length, 1);
  assert.deepEqual(S.availableModes(ms, 'p'), ['301', '301-di', '501']);
  S.setStatsModes(['501', '301']);
  assert.equal(S.matchesOf(ms, 'p').length, 2);
  assert.equal(S.modeLabel('301-di'), '301 · Double In');
  S.setStatsModes(null);
});

test('High Finish: Dart getroffen, solange das Finish danach noch geht', () => {
  const m = createMatch('x01', [['a']], { start: 142, out: 'double', mode: 'legs', target: 3 });
  dart(m, 20, 3); dart(m, 14, 3); dart(m, 20, 2);          // 142: T20 (82 bleibt) · T14 · D20 → alle drei getroffen
  dart(m, 20, 1); dart(m, 20, 3); dart(m, 0, 1);           // 142: S20 → 122 mit 2 Darts unmöglich → nur Dart 1 versucht
  const n = createMatch('x01', [['a']], { start: 105, out: 'double', mode: 'legs', target: 1 });
  dart(n, 5, 1); dart(n, 20, 3); dart(n, 20, 1);           // 105: S5 → 100 (geht) · T20 → 40 (geht) · S20 verfehlt
  const r = finishOdds([m, n], 'a');
  assert.deepEqual(r.map((x) => x.tries), [3, 2, 2]);
  assert.deepEqual(r.map((x) => x.hits), [2, 2, 1]);
  assert.equal(r[2].rate, 0.5);
  const s = createMatch('x01', [['a']], { start: 169, out: 'double', mode: 'legs', target: 1 });
  dart(s, 20, 3); dart(s, 20, 3); dart(s, 20, 3);          // 169 ist kein Finish → zählt nicht
  assert.equal(finishOdds([s], 'a')[0].tries, 0);
});

test('2-Dart-Finish: ab Rest 61, 1. Dart getroffen wenn mit einem Dart noch checkbar', () => {
  const m = createMatch('x01', [['a']], { start: 80, out: 'double', mode: 'legs', target: 2 });
  dart(m, 20, 3); dart(m, 10, 2);                          // 80: T20 · D10 → beide getroffen
  dart(m, 20, 1); dart(m, 0, 1); dart(m, 0, 1);            // 80: S20 → 60 mit einem Dart nicht checkbar
  const r = finishOdds([m], 'a', 2);
  assert.deepEqual(r.map((x) => x.tries), [2, 1]);
  assert.deepEqual(r.map((x) => x.hits), [1, 1]);
});

test('Break, zuerst im Finish, Comeback, Triple im Finish, Versuche bis zum Doppel', async () => {
  const { finishExtras, doubleTriesToHit } = await import('../js/stats.js');
  const m = createMatch('x01', [['a'], ['b']], { start: 301, out: 'double', mode: 'legs', target: 2 }, 1); // b fängt an
  X.submitSum(m, 60); X.submitSum(m, 140);                 // b 241 · a 161 → a zuerst im Finish
  X.submitSum(m, 60);                                       // b 181
  dart(m, 20, 3); dart(m, 17, 3); dart(m, 25, 2);           // a: 161 → T20 T17 Bull = Leg gegen den Anwurf (Break)
  const r = finishExtras([m], 'a');
  assert.equal(r.triple.k, 'T20');
  assert.deepEqual([r.brk.tries, r.brk.hits], [1, 1]);
  assert.deepEqual([r.first.tries, r.first.hits, r.comeback.tries], [1, 1, 0]);
  const n = createMatch('x01', [['a']], { start: 32, out: 'double', mode: 'legs', target: 1 });
  dart(n, 16, 1); dart(n, 8, 1); dart(n, 4, 2);             // D16 1×, D8 1×, D4 getroffen beim 1. Versuch
  assert.deepEqual(doubleTriesToHit([n], 'a', 'D4'), [1]);
  assert.deepEqual(doubleTriesToHit([n], 'a', 'D16'), []);
});
