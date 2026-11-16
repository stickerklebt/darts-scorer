import assert from 'node:assert/strict';
import { createMatch } from '../js/match.js';
import * as G from '../js/party.js';

test('Halbieren: verfehlt halbiert, falsche Werte abgelehnt', () => {
  const m = createMatch('halveit', [['a'], ['b']], {});
  assert.equal(G.submit(m, 45).type, 'turn');     // a: 40+45 = 85
  assert.equal(G.submit(m, 0).type, 'halved');    // b: 40 → 20
  assert.equal(G.submit(m, 17).type, 'error');    // Runde 2 = 16
  assert.deepEqual([G.score(m, 0), G.score(m, 1)], [85, 20]);
});

test('Shanghai: nur Vielfache des Ziels, Ende nach allen Runden', () => {
  const m = createMatch('shanghai', [['a']], { rounds: 2 });
  assert.equal(G.submit(m, 4).type, 'turn');
  assert.equal(G.submit(m, 3).type, 'error');
  assert.equal(G.submit(m, 6).type, 'match');
  assert.equal(G.score(m, 0), 10);
});

test('Around the Clock mit Team: Treffer zählen fürs Team', () => {
  const m = createMatch('atc', [['a', 'b'], ['c']], { bull: 0 });
  const throwers = [];
  for (let i = 0; i < 13; i++) { throwers.push(G.curThrower(m)); const hits = G.curSide(m) === 0 ? Math.min(3, G.atcTotal(m) - G.atcPos(m, 0)) : 0; if (G.submit(m, hits).type === 'match') break; }
  assert.equal(G.submit(m, 0).type, 'error'); // nach dem Ende keine Eingabe mehr
  assert.deepEqual(m.winners, [0]);
  assert.deepEqual(throwers.slice(0, 4), ['a', 'c', 'b', 'c']);
  assert.equal(G.atcPos(m, 0), 20);
});
