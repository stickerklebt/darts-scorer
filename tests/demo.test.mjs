import assert from 'node:assert/strict';
import { generateDemo, seedDemo, removeDemo } from '../js/demo.js';
import { overview, doubleAttempts, fullStats } from '../js/stats.js';
import { val } from '../js/checkout.js';

const NOW = Date.UTC(2026, 10, 16, 12);
const demo = generateDemo({ mainId: 'me', now: NOW });

test('Testdaten: deterministisch (fester Seed)', () => {
  assert.equal(JSON.stringify(generateDemo({ mainId: 'me', now: NOW })), JSON.stringify(demo));
});

test('Testdaten: ~60 Matches (501) über die letzten 3 Monate + Partyspiele, alle markiert', () => {
  const x = demo.matches.filter((m) => m.game === 'x01');
  assert.equal(x.length, 60);
  assert.ok(demo.matches.length > 60, 'zusätzlich Partyspiele');
  for (const m of demo.matches) {
    assert.equal(m.demo, true); assert.equal(m.done, true);
    assert.ok(NOW - m.endedAt <= 92 * 864e5 && m.endedAt <= NOW + 36e5);
  }
  assert.ok(x.some((m) => NOW - m.endedAt < 7 * 864e5), 'auch Matches in den letzten 7 Tagen');
  assert.deepEqual(demo.profiles.map((p) => p.name), ['Test-Tim', 'Test-Ben']);
  assert.ok(demo.profiles.every((p) => p.demo));
});

test('Testdaten: gültige Matches (Summen, Checkouts, Einzeldarts)', () => {
  for (const m of demo.matches.filter((x) => x.game === 'x01')) {
    for (const l of m.legs) {
      if (l.winner === undefined) continue;
      const won = l.turns.filter((t) => t.s === l.winner).reduce((a, t) => a + t.score, 0);
      assert.equal(won, 501, 'Gewinner spielt genau 501 herunter');
      for (const t of l.turns) {
        if (t.bust) assert.equal(t.score, 0);
        if (t.input === 'darts') {
          assert.equal(t.throws[0].before, t.startRem);
          for (let i = 1; i < t.throws.length; i++) assert.equal(t.throws[i].before, t.throws[i - 1].before - val(t.throws[i - 1]));
          if (!t.bust) assert.equal(t.throws.reduce((a, d) => a + val(d), 0), t.score);
        } else assert.ok(t.startRem > 170, 'Summen nur über 170 Rest');
        if (t.out) { const last = t.throws.at(-1); assert.equal(last.m, 2, 'Checkout auf ein Doppel'); }
      }
    }
  }
});

test('Testdaten: realistische Averages (35–50), Doppelversuche, verschiedene Lieblingsdoppel', () => {
  const favs = new Set();
  for (const pid of ['me', 'p_demo_tim', 'p_demo_ben']) {
    const o = overview(demo.matches, pid, 'all', NOW);
    assert.ok(o.avg >= 35 && o.avg <= 50, `${pid}: Ø ${o.avg.toFixed(1)}`);
    assert.ok(doubleAttempts(demo.matches.filter((m) => m.game === 'x01'), pid).attempts > 50);
    const st = fullStats(demo.matches, pid, 'all', NOW);
    assert.ok(st.counts.t100 > 0 && st.bustRate > 0);
    favs.add(st.favourite.field);
  }
  assert.ok(favs.size >= 2, `Lieblingsdoppel: ${[...favs]}`);
});

test('Testdaten: einmalig einfügen, gezielt entfernen (echte Daten bleiben)', () => {
  const S = { mainId: 'me', profiles: [{ id: 'me', name: 'Lasse' }], matches: [{ id: 'real', game: 'x01' }], lineup: [], current: null };
  assert.equal(seedDemo(S, NOW), true);
  const n = S.matches.length;
  assert.equal(seedDemo(S, NOW), false, 'nicht doppelt');
  assert.equal(S.matches.length, n);
  removeDemo(S);
  assert.deepEqual(S.matches.map((m) => m.id), ['real']);
  assert.deepEqual(S.profiles.map((p) => p.id), ['me']);
  assert.equal(seedDemo(S, NOW), false, 'nach dem Entfernen nicht wieder einfügen');
});
