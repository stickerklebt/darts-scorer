/* „Wann du gut wirfst“: Scoring-Aufnahmen (Rest vor der Aufnahme über 170) nach Umständen aufgeteilt.
   Reine Funktion ohne DOM, rechnet aus den gespeicherten Matches (wie stats.js).
   Gut = 60+, schlecht = unter 30. Ø = Punkte pro Aufnahme (3 Darts). */
import { isBot } from './bots.js';

export const GOOD = 60, BAD = 30;
/** Ab so vielen Aufnahmen wird ein Umstand bewertet (sonst zu zufällig) */
export const MIN_N = 12;

const DAYPARTS = [['morgens', 5, 12], ['nachmittags', 12, 17], ['abends', 17, 22], ['nachts', 22, 29]];
export const daypart = (ts) => { const h = new Date(ts).getHours(), x = h < 5 ? h + 24 : h; return DAYPARTS.find(([, a, b]) => x >= a && x < b)[0]; };
const dayKey = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };

/** Die Umstände in fester Reihenfolge: [Gruppe, [[key, Beschriftung]…]] */
export const GROUPS = [
  ['Nach der letzten Aufnahme', [['afterBad', `nach einer schlechten (unter ${BAD})`], ['afterMid', `nach einer mittleren (${BAD}–${GOOD - 1})`], ['afterGood', `nach einer guten (${GOOD}+)`], ['afterTon', 'nach 100+']]],
  ['Im Leg', [['turn1', '1. Aufnahme'], ['turn2', '2. Aufnahme'], ['turn3', '3. Aufnahme'], ['turn4', 'ab der 4. Aufnahme']]],
  ['Druck', [['oppFinish', 'Gegner steht im Finish (≤ 170)'], ['oppFar', 'Gegner noch weit weg'], ['legAhead', 'du liegst im Leg vorne'], ['legBehind', 'du liegst im Leg hinten']]],
  ['Match-Stand', [['matchAhead', 'du führst nach Legs'], ['matchLevel', 'Gleichstand'], ['matchBehind', 'du liegst nach Legs hinten']]],
  ['Matchverlauf', [['leg1', '1. Leg'], ['leg23', '2.–3. Leg'], ['leg4', 'ab dem 4. Leg']]],
  ['Tageszeit', DAYPARTS.map(([k]) => [k, k])],
  ['Spiel des Tages', [['day1', '1. Spiel'], ['day2', '2. Spiel'], ['day3', 'ab dem 3. Spiel']]],
  ['Gegner', [['vsBot', 'gegen Bots'], ['vsHuman', 'gegen Menschen'], ['solo', 'Training (allein)']]],
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
  const perDay = {};
  for (const m of ms) {
    const s = m.sides.findIndex((x) => x.includes(pid));
    if (s < 0) continue;
    const dk = dayKey(m.startedAt), nDay = (perDay[dk] = (perDay[dk] || 0) + 1);
    const others = m.sides.filter((_, i) => i !== s).flat();
    const kind = m.sides.length === 1 ? 'solo' : others.every((id) => isBot(id)) ? 'vsBot' : 'vsHuman';
    const part = daypart(m.startedAt);
    const won = m.sides.map(() => 0); // Legs je Seite (bei Sets: im laufenden Set)
    let curSet = null;
    for (const [li, l] of m.legs.entries()) {
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
          put(li === 0 ? 'leg1' : li <= 2 ? 'leg23' : 'leg4', sc);
          put(part, sc);
          put(nDay >= 3 ? 'day3' : `day${nDay}`, sc);
          put(kind, sc);
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

/** Kurzfassung oben: Comeback, Clutch, stärkster/schwächster Umstand, beste Tageszeit */
function highlights(base, rows) {
  const ok = (k) => rows[k] && rows[k].n >= MIN_N;
  const h = {};
  if (ok('afterBad')) h.comeback = { rate: rows.afterBad.good, base: base.good, n: rows.afterBad.n };
  if (ok('oppFinish')) h.clutch = { avg: rows.oppFinish.avg, delta: rows.oppFinish.avg - base.avg, n: rows.oppFinish.n };
  if (ok('afterGood')) h.hot = { avg: rows.afterGood.avg, delta: rows.afterGood.avg - base.avg, n: rows.afterGood.n };
  const labels = Object.fromEntries(GROUPS.flatMap(([, r]) => r));
  const rated = Object.keys(rows).filter(ok).map((k) => ({ k, label: labels[k], ...rows[k] }));
  if (rated.length >= 2) {
    rated.sort((a, b) => b.avg - a.avg);
    h.best = rated[0]; h.worst = rated[rated.length - 1];
  }
  const parts = DAYPARTS.map(([k]) => k).filter(ok);
  if (parts.length >= 2) h.daytime = parts.map((k) => ({ k, ...rows[k] })).sort((a, b) => b.avg - a.avg)[0];
  return h;
}
