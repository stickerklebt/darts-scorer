/* Statistik eines Freundes – wie in der App immer aus den gespeicherten Matches berechnet (gleicher Code: js/stats.js).
   Freunde sehen nur Kennzahlen des Hauptspielers, nie die einzelnen Matches oder Namen von Mitspielern. */
import { fullStats } from '../../js/stats.js';

const FORM = 10; // letzte Matches für die Formkurve

export function friendStats(state, matches) {
  const pid = state?.mainId ?? null;
  const mine = pid ? matches.filter((m) => m?.done && Array.isArray(m.playerIds) && m.playerIds.includes(pid)) : [];
  const games = {};
  let lastPlayed = null;
  for (const m of mine) {
    games[m.game] = (games[m.game] || 0) + 1;
    const t = m.endedAt ?? m.startedAt ?? null;
    if (t && (!lastPlayed || t > lastPlayed)) lastPlayed = t;
  }
  let x501 = null;
  try {
    const st = pid ? fullStats(mine, pid) : null;
    if (st && st.matches) {
      x501 = {
        matches: st.matches, wins: st.wins, winRate: st.winRate, bestStreak: st.bestStreak,
        avg: st.avg, bestMatchAvg: st.bestMatchAvg, f9: st.f9,
        highestTurn: st.top5[0]?.score ?? null, highestCo: st.highestCo,
        doubles: { rate: st.doubles.rate, hits: st.doubles.hits, attempts: st.doubles.attempts },
        favourite: st.favourite, counts: st.counts,
        legsWon: st.legsWon, legsTotal: st.legsTotal, bestLeg: st.bestLeg, avgLegDarts: st.avgLegDarts, nine: st.nine,
        form: st.series.slice(-FORM).map((s) => ({ date: s.date, avg: s.avg, won: s.won })),
      };
    }
  } catch { x501 = null; } // fehlerhafte Altdaten eines Nutzers sollen die Ansicht nicht sprengen
  return { total: mine.length, games, lastPlayed, x501 };
}
