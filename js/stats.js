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

/** Doppelversuche (nur Double Out): jeder Dart mit Rest gerade 2–40 oder 50.
    outcomes[Feld][getroffen] = Anzahl: was bei Versuchen auf dieses Doppel wirklich getroffen wurde (auch bei Bust). */
export function doubleAttempts(matches, pid) {
  const fields = {}, outcomes = {};
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
        const got = label(th);
        outcomes[key] ??= {};
        outcomes[key][got] = (outcomes[key][got] ?? 0) + 1;
      }
    }
  }
  return { attempts, hits, rate: attempts ? hits / attempts : null, fields, outcomes };
}

/** Grundkennzahlen eines Profils. */
export function overview(matches, pid, period = 'all', now = Date.now()) {
  const ms = matchesOf(matches, pid, period, now);
  let pts = 0, darts = 0, wins = 0, legsWon = 0, legsTotal = 0, versus = 0;
  for (const m of ms) {
    const s = sideOf(m, pid);
    for (const t of turnsOf(m, pid)) { pts += t.score; darts += t.darts; }
    if (m.sides.length > 1) { versus++; if (m.winners?.includes(s)) wins++; } // Solo = Training, kein Sieg
    for (const l of m.legs) { if (l.winner === undefined) continue; legsTotal++; if (l.winner === s) legsWon++; }
  }
  return {
    matches: ms.length, wins, winRate: versus ? wins / versus : null,
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
  let pts = 0, darts = 0, f9p = 0, f9d = 0, wins = 0, legsWon = 0, legsTotal = 0, turns = 0, busts = 0, versus = 0;
  let streak = 0, bestStreak = 0, bestMatchAvg = null, nine = 0, le15 = 0;
  const counts = { t180: 0, t140: 0, t100: 0, t60: 0 };
  const buckets = BUCKETS.map(() => 0);
  const ranges = RANGES.map(() => ({ chances: 0, hits: 0 }));
  const top = [], cos = [], legDarts = [], favourite = {}, series = [], list = [];
  let bestLegRef = null, bestAvgRef = null;

  for (const m of ms) {
    const solo = m.sides.length === 1; // gegen sich selbst = Training: zählt weder als Sieg noch als Niederlage
    const s = sideOf(m, pid), won = !solo && !!m.winners?.includes(s), date = when(m);
    const opp = m.sides.filter((_, i) => i !== s).flat();
    let mp = 0, md = 0;
    for (const [li, l] of m.legs.entries()) {
      if (l.winner !== undefined) {
        legsTotal++;
        if (l.winner === s) {
          legsWon++;
          const d = l.turns.filter((t) => t.s === s).reduce((a, t) => a + t.darts, 0);
          if (!legDarts.length || d < Math.min(...legDarts)) bestLegRef = { mid: m.id, li };
          legDarts.push(d); if (d <= 9) nine++; if (d <= 15) le15++;
        }
      }
      let n = 0;
      for (const [ti, t] of l.turns.entries()) {
        if (t.pid !== pid) continue;
        turns++; pts += t.score; darts += t.darts; mp += t.score; md += t.darts;
        if (n < 3) { f9p += t.score; f9d += t.darts; }
        n++;
        if (t.bust) busts++;
        const sc = t.score;
        if (sc === 180) counts.t180++; else if (sc >= 140) counts.t140++; else if (sc >= 100) counts.t100++; else if (sc >= 60) counts.t60++;
        // Verteilung nur aus dem Scoring (Rest vor der Aufnahme über 170) – im Checkout-Bereich wirft man bewusst kleine Zahlen
        if (t.startRem > 170) buckets[BUCKETS.findIndex(([, lo, hi]) => sc >= lo && sc <= hi)]++;
        top.push({ score: sc, date, opp, mid: m.id, li, ti });
        if (t.out) {
          cos.push({ score: sc, date, opp, darts: t.darts, mid: m.id, li, ti });
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
    if (mAvg !== null && (bestMatchAvg === null || mAvg > bestMatchAvg)) { bestMatchAvg = mAvg; bestAvgRef = { mid: m.id }; }
    const dbl = doubleAttempts([m], pid);
    series.push({ id: m.id, date, avg: mAvg, dbl: dbl.attempts ? dbl.hits / dbl.attempts : null, won, solo });
    if (!solo) { versus++; if (won) { wins++; streak++; bestStreak = Math.max(bestStreak, streak); } else streak = 0; }
    const result = m.opts.mode === 'sets'
      ? m.sides.map((_, i) => setsOf(m, i)).join(' : ') + ' Sets'
      : m.sides.map((_, i) => m.legs.filter((l) => l.winner === i).length).join(' : ') + ' Legs';
    list.push({ id: m.id, date, opp, won, solo, avg: mAvg, result, side: s });
  }
  const doubles = doubleAttempts(ms, pid);
  const fav = Object.entries(favourite).sort((a, b) => b[1] - a[1])[0] || null;
  return {
    matches: ms.length, wins, winRate: versus ? wins / versus : null, bestStreak,
    avg: darts ? (pts / darts) * 3 : null, bestMatchAvg, f9: f9d ? (f9p / f9d) * 3 : null,
    legsWon, legsTotal, darts, points: pts, turns,
    top5: top.sort(byScoreThenDate).slice(0, 5), counts, perTurn: turns ? pts / turns : null, bustRate: turns ? busts / turns : null,
    highestCo: cos.length ? Math.max(...cos.map((c) => c.score)) : null, topCo: cos.slice().sort(byScoreThenDate).slice(0, 5),
    doubles, ranges: RANGES.map(([name], i) => ({ name, ...ranges[i], rate: ranges[i].chances ? ranges[i].hits / ranges[i].chances : null })),
    favourite: fav ? { field: fav[0], count: fav[1] } : null,
    dartsPerCheckout: doubles.hits ? doubles.attempts / doubles.hits : null,
    bestLeg: legDarts.length ? Math.min(...legDarts) : null, avgLegDarts: legDarts.length ? legDarts.reduce((a, b) => a + b, 0) / legDarts.length : null,
    nine, le15, buckets, series, list: list.reverse(), bestLegRef, bestAvgRef,
  };
}
function setsOf(m, s) {
  const sets = new Set(m.legs.map((l) => l.set));
  let c = 0;
  for (const k of sets) if (m.legs.filter((l) => l.set === k && l.winner === s).length >= 3) c++;
  return c;
}

/* ---------------- Doppelfelder relativ zur eigenen Gesamtquote ---------------- */
export const MIN_ATTEMPTS = 10; // erst ab 10 Versuchen bewertet (Farbe, Top 3, Lieblingsdoppel, „Beste zuerst“)
/** Stufen nach Verhältnis Feldquote / eigene Gesamtquote */
export const TIERS = [
  { k: 'great', min: 1.5, label: 'deutlich besser (ab 1,5×)' },
  { k: 'good', min: 1.15, label: 'besser' },
  { k: 'avg', min: 0.85, label: 'etwa deine Quote' },
  { k: 'weak', min: 0.5, label: 'schwächer' },
  { k: 'bad', min: -Infinity, label: 'deutlich schwächer (unter 0,5×)' },
];
/** Stufe eines Doppels – oder null bei zu wenigen Versuchen (unter 5). */
export function doubleTier(hits, attempts, overall) {
  if (attempts < MIN_ATTEMPTS || overall === null || overall === undefined) return null;
  const rate = hits / attempts;
  const ratio = overall > 0 ? rate / overall : rate > 0 ? Infinity : 1;
  return TIERS.find((t) => ratio >= t.min).k;
}
/** Für jedes Feld: { tier, top } – top = Platz 1–3 der besten Doppel (nur mit genug Versuchen und mind. einem Treffer). */
/** Fehlwürfe auf ein Doppel: „inside“ = irgendwo ins Board (nur nicht das Doppel), „outside“ = daneben (0). Anteile an den Fehlwürfen. */
export function doubleSides(doubles, key) {
  const f = doubles.fields[key], o = doubles.outcomes?.[key] || {};
  if (!f) return null;
  const misses = f.attempts - f.hits, outside = o.Miss || 0, inside = Math.max(0, misses - outside);
  return { misses, inside, outside, insideRate: misses ? inside / misses : null, outsideRate: misses ? outside / misses : null };
}

/** Die häufigsten Fehlwürfe auf ein Doppel: [{ field, count, rate }] (rate = Anteil an allen Versuchen), höchstens n. */
export function doubleMisses(doubles, key, n = 3) {
  const f = doubles.fields[key], o = doubles.outcomes?.[key];
  if (!f || !o) return [];
  return Object.entries(o).filter(([k]) => k !== key)
    .map(([field, count]) => ({ field, count, rate: count / f.attempts }))
    .sort((a, b) => b.count - a.count || a.field.localeCompare(b.field)).slice(0, n);
}

export function doubleRating(doubles) {
  const out = {};
  const ok = Object.entries(doubles.fields).filter(([, f]) => f.attempts >= MIN_ATTEMPTS && f.hits > 0)
    .sort((a, b) => b[1].hits / b[1].attempts - a[1].hits / a[1].attempts || b[1].attempts - a[1].attempts);
  const top = new Map(ok.slice(0, 3).map(([k], i) => [k, i + 1]));
  for (const [k, f] of Object.entries(doubles.fields)) out[k] = { tier: doubleTier(f.hits, f.attempts, doubles.rate), top: top.get(k) ?? null };
  return out;
}

/* ---------------- Schnellwahl: häufigste eigene Scores der letzten Aufnahmen ---------------- */
export const QUICK_MIN_TURNS = 30;
export const QUICK_WINDOW = 50;
/**
 * Häufigste Scores eines Spielers aus Summen-Eingaben (X01 ohne Busts und nur außerhalb des Checkout-Bereichs,
 * also Rest vor der Aufnahme über 170; Highscore), über die gespeicherten Matches plus das laufende.
 * Gezählt werden nur die letzten 50 solcher Aufnahmen; erst ab 30 davon erscheinen die 8 häufigsten, sortiert nach Wert.
 */
export function quickScores(matches, pid, current = null, n = 8) {
  const all = current && !matches.some((m) => m.id === current.id) ? [...matches, current] : matches;
  const ordered = all.slice().sort((a, b) => (a.startedAt ?? 0) - (b.startedAt ?? 0));
  const seq = [];
  for (const m of ordered) {
    if (m.game === 'x01') {
      for (const l of m.legs) for (const t of l.turns) {
        if (t.pid !== pid || t.input !== 'sum' || t.bust) continue;
        if (typeof t.startRem === 'number' && t.startRem <= 170) continue; // Checkout-Bereich zählt nicht
        seq.push(t.score);
      }
    } else if (m.game === 'highscore') {
      for (const t of m.turns) if (t.pid === pid && !t.throws) seq.push(t.v);
    }
  }
  const recent = seq.slice(-QUICK_WINDOW);
  if (recent.length < QUICK_MIN_TURNS) return [];
  const count = new Map();
  for (const v of recent) count.set(v, (count.get(v) || 0) + 1);
  return [...count.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]).slice(0, n).map(([v]) => v).sort((a, b) => a - b);
}

/* ---------------- Leg im Detail: Kennzahlen je Seite + jede Aufnahme mit den geworfenen Darts ---------------- */
/**
 * Ein Leg eines X01-Matches, aufgeschlüsselt. `pid` bestimmt, welche Seite zuerst kommt.
 * Je Seite: Kennzahlen (Ø, Darts, Aufnahmen, höchste, 100+/140+/180, First 9, Checkout) und alle Aufnahmen
 * { i (Index im Leg), pid, startRem, score, darts, bust, out, rest, throws: ['T20','S5',…] oder null bei Summen-Eingabe }.
 */
export function legDetail(m, li, pid) {
  const l = m.legs[li];
  if (!l) return null;
  const mine = Math.max(0, sideOf(m, pid));
  const order = m.sides.map((_, s) => s).sort((a, b) => (a === mine ? -1 : a) - (b === mine ? -1 : b));
  const sides = order.map((s) => {
    const turns = [];
    l.turns.forEach((t, i) => {
      if (t.s !== s) return;
      turns.push({
        i, pid: t.pid, startRem: t.startRem, score: t.score, darts: t.darts, bust: !!t.bust, out: !!t.out,
        rest: t.bust ? t.startRem : t.startRem - t.score, throws: t.throws ? t.throws.map(label) : null,
      });
    });
    const pts = turns.reduce((a, t) => a + t.score, 0), darts = turns.reduce((a, t) => a + t.darts, 0);
    const f9 = turns.slice(0, 3);
    const f9d = f9.reduce((a, t) => a + t.darts, 0);
    const co = turns.find((t) => t.out);
    return {
      s, won: l.winner === s, turns, darts, pts,
      avg: darts ? (pts / darts) * 3 : null,
      f9: f9d ? (f9.reduce((a, t) => a + t.score, 0) / f9d) * 3 : null,
      high: turns.reduce((a, t) => Math.max(a, t.score), 0),
      t100: turns.filter((t) => t.score >= 100 && t.score < 140).length,
      t140: turns.filter((t) => t.score >= 140 && t.score < 180).length,
      t180: turns.filter((t) => t.score === 180).length,
      checkout: co ? co.score : null, busts: turns.filter((t) => t.bust).length,
    };
  });
  return { li, no: li + 1, set: l.set, winner: l.winner, starter: l.starter, finished: l.winner !== undefined, mine, sides };
}
