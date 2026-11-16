/* Statistik – wird immer aus den gespeicherten Matches berechnet. Reine Funktionen ohne DOM.
   Grundlage: nur abgeschlossene X01-Matches mit Start 501. */
import { isDoubleAttempt, attemptField, hitsField, label, route } from './checkout.js';

export const is501 = (m) => m.game === 'x01' && m.opts.start === 501 && m.done;
const DAY = 864e5;
export const PERIODS = { '7d': 7 * DAY, '30d': 30 * DAY, '1y': 365 * DAY, all: Infinity };

/** 501-Matches eines Profils, optional im Zeitraum (period-Key aus PERIODS). */
export function matchesOf(matches, pid, period = 'all', now = Date.now()) {
  const span = PERIODS[period] ?? Infinity;
  return matches.filter((m) => is501(m) && m.playerIds.includes(pid) && now - (m.endedAt ?? m.startedAt) <= span);
}

/** Alle Aufnahmen, die dieses Profil selbst geworfen hat. */
export const turnsOf = (m, pid) => m.legs.flatMap((l) => l.turns.filter((t) => t.pid === pid));
const sideOf = (m, pid) => m.sides.findIndex((s) => s.includes(pid));

/** Doppelversuche (nur Double Out): jeder Dart mit Rest gerade 2–40 oder 50. */
export function doubleAttempts(matches, pid) {
  const fields = {};
  let attempts = 0, hits = 0;
  for (const m of matches) {
    if (m.opts.out !== 'double') continue;
    for (const t of turnsOf(m, pid)) {
      for (const th of t.throws || []) {
        if (!isDoubleAttempt(th.before)) continue;
        const f = attemptField(th.before), key = label(f), hit = hitsField(th, f);
        attempts++; if (hit) hits++;
        fields[key] ??= { attempts: 0, hits: 0 };
        fields[key].attempts++; if (hit) fields[key].hits++;
      }
    }
  }
  return { attempts, hits, rate: attempts ? hits / attempts : null, fields };
}

/** Grundkennzahlen eines Profils. */
export function overview(matches, pid, period = 'all', now = Date.now()) {
  const ms = matchesOf(matches, pid, period, now);
  let pts = 0, darts = 0, wins = 0, legsWon = 0, legsTotal = 0;
  for (const m of ms) {
    const s = sideOf(m, pid);
    for (const t of turnsOf(m, pid)) { pts += t.score; darts += t.darts; }
    if (m.winners?.includes(s)) wins++;
    for (const l of m.legs) { if (l.winner === undefined) continue; legsTotal++; if (l.winner === s) legsWon++; }
  }
  return {
    matches: ms.length, wins, winRate: ms.length ? wins / ms.length : null,
    points: pts, darts, avg: darts ? (pts / darts) * 3 : null, legsWon, legsTotal,
    doubles: doubleAttempts(ms, pid),
  };
}

/* ---------------- Vollständige Statistik eines Profils ---------------- */
export const BUCKETS = [['0–19', 0, 19], ['20–39', 20, 39], ['40–59', 40, 59], ['60–79', 60, 79], ['80–99', 80, 99], ['100–139', 100, 139], ['140–179', 140, 179], ['180', 180, 180]];
export const RANGES = [['2–40', 2, 40], ['41–100', 41, 100], ['101–170', 101, 170]];
const when = (m) => m.endedAt ?? m.startedAt;
const byScoreThenDate = (a, b) => b.score - a.score || b.date - a.date;

/** Gleitender Durchschnitt über `w` Werte (null-Werte werden übersprungen). */
export function movingAvg(values, w = 5) {
  return values.map((_, i) => {
    const win = values.slice(Math.max(0, i - w + 1), i + 1).filter((v) => v !== null);
    return win.length ? win.reduce((a, b) => a + b, 0) / win.length : null;
  });
}

export function fullStats(matches, pid, period = 'all', now = Date.now()) {
  const ms = matchesOf(matches, pid, period, now).slice().sort((a, b) => when(a) - when(b));
  let pts = 0, darts = 0, f9p = 0, f9d = 0, wins = 0, legsWon = 0, legsTotal = 0, turns = 0, busts = 0;
  let streak = 0, bestStreak = 0, bestMatchAvg = null, nine = 0, le15 = 0;
  const counts = { t180: 0, t140: 0, t100: 0, t60: 0 };
  const buckets = BUCKETS.map(() => 0);
  const ranges = RANGES.map(() => ({ chances: 0, hits: 0 }));
  const top = [], cos = [], legDarts = [], favourite = {}, series = [], list = [];

  for (const m of ms) {
    const s = sideOf(m, pid), won = !!m.winners?.includes(s), date = when(m);
    const opp = m.sides.filter((_, i) => i !== s).flat();
    let mp = 0, md = 0;
    for (const l of m.legs) {
      if (l.winner !== undefined) {
        legsTotal++;
        if (l.winner === s) {
          legsWon++;
          const d = l.turns.filter((t) => t.s === s).reduce((a, t) => a + t.darts, 0);
          legDarts.push(d); if (d <= 9) nine++; if (d <= 15) le15++;
        }
      }
      let n = 0;
      for (const t of l.turns) {
        if (t.pid !== pid) continue;
        turns++; pts += t.score; darts += t.darts; mp += t.score; md += t.darts;
        if (n < 3) { f9p += t.score; f9d += t.darts; }
        n++;
        if (t.bust) busts++;
        const sc = t.score;
        if (sc === 180) counts.t180++; else if (sc >= 140) counts.t140++; else if (sc >= 100) counts.t100++; else if (sc >= 60) counts.t60++;
        buckets[BUCKETS.findIndex(([, lo, hi]) => sc >= lo && sc <= hi)]++;
        top.push({ score: sc, date, opp });
        if (t.out) {
          cos.push({ score: sc, date, opp, darts: t.darts });
          const last = t.throws?.[t.throws.length - 1];
          if (last) { const k = label(last); favourite[k] = (favourite[k] || 0) + 1; }
        }
        if (m.opts.out === 'double' && route(t.startRem, 3)) {
          const ri = RANGES.findIndex(([, lo, hi]) => t.startRem >= lo && t.startRem <= hi);
          ranges[ri].chances++; if (t.out) ranges[ri].hits++;
        }
      }
    }
    const mAvg = md ? (mp / md) * 3 : null;
    if (mAvg !== null && (bestMatchAvg === null || mAvg > bestMatchAvg)) bestMatchAvg = mAvg;
    const dbl = doubleAttempts([m], pid);
    series.push({ id: m.id, date, avg: mAvg, dbl: dbl.attempts ? dbl.hits / dbl.attempts : null, won });
    if (won) { wins++; streak++; bestStreak = Math.max(bestStreak, streak); } else streak = 0;
    const result = m.opts.mode === 'sets'
      ? m.sides.map((_, i) => setsOf(m, i)).join(' : ') + ' Sets'
      : m.sides.map((_, i) => m.legs.filter((l) => l.winner === i).length).join(' : ') + ' Legs';
    list.push({ id: m.id, date, opp, won, avg: mAvg, result, side: s });
  }
  const doubles = doubleAttempts(ms, pid);
  const fav = Object.entries(favourite).sort((a, b) => b[1] - a[1])[0] || null;
  return {
    matches: ms.length, wins, winRate: ms.length ? wins / ms.length : null, bestStreak,
    avg: darts ? (pts / darts) * 3 : null, bestMatchAvg, f9: f9d ? (f9p / f9d) * 3 : null,
    legsWon, legsTotal, darts, points: pts, turns,
    top5: top.sort(byScoreThenDate).slice(0, 5), counts, perTurn: turns ? pts / turns : null, bustRate: turns ? busts / turns : null,
    highestCo: cos.length ? Math.max(...cos.map((c) => c.score)) : null, topCo: cos.slice().sort(byScoreThenDate).slice(0, 5),
    doubles, ranges: RANGES.map(([name], i) => ({ name, ...ranges[i], rate: ranges[i].chances ? ranges[i].hits / ranges[i].chances : null })),
    favourite: fav ? { field: fav[0], count: fav[1] } : null,
    dartsPerCheckout: doubles.hits ? doubles.attempts / doubles.hits : null,
    bestLeg: legDarts.length ? Math.min(...legDarts) : null, avgLegDarts: legDarts.length ? legDarts.reduce((a, b) => a + b, 0) / legDarts.length : null,
    nine, le15, buckets, series, list: list.reverse(),
  };
}
function setsOf(m, s) {
  const sets = new Set(m.legs.map((l) => l.set));
  let c = 0;
  for (const k of sets) if (m.legs.filter((l) => l.set === k && l.winner === s).length >= 3) c++;
  return c;
}
