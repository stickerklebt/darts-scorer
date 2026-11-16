/* Partyspiele: Highscore, Shanghai, Halbieren, Around the Clock. Reine Logik ohne DOM. */
import { POSS, upTo3, ALL_DARTS, val } from './checkout.js';
import { throwerOf } from './match.js';

export const HALF = [15, 16, 'D', 17, 18, 'T', 19, 20, 'B'];
export const HALF_START = 40;
const HALF_OK = {
  D: upTo3(ALL_DARTS.filter((d) => d.m === 2).map(val)),
  T: upTo3(ALL_DARTS.filter((d) => d.m === 3).map(val)),
  B: upTo3([25, 50]),
};
export const halfLabel = (t) => (t === 'D' ? 'Double' : t === 'T' ? 'Triple' : t === 'B' ? 'Bull' : String(t));
export const halfValid = (t, v) => (typeof t === 'number' ? v % t === 0 && v / t <= 9 : HALF_OK[t].has(v));

export const curSide = (m) => (m.first + m.turns.length) % m.sides.length;
export const round = (m) => Math.floor(m.turns.length / m.sides.length);
export const curThrower = (m) => { const s = curSide(m); return throwerOf(m, s, m.turns.filter((t) => t.s === s).length); };
export const rounds = (m) => (m.game === 'halveit' ? HALF.length : m.game === 'atc' ? Infinity : m.opts.rounds);
export const atcTotal = (m) => (m.opts.bull ? 21 : 20);
export const atcPos = (m, s) => Math.min(atcTotal(m), m.turns.reduce((a, t) => (t.s === s ? a + t.v : a), 0));
export const atcLabel = (pos) => (pos >= 20 ? 'Bull' : String(pos + 1));

export function score(m, s) {
  if (m.game === 'atc') return atcPos(m, s);
  if (m.game === 'halveit') return m.turns.reduce((acc, t) => (t.s !== s ? acc : t.v ? acc + t.v : Math.ceil(acc / 2)), HALF_START);
  return m.turns.reduce((a, t) => (t.s === s ? a + t.v : a), 0);
}

export function validate(m, v) {
  const r = round(m);
  if (!Number.isInteger(v) || v < 0) return 'Ungültige Eingabe';
  if (m.game === 'highscore') return POSS.has(v) ? null : `${v} ist nicht möglich`;
  if (m.game === 'shanghai') { const t = r + 1; return v % t === 0 && v <= 9 * t ? null : `Auf die ${t} geht nur 0, ${t}, ${2 * t} … ${9 * t}`; }
  if (m.game === 'halveit') { const t = HALF[r]; return halfValid(t, v) ? null : `${v} ist auf ${halfLabel(t)} nicht möglich`; }
  if (m.game === 'atc') return v <= Math.min(3, atcTotal(m) - atcPos(m, curSide(m))) ? null : 'Zu viele Treffer';
  return null;
}

export function isDone(m) {
  if (m.game === 'atc') return m.sides.some((_, s) => atcPos(m, s) >= atcTotal(m));
  return m.turns.length >= rounds(m) * m.sides.length;
}
export function winners(m) {
  const sc = m.sides.map((_, s) => score(m, s)), best = Math.max(...sc);
  return sc.map((x, i) => (x === best ? i : -1)).filter((i) => i >= 0);
}

/** Aufnahme erfassen. v = Punkte (bzw. Treffer bei Around the Clock). */
export function submit(m, v) {
  if (m.done) return { type: 'error', msg: 'Spiel ist beendet' };
  const err = validate(m, v);
  if (err) return { type: 'error', msg: err };
  const s = curSide(m);
  const before = score(m, s);
  const t = { s, pid: curThrower(m), v };
  m.turns.push(t);
  if (isDone(m)) { m.done = true; m.winners = winners(m); return { type: 'match', turn: t }; }
  if (m.game === 'halveit' && v === 0) return { type: 'halved', turn: t, before, after: score(m, s) };
  return { type: 'turn', turn: t };
}

export function undo(m) {
  if (!m.turns.length) return false;
  m.turns.pop();
  m.done = false; m.winners = null;
  return true;
}
