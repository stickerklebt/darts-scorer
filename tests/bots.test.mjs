import assert from 'node:assert/strict';
import { createMatch } from '../js/match.js';
import * as X from '../js/x01.js';
import * as G from '../js/party.js';
import { BOTS } from '../js/bots.js';
import { rng, throwAt, x01Aim, x01BotDart, partyValue, partyTurnDone, partyBotDart } from '../js/botsim.js';
import { simAverage } from '../tools/calibrate-bots.mjs';

test('Bots: drei feste Bots mit unterschiedlichem Average zwischen 40 und 45', () => {
  assert.deepEqual(BOTS.map((b) => b.name), ['Sensei Wu', 'Super Mario', 'Shrek']);
  const avgs = BOTS.map((b) => b.avg);
  assert.equal(new Set(avgs).size, 3);
  for (const a of avgs) assert.ok(a >= 40 && a <= 45);
  for (const b of BOTS) for (const k of ['start', 'good', 'oppBust', 'win', 'lose']) assert.ok(b.lines[k].length >= 2, `${b.name} ${k}`);
  for (const b of BOTS) assert.ok(Object.values(b.lines).flat().length >= 15, `${b.name}: mind. 15 Sprüche`);
});

test('Bots: Kalibrierung – Average über viele Legs = Ziel ± 1 (Simulation)', () => {
  for (const b of BOTS) {
    const avg = simAverage(b.sigma, 2500, 2024);
    assert.ok(Math.abs(avg - b.avg) <= 1, `${b.name}: ${avg.toFixed(2)} statt ${b.avg}`);
  }
});

test('Bots: zielen wie ein Spieler (T20, im Finish nach Tabelle)', () => {
  assert.deepEqual(x01Aim(501, 3), { n: 20, m: 3 });
  assert.deepEqual(x01Aim(100, 3), { n: 20, m: 3 });
  assert.deepEqual(x01Aim(40, 1), { n: 20, m: 2 });
  assert.deepEqual(x01Aim(50, 1), { n: 25, m: 2 });
  assert.deepEqual(x01Aim(64, 3), { n: 16, m: 3 });
  // Ohne Streuung trifft der Bot genau das Ziel
  assert.deepEqual((({ n, m }) => ({ n, m }))(throwAt({ n: 19, m: 3 }, 0)), { n: 19, m: 3 });
});

test('Bots: Würfe werden als echte throws gespeichert (Undo funktioniert)', () => {
  const m = createMatch('x01', [['sensei-wu']], { start: 501, out: 'double', mode: 'legs', target: 1 });
  const r = rng(5);
  for (let i = 0; i < 3; i++) { const d = x01BotDart(m, 18, r); X.throwDart(m, d.n, d.m, { any: true }); }
  const t = X.leg(m).turns[0];
  assert.equal(t.input, 'darts');
  assert.equal(t.throws.length, 3);
  for (const th of t.throws) assert.deepEqual(Object.keys(th).sort(), ['before', 'm', 'n', 'target']);
  X.undo(m);
  assert.equal(X.leg(m).turns.length, 0);
  assert.equal(m.pending.length, 2);
});

test('Bots: Partyspiele – Wertung wie bei menschlicher Eingabe', () => {
  const m = createMatch('shanghai', [['shrek'], ['p']], { rounds: 7 });
  assert.equal(partyValue(m, 0, [{ n: 1, m: 3 }, { n: 20, m: 1 }, { n: 1, m: 1 }]), 4);
  const a = createMatch('atc', [['shrek']], { bull: 1 });
  assert.equal(partyValue(a, 0, [{ n: 1, m: 1 }, { n: 3, m: 1 }, { n: 2, m: 2 }]), 2);
  const h = createMatch('halveit', [['shrek']], {});
  assert.equal(partyValue(h, 0, [{ n: 15, m: 3 }, { n: 15, m: 1 }, { n: 20, m: 3 }]), 60);
  // Eine Bot-Aufnahme ist immer gültig
  const r = rng(9);
  for (const game of ['highscore', 'shanghai', 'halveit', 'atc']) {
    const mm = createMatch(game, [['shrek'], ['p']], { rounds: 5, bull: 1 });
    for (let k = 0; k < 6 && !mm.done; k++) {
      const darts = [];
      while (!partyTurnDone(mm, G.curSide(mm), darts)) darts.push(partyBotDart(mm, G.curSide(mm), darts, 19, r));
      const res = G.submit(mm, partyValue(mm, G.curSide(mm), darts));
      assert.notEqual(res.type, 'error', `${game}: ${res.msg}`);
    }
  }
});
