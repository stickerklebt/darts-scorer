/* Fußball-Engine (Partyspiel, immer 1 gegen 1). Reine Logik ohne DOM.
   Jede Seite hat ein Tor = ein Doppelfeld; der Gegner hat das gegenüberliegende Doppel (16 ↔ 4, 20 ↔ 3 …).
   Zu Beginn hat niemand den Ball. Wer Single Bull (25) oder Bullseye (50) trifft, hat den Ball – auch wenn ihn vorher
   der Gegner hatte (Ballgewinn). Den Ball behält man über das Ende der Aufnahme hinaus, bis der Gegner ein Bull trifft.
   Mit Ball zählt ein Treffer auf das gegnerische Doppel als Tor; danach ist der Ball wieder frei (Anstoß: wieder aufs Bull).
   Gewonnen hat, wer zuerst `opts.target` Tore hat.
   Turn = { s, pid, throws: [{ n, m }], goals (Tore in dieser Aufnahme), ball (wer danach den Ball hat: Seite oder null) } */
import { throwerOf } from './match.js';

/** Reihenfolge der Zahlen auf der Scheibe (im Uhrzeigersinn ab 20) */
export const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
/** Das gegenüberliegende Feld (halbe Umdrehung) */
export const opposite = (n) => ORDER[(ORDER.indexOf(n) + 10) % 20];
/** Tor-Doppel der Seite s: Seite 0 hat opts.goal (Standard 16), Seite 1 das gegenüberliegende */
export const goalOf = (m, s) => (s === 0 ? m.opts.goal || 16 : opposite(m.opts.goal || 16));
/** Das Tor, auf das Seite s schießt (das Doppel des Gegners) */
export const targetOf = (m, s) => goalOf(m, 1 - s);
export const target = (m) => m.opts.target || 3;

export const curSide = (m) => (m.first + m.turns.length) % 2;
export const curThrower = (m) => { const s = curSide(m); return throwerOf(m, s, m.turns.filter((t) => t.s === s).length); };

/** Stand: Tore beider Seiten und wer den Ball hat (nach allen Aufnahmen, optional mit den laufenden Darts). */
export function state(m, withPending = true) {
  const goals = [0, 0];
  let ball = null;
  const apply = (s, d) => {
    if (d.n === 25) { ball = s; return 0; }
    if (ball === s && d.m === 2 && d.n === targetOf(m, s)) { goals[s]++; ball = null; return 1; }
    return 0;
  };
  for (const t of m.turns) for (const d of t.throws || []) apply(t.s, d);
  let pendingGoals = 0;
  if (withPending) for (const d of m.pending) pendingGoals += apply(curSide(m), d);
  return { goals, ball, pendingGoals };
}

function recordTurn(m, s) {
  const before = state({ ...m, pending: [] }, false), after = state(m);
  const t = { s, pid: curThrower(m), throws: m.pending.slice(), goals: after.goals[s] - before.goals[s], ball: after.ball };
  t.v = t.goals;
  m.turns.push(t);
  m.pending = [];
  return t;
}

/** Einen Dart erfassen. n: 0–20 oder 25 (0 = daneben), mult: 1–3 (Bull: 1 = 25, 2 = Bullseye). */
export function throwDart(m, n, mult) {
  if (m.done) return { type: 'error', msg: 'Spiel ist beendet' };
  if (n === 0) mult = 1;
  if (n === 25 && mult === 3) return { type: 'error', msg: 'Triple-Bull gibt es nicht' };
  if (!((n >= 0 && n <= 20) || n === 25) || ![1, 2, 3].includes(mult)) return { type: 'error', msg: 'Ungültiger Dart' };
  const s = curSide(m);
  const had = state(m).ball;
  m.pending.push({ n, m: mult });
  const st = state(m);
  if (st.goals[s] >= target(m)) {
    const t = recordTurn(m, s);
    m.done = true; m.winners = [s];
    return { type: 'match', turn: t };
  }
  const ev = st.pendingGoals > 0 && st.ball === null && had === s ? 'goal' : n === 25 && had !== s ? 'ball' : null;
  if (m.pending.length < 3) return { type: 'dart', dart: { n, m: mult }, event: ev };
  const t = recordTurn(m, s);
  return { type: 'turn', turn: t, event: ev };
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

export const score = (m, s) => state(m, false).goals[s];

/** Bot-Ziel: ohne Ball aufs Bull, mit Ball aufs gegnerische Doppel. */
export function aim(m) {
  const s = curSide(m), st = state(m);
  return st.ball === s ? { n: targetOf(m, s), m: 2 } : { n: 25, m: 2 };
}
