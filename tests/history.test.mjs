import assert from 'node:assert/strict';
import { createMatch } from '../js/match.js';
import * as X from '../js/x01.js';
import * as G from '../js/party.js';
import { overview, fullStats } from '../js/stats.js';
import { historyRows, deleteMatch, resultText } from '../js/history.js';

/* a gegen b, 501, 1 Leg: a 180, 180, T20 T19 D12 → a gewinnt (Ø 167) */
function x01(now) {
  const m = createMatch('x01', [['a'], ['b']], { start: 501, out: 'double', mode: 'legs', target: 1 }, 0, now);
  X.submitSum(m, 180); X.submitSum(m, 60); X.submitSum(m, 180); X.submitSum(m, 60);
  X.throwDart(m, 20, 3); X.throwDart(m, 19, 3); X.throwDart(m, 12, 2);
  m.endedAt = now;
  return m;
}
function highscore(now) {
  const m = createMatch('highscore', [['a'], ['b']], { rounds: 1 }, 0, now);
  G.submit(m, 60); G.submit(m, 100);
  m.endedAt = now;
  return m;
}

test('Historie: alle Modi, neueste zuerst, Ergebnis aus Sicht des Hauptspielers', () => {
  const ms = [x01(1000), highscore(2000)];
  const rows = historyRows(ms, 'a');
  assert.deepEqual(rows.map((r) => r.game), ['highscore', 'x01']);
  assert.equal(rows[0].outcome, 'loss');
  assert.equal(rows[0].result, '60 : 100 Pkt');
  assert.equal(rows[1].outcome, 'win');
  assert.equal(rows[1].result, '1 : 0 Legs');
  assert.equal(rows[1].avg, 167);
  assert.deepEqual(historyRows(ms, 'a', 'party').map((r) => r.game), ['highscore']);
  assert.equal(historyRows(ms, 'zuschauer')[0].outcome, null);
  assert.equal(resultText(ms[1]), '60 : 100 Pkt');
});

test('Gelöschtes Spiel zählt nicht mehr in der Statistik', () => {
  const keep = x01(1000), gone = x01(2000);
  const S = { matches: [keep, gone, highscore(3000)], current: null };
  assert.equal(overview(S.matches, 'a').matches, 2);
  assert.equal(deleteMatch(S, gone.id), true);
  assert.equal(overview(S.matches, 'a').matches, 1);
  assert.equal(fullStats(S.matches, 'a').counts.t180, 2);
  assert.equal(historyRows(S.matches, 'a').length, 2);
  assert.equal(deleteMatch(S, 'gibtsnicht'), false);
});

test('Löschen räumt den Ergebnis-Screen dieses Spiels ab', () => {
  const m = x01(1000);
  const S = { matches: [JSON.parse(JSON.stringify(m))], current: m };
  deleteMatch(S, m.id);
  assert.equal(S.current, null);
});
