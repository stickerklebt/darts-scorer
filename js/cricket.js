/* Cricket-Engine: Zahlen 20–15 + Bull. Reine Logik ohne DOM.
   Ein Feld ist „zu“ mit 3 Treffern (Single 1, Double 2, Triple 3; 25 = 1, Bull = 2).
   Modus 'points': Weitere Treffer auf eigene, beim Gegner noch offene Felder geben Punkte (Feldwert × Treffer).
   Gewonnen hat, wer alle Felder zu hat und mindestens so viele Punkte wie jeder Gegner.
   Modus 'close': nur Schließen, ohne Punkte – wer zuerst alles zu hat, gewinnt.
   Nach `rounds` Runden gewinnt, wer die meisten Punkte (bei Gleichstand: die meisten Treffer) hat.
   Turn = { s, pid, v (Punkte der Aufnahme), marks, throws: [{ n, m }] } */
import { throwerOf } from './match.js';

export const TARGETS = [20, 19, 18, 17, 16, 15, 25];
export const tLabel = (n) => (n === 25 ? 'Bull' : String(n));

export const curSide = (m) => (m.first + m.turns.length) % m.sides.length;
export const round = (m) => Math.floor(m.turns.length / m.sides.length);
export const curThrower = (m) => { const s = curSide(m); return throwerOf(m, s, m.turns.filter((t) => t.s === s).length); };
export const rounds = (m) => m.opts.rounds || 20;

/** Stand aller Seiten nach allen Aufnahmen (+ optional laufenden Darts der aktuellen Seite). */
export function state(m, withPending = true) {
  const n = m.sides.length;
  const marks = Array.from({ length: n }, () => Object.fromEntries(TARGETS.map((t) => [t, 0])));
  const pts = Array(n).fill(0), hits = Array(n).fill(0);
  const apply = (s, d) => {
    if (!TARGETS.includes(d.n)) return 0;
    const add = d.n === 25 ? Math.min(d.m, 2) : d.m;
    const before = marks[s][d.n];
    marks[s][d.n] = before + add;
    hits[s] += Math.min(add, Math.max(0, 3 - before));
    const extra = Math.max(0, before + add - 3) - Math.max(0, before - 3);
    if (m.opts.mode !== 'close' && extra > 0 && marks.some((mk, o) => o !== s && mk[d.n] < 3)) {
      const p = extra * d.n; pts[s] += p; return p;
    }
    return 0;
  };
  for (const t of m.turns) for (const d of t.throws || []) apply(t.s, d);
  let pendingPts = 0;
  if (withPending) for (const d of m.pending) pendingPts += apply(curSide(m), d);
  return { marks, pts, hits, pendingPts };
}

export const closedAll = (mk) => TARGETS.every((t) => mk[t] >= 3);
export const marksOf = (m, s, n) => state(m).marks[s][n];

function winnersByScore(st) {
  const best = Math.max(...st.pts);
  let cand = st.pts.map((p, i) => (p === best ? i : -1)).filter((i) => i >= 0);
  const bh = Math.max(...cand.map((i) => st.hits[i]));
  cand = cand.filter((i) => st.hits[i] === bh);
  return cand;
}

/** Hat Seite s jetzt gewonnen? */
function hasWon(m, st, s) {
  if (!closedAll(st.marks[s])) return false;
  if (m.opts.mode === 'close') return true;
  return st.pts.every((p, o) => o === s || st.pts[s] >= p);
}

function recordTurn(m, s, st) {
  const throws = m.pending.slice();
  const before = state({ ...m, pending: [] }, false);
  const t = { s, pid: curThrower(m), v: st.pts[s] - before.pts[s], marks: st.hits[s] - before.hits[s], throws };
  m.turns.push(t);
  m.pending = [];
  return t;
}

/** Einen Dart erfassen. n: 0–20 oder 25 (0 = daneben), mult: 1–3. */
export function throwDart(m, n, mult) {
  if (m.done) return { type: 'error', msg: 'Spiel ist beendet' };
  if (n === 0) mult = 1;
  if (n === 25 && mult === 3) return { type: 'error', msg: 'Triple-Bull gibt es nicht' };
  if (!((n >= 0 && n <= 20) || n === 25) || ![1, 2, 3].includes(mult)) return { type: 'error', msg: 'Ungültiger Dart' };
  const s = curSide(m);
  m.pending.push({ n, m: mult });
  const st = state(m);
  if (hasWon(m, st, s)) {
    const t = recordTurn(m, s, st);
    m.done = true; m.winners = [s];
    return { type: 'match', turn: t };
  }
  if (m.pending.length < 3) return { type: 'dart', dart: { n, m: mult } };
  const t = recordTurn(m, s, st);
  if (m.turns.length >= rounds(m) * m.sides.length) {
    m.done = true; m.winners = winnersByScore(state(m, false));
    return { type: 'match', turn: t };
  }
  return { type: 'turn', turn: t };
}

/** Letzten Dart zurücknehmen. */
export function undo(m) {
  if (m.pending.length) { m.pending.pop(); return true; }
  const t = m.turns.pop();
  if (!t) return false;
  m.done = false; m.winners = null;
  m.pending = (t.throws || []).slice(0, -1);
  return true;
}

export const score = (m, s) => state(m, false).pts[s];

/** Bot-Ziel: offene Zahl von oben nach unten; alles zu → Punkte holen, wo ein Gegner noch offen ist. */
export function aim(m) {
  const st = state(m), s = curSide(m), mine = st.marks[s];
  const open = TARGETS.find((t) => mine[t] < 3);
  const behind = m.opts.mode !== 'close' && st.pts.some((p, o) => o !== s && p > st.pts[s]);
  if (behind) {
    const score = TARGETS.find((t) => mine[t] >= 3 && st.marks.some((mk, o) => o !== s && mk[t] < 3));
    if (score) return score === 25 ? { n: 25, m: 2 } : { n: score, m: 3 };
  }
  if (open !== undefined) return open === 25 ? { n: 25, m: 2 } : { n: open, m: 3 };
  return { n: 20, m: 3 };
}
