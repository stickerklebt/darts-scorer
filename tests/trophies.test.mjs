import assert from 'node:assert/strict';
import { createMatch } from '../js/match.js';
import * as X from '../js/x01.js';
import { trophies, measure, badgeSlots, TROPHIES } from '../js/trophies.js';

const dart = (m, n, mult) => X.throwDart(m, n, mult);

/* a gegen Shrek (Bot), 501, First to 1: a wirft 180, 180, dann T20 T19 D12 (9-Darter), Bot 60, 60 */
function nine(now = Date.now()) {
  const m = createMatch('x01', [['a'], ['shrek']], { start: 501, out: 'double', mode: 'legs', target: 1 }, 0, now);
  X.submitSum(m, 180); X.submitSum(m, 60); X.submitSum(m, 180); X.submitSum(m, 60);
  dart(m, 20, 3); dart(m, 19, 3); dart(m, 12, 2);
  m.endedAt = now;
  return m;
}

test('Trophäen: 9-Darter legendär, 180er-Serie, Bot geschlagen, ausgegraut ohne Erfolg', () => {
  const st = trophies([nine()], 'a');
  assert.equal(st.nine.tier, 'legendary');
  assert.equal(st.quickleg.tier, 'gold');
  assert.equal(st.ton.tier, 'bronze');
  assert.equal(st.ton80.tier, 'gold');
  assert.equal(st.series180.tier, 'royal');
  assert.equal(st.highavg.tier, 'gold');          // Ø 167
  assert.equal(st['bot-shrek'].tier, 'bronze');
  assert.equal(st.botperfect.tier, 'silver');      // 1:0, Bot ohne Leg
  assert.equal(st.bigfish.tier, null);
  assert.equal(st.botslayer.tier, null);
  assert.equal(st.ton.next.need, 25);
  assert.equal(Object.keys(st).length, TROPHIES.length);
});

test('Trophäen: Bed & Breakfast, Shanghai-Finish, Kaltblütig, Madhouse', () => {
  // 146: a S20 S5 S1 (26 → 120), b T20 T20 S6 (→ 20, steht auf Finish), a T20 S20 D20 = Shanghai-Finish
  const m = createMatch('x01', [['a'], ['b']], { start: 146, out: 'double', mode: 'legs', target: 1 }, 0);
  dart(m, 20, 1); dart(m, 5, 1); dart(m, 1, 1);
  dart(m, 20, 3); dart(m, 20, 3); dart(m, 6, 1);
  dart(m, 20, 3); dart(m, 20, 1); dart(m, 20, 2);
  m.endedAt = Date.now();
  // 32: S16 S14 D1 = Madhouse
  const k = createMatch('x01', [['a']], { start: 32, out: 'double', mode: 'legs', target: 1 }, 0);
  dart(k, 16, 1); dart(k, 14, 1); dart(k, 1, 2);
  k.endedAt = Date.now();
  const v = measure([m, k], 'a');
  assert.deepEqual([v.bnb, v.shanghaiOut, v.coldOut, v.madhouse], [1, 1, 1, 1]);
});

test('Abzeichen-Plätze: nur erreichte, keine doppelten, immer 3', () => {
  const st = trophies([nine()], 'a');
  assert.deepEqual(badgeSlots(['nine', 'nine', 'bigfish', 'ton'], st), ['nine', null, null]);
  assert.deepEqual(badgeSlots(undefined, st), [null, null, null]);
  assert.deepEqual(badgeSlots(['ton', 'ton80', 'nine'], st), ['ton', 'ton80', 'nine']);
});
