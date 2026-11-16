/* Statistik – wird immer aus den gespeicherten Matches berechnet. Reine Funktionen ohne DOM.
   Grundlage: nur abgeschlossene X01-Matches mit Start 501. */
import { isDoubleAttempt, attemptField, hitsField, label } from './checkout.js';

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
