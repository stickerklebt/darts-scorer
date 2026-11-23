/* „Wann du gut wirfst“: Scoring-Aufnahmen (Rest vor der Aufnahme über 170) nach Umständen aufgeteilt.
   Reine Funktion ohne DOM, rechnet aus den gespeicherten Matches (wie stats.js).
   Gut = 60+, schlecht = unter 30. Ø = Punkte pro Aufnahme (3 Darts). */

export const GOOD = 60, BAD = 30;
/** Ab so vielen Aufnahmen wird ein Umstand bewertet (sonst zu zufällig) */
export const MIN_N = 12;


/** Die Umstände in fester Reihenfolge: [Gruppe, [[key, Beschriftung]…]] */
export const GROUPS = [
  ['Nach der letzten Aufnahme', [['afterBad', `nach einer schlechten (unter ${BAD})`], ['afterMid', `nach einer mittleren (${BAD}–${GOOD - 1})`], ['afterGood', `nach einer guten (${GOOD}+)`], ['afterTon', 'nach 100+']]],
  ['Im Leg', [['turn1', '1. Aufnahme'], ['turn2', '2. Aufnahme'], ['turn3', '3. Aufnahme'], ['turn4', 'ab der 4. Aufnahme']]],
  ['Druck', [['oppFinish', 'Gegner steht im Finish (≤ 170)'], ['oppFar', 'Gegner noch weit weg'], ['legAhead', 'du liegst im Leg vorne'], ['legBehind', 'du liegst im Leg hinten']]],
  ['Match-Stand', [['matchAhead', 'du führst nach Legs'], ['matchLevel', 'Gleichstand'], ['matchBehind', 'du liegst nach Legs hinten']]],
];

const acc = () => ({ n: 0, sum: 0, good: 0, bad: 0 });
const add = (a, sc) => { a.n++; a.sum += sc; if (sc >= GOOD) a.good++; if (sc < BAD) a.bad++; };
const fin = (a) => ({ n: a.n, avg: a.n ? a.sum / a.n : null, good: a.n ? a.good / a.n : null, bad: a.n ? a.bad / a.n : null });

/**
 * matches: schon gefilterte 501-Matches (matchesOf). → { base, rows: { key: { n, avg, good, bad } }, groups, highlights }
 */
export function situations(matches, pid) {
  const all = acc(), by = {};
  const put = (k, sc) => add(by[k] ??= acc(), sc);
  const ms = matches.slice().sort((a, b) => a.startedAt - b.startedAt);
  for (const m of ms) {
    const s = m.sides.findIndex((x) => x.includes(pid));
    if (s < 0) continue;
    const won = m.sides.map(() => 0); // Legs je Seite (bei Sets: im laufenden Set)
    let curSet = null;
    for (const l of m.legs) {
      if (l.set !== curSet) { curSet = l.set; if (m.opts.mode === 'sets') won.fill(0); }
      const rem = m.sides.map(() => m.opts.start);
      let prev = null, nTurn = 0;
      const mine = won[s], best = Math.max(...won.filter((_, i) => i !== s), 0);
      for (const t of l.turns) {
        if (t.pid === pid && t.startRem > 170) {
          const sc = t.score;
          add(all, sc);
          nTurn++;
          if (prev !== null) put(prev < BAD ? 'afterBad' : prev < GOOD ? 'afterMid' : 'afterGood', sc);
          if (prev !== null && prev >= 100) put('afterTon', sc);
          put(nTurn >= 4 ? 'turn4' : `turn${nTurn}`, sc);
          if (m.sides.length > 1) {
            const opp = Math.min(...rem.filter((_, i) => i !== s));
            put(opp <= 170 ? 'oppFinish' : 'oppFar', sc);
            if (rem[s] !== opp) put(rem[s] < opp ? 'legAhead' : 'legBehind', sc);
            put(mine > best ? 'matchAhead' : mine < best ? 'matchBehind' : 'matchLevel', sc);
          }
          prev = sc;
        } else if (t.pid === pid) prev = null; // im Finish-Bereich: Kette „nach der letzten Aufnahme“ endet
        if (t.s !== undefined) rem[t.s] = t.startRem - (t.bust ? 0 : t.score);
      }
      if (l.winner !== undefined) won[l.winner]++;
    }
  }
  const base = fin(all), rows = {};
  for (const [k, a] of Object.entries(by)) rows[k] = fin(a);
  return { base, rows, groups: GROUPS, highlights: highlights(base, rows) };
}

/** Kurzfassung oben: Comeback, Clutch, Heiße Hand, Start ins Leg, stärkster/schwächster Umstand */
function highlights(base, rows) {
  const ok = (k) => rows[k] && rows[k].n >= MIN_N;
  const h = {};
  if (ok('afterBad')) h.comeback = { rate: rows.afterBad.good, base: base.good, n: rows.afterBad.n };
  if (ok('oppFinish')) h.clutch = { avg: rows.oppFinish.avg, delta: rows.oppFinish.avg - base.avg, n: rows.oppFinish.n };
  if (ok('turn1')) h.start = { avg: rows.turn1.avg, delta: rows.turn1.avg - base.avg, n: rows.turn1.n };
  if (ok('afterGood')) h.hot = { avg: rows.afterGood.avg, delta: rows.afterGood.avg - base.avg, n: rows.afterGood.n };
  const labels = Object.fromEntries(GROUPS.flatMap(([, r]) => r));
  const rated = Object.keys(rows).filter(ok).map((k) => ({ k, label: labels[k], ...rows[k] }));
  if (rated.length >= 2) {
    rated.sort((a, b) => b.avg - a.avg);
    h.best = rated[0]; h.worst = rated[rated.length - 1];
  }
  return h;
}

/**
 * Verlauf im Leg: Ø Punkte der 1., 2., 3. … Aufnahme von 501 bis zum Finish-Bereich (Rest vor der Aufnahme über 170).
 * → { points: [{ n, avg, count }], avgTurns } – gezeigt werden die Aufnahmen 1 … (Ø Anzahl bis 170, aufgerundet),
 *   nur solche mit mindestens 3 Werten.
 */
export function legCurve(matches, pid) {
  const sum = [], cnt = [];
  let legs = 0, total = 0;
  for (const m of matches) {
    for (const l of m.legs) {
      let n = 0;
      for (const t of l.turns) {
        if (t.pid !== pid || !(t.startRem > 170)) continue;
        sum[n] = (sum[n] || 0) + t.score; cnt[n] = (cnt[n] || 0) + 1; n++;
      }
      if (n) { legs++; total += n; }
    }
  }
  const avgTurns = legs ? total / legs : null;
  const upto = avgTurns ? Math.max(1, Math.ceil(avgTurns)) : 0;
  const points = [];
  for (let i = 0; i < upto; i++) if ((cnt[i] || 0) >= 3) points.push({ n: i + 1, avg: sum[i] / cnt[i], count: cnt[i] });
  return { points, avgTurns };
}
