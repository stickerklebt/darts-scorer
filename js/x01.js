/* X01-Engine: Legs/Sets, Summen- und Einzeldart-Eingabe, Teams, Undo. Reine Logik ohne DOM. */
import { POSS, val, label, targetFor, route, isDoubleAttempt, attemptField, hitsField } from './checkout.js';
import { throwerOf } from './match.js';

export const LEGS_PER_SET = 3;
export const DART_INPUT_MAX = 170; // ab diesem Rest (inkl.) wird jeder Dart einzeln erfasst

export const leg = (m) => m.legs[m.legs.length - 1];
export const curSide = (m) => { const l = leg(m); return (l.starter + l.turns.length) % m.sides.length; };
export const sideTurnCount = (m, s) => m.legs.reduce((a, l) => a + l.turns.filter((t) => t.s === s).length, 0);
export const curThrower = (m) => { const s = curSide(m); return throwerOf(m, s, sideTurnCount(m, s)); };
export const rem = (m, l, s) => l.turns.reduce((r, t) => (t.s === s ? r - t.score : r), m.opts.start);
export const curRem = (m) => rem(m, leg(m), curSide(m));
export const pendingSum = (m) => m.pending.reduce((a, d) => a + (d.x ? 0 : val(d)), 0); // d.x: Dart vor dem Double In zählt nicht
/** Double In: eine Seite punktet im Leg erst ab ihrem ersten Doppel (auch Bull). Ohne Double In ist jeder sofort „drin“. */
export const dblIn = (m) => m.opts.in === 'double';
export const isIn = (m, l = leg(m), s = curSide(m)) => !dblIn(m) || l.turns.some((t) => t.s === s && t.din);
/** Ist der Werfer gerade drin (inkl. der Darts der laufenden Aufnahme)? */
export const curIn = (m) => isIn(m) || m.pending.some((d) => !d.x && d.m === 2);
export const isSets = (m) => m.opts.mode === 'sets';
export const legsInSet = (m, s, set) => m.legs.filter((l) => l.set === set && l.winner === s).length;
export const legsWon = (m, s) => m.legs.filter((l) => l.winner === s).length;
export function setsWon(m, s) {
  let c = 0;
  const last = leg(m).set;
  for (let k = 1; k <= last; k++) if (legsInSet(m, s, k) >= LEGS_PER_SET) c++;
  return c;
}
/** 'darts' wenn die aktuelle Aufnahme Dart für Dart erfasst wird, sonst 'sum'. */
export const inputMode = (m) => (m.pending.length || curRem(m) <= DART_INPUT_MAX || !isIn(m) ? 'darts' : 'sum'); // vor dem Double In Dart für Dart
const dbl = (m) => m.opts.out === 'double';

function recordTurn(m, t) {
  const l = leg(m), n = m.sides.length;
  t.s = curSide(m);
  t.pid = curThrower(m);
  l.turns.push(t);
  m.pending = [];
  if (!t.out) return { type: t.bust ? 'bust' : 'turn', turn: t };
  l.winner = t.s;
  let setWon = false, matchWon;
  if (isSets(m)) {
    setWon = legsInSet(m, t.s, l.set) >= LEGS_PER_SET;
    matchWon = setWon && setsWon(m, t.s) >= m.opts.target;
  } else matchWon = legsWon(m, t.s) >= m.opts.target;
  if (matchWon) { m.done = true; m.winners = [t.s]; return { type: 'match', turn: t }; }
  m.legs.push({ set: l.set + (setWon ? 1 : 0), starter: (l.starter + 1) % n, turns: [] });
  return { type: setWon ? 'set' : 'leg', turn: t };
}

/** Summe einer ganzen Aufnahme (nur wenn der Rest über 170 liegt). */
/** Summe einer Aufnahme. opts.voice: per Mikrofon angesagt – dann auch unter 170 Rest erlaubt (ohne Einzeldarts, Finish über die
    Checkout-Tabelle mit deren Dartzahl; Doppelquote zählt nur echte Einzeldarts). */
export function submitSum(m, score, opts = {}) {
  if (m.done) return { type: 'error', msg: 'Match ist beendet' };
  if (!opts.voice && inputMode(m) !== 'sum') return { type: 'error', msg: 'Bitte jeden Dart einzeln eingeben' };
  if (opts.voice && m.pending.length) return { type: 'error', msg: 'Erst die angefangene Aufnahme fertig eingeben' };
  if (!Number.isInteger(score) || score < 0 || score > 180 || !POSS.has(score)) return { type: 'error', msg: `${score} ist nicht möglich` };
  const r = curRem(m), nr = r - score;
  const base = { startRem: r, input: opts.voice ? 'voice' : 'sum' };
  if (nr < 0 || (dbl(m) && nr === 1)) return recordTurn(m, { ...base, score: 0, darts: 3, bust: true });
  if (nr === 0) {
    if (opts.voice && dbl(m)) { const rt = route(r, 3); if (!rt) return { type: 'error', msg: `${r} ist kein mögliches Finish` }; return recordTurn(m, { ...base, score, darts: rt.length, out: true }); }
    if (dbl(m)) return { type: 'error', msg: `${r} ist kein mögliches Finish` };
    return recordTurn(m, { ...base, score, darts: 3, out: true });
  }
  return recordTurn(m, { ...base, score, darts: 3 });
}

/** Einen einzelnen Dart erfassen (Rest ≤ 170). n: 0–20 oder 25, mult: 1–3.
 *  opts.any: auch über 170 Dart für Dart (Bots werfen immer einzeln). */
export function throwDart(m, n, mult, opts = {}) {
  if (m.done) return { type: 'error', msg: 'Match ist beendet' };
  if (!opts.any && inputMode(m) !== 'darts') return { type: 'error', msg: 'Bitte die Summe der Aufnahme eingeben' };
  if (n === 0) mult = 1;
  if (n === 25 && mult === 3) return { type: 'error', msg: 'Triple-Bull gibt es nicht' };
  if (!((n >= 0 && n <= 20) || n === 25) || ![1, 2, 3].includes(mult)) return { type: 'error', msg: 'Ungültiger Dart' };
  const r0 = curRem(m);
  const before = r0 - pendingSum(m);
  const left = 3 - m.pending.length;
  const wasIn = curIn(m), opened = !isIn(m); // opened: Aufnahme beginnt noch „draußen“
  const tgt = !wasIn ? { n: 20, m: 2 } : dbl(m) ? targetFor(before, left) : null;
  const counts = wasIn || mult === 2; // vor dem Double In zählt erst das Doppel selbst
  m.pending.push({ n, m: mult, before, target: tgt ? label(tgt) : null, ...(counts ? {} : { x: true }) });
  const after = before - (counts ? n * mult : 0);
  const throws = m.pending.slice();
  const base = { startRem: r0, input: 'darts', throws, ...(opened && curIn(m) ? { din: true } : {}) };
  if (after < 0 || (dbl(m) && after === 1) || (after === 0 && dbl(m) && mult !== 2))
    return recordTurn(m, { ...base, score: 0, darts: 3, bust: true });
  if (after === 0) return recordTurn(m, { ...base, score: r0, darts: throws.length, out: true });
  if (throws.length === 3) return recordTurn(m, { ...base, score: r0 - after, darts: 3 });
  return { type: 'dart', dart: m.pending[m.pending.length - 1] };
}

/** Letzte Eingabe zurücknehmen (einzelner Dart bzw. ganze Summen-Aufnahme). */
export function undo(m) {
  if (m.pending.length) { m.pending.pop(); return true; }
  let l = leg(m);
  if (!l.turns.length) {
    if (m.legs.length === 1) return false;
    m.legs.pop();
    l = leg(m);
  }
  const t = l.turns.pop();
  if (!t) return false;
  if (t.out) delete l.winner;
  m.done = false; m.winners = null;
  if (t.throws && t.throws.length > 1) m.pending = t.throws.slice(0, -1);
  return true;
}

/** Statistik einer Seite oder eines Profils innerhalb eines Matches. key: { s } oder { pid } */
export function matchStats(m, key) {
  let pts = 0, darts = 0, f9p = 0, f9d = 0, high = 0, t60 = 0, t100 = 0, t140 = 0, t180 = 0, hco = 0, best = null, dAtt = 0, dHit = 0;
  for (const l of m.legs) {
    let n = 0, ld = 0;
    for (const t of l.turns) {
      const mine = key.pid ? t.pid === key.pid : t.s === key.s;
      if (!mine) continue;
      pts += t.score; darts += t.darts; ld += t.darts;
      if (n < 3) { f9p += t.score; f9d += t.darts; }
      n++;
      high = Math.max(high, t.score);
      if (t.score === 180) t180++; else if (t.score >= 140) t140++; else if (t.score >= 100) t100++; else if (t.score >= 60 && !t.bust) t60++;
      if (t.out) { hco = Math.max(hco, t.score); if (best === null || ld < best) best = ld; }
      if (dbl(m)) for (const th of t.throws || []) if (isDoubleAttempt(th.before)) { dAtt++; if (hitsField(th, attemptField(th.before))) dHit++; }
    }
  }
  return { pts, darts, avg: darts ? (pts / darts) * 3 : 0, f9: f9d ? (f9p / f9d) * 3 : 0, high, t60, t100, t140, t180, hco, best, dAtt, dHit, dRate: dAtt ? dHit / dAtt : null };
}
