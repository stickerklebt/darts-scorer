/* Match-Objekt anlegen (für alle Spiele gleich). */

let counter = 0;
const mid = () => `m_${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

/**
 * @param game   'x01' | 'highscore' | 'shanghai' | 'halveit' | 'atc'
 * @param sides  [[profileId, …], …] – eine Seite ist ein Spieler oder ein Team
 * @param opts   Spieloptionen
 * @param first  Index der Seite, die anfängt
 */
export function createMatch(game, sides, opts, first = 0, now = Date.now()) {
  const m = {
    id: mid(), game, opts: { ...opts },
    sides: sides.map((s) => [...s]), playerIds: sides.flat(),
    first: first % sides.length, startedAt: now, done: false, winners: null, pending: [],
  };
  if (game === 'x01') m.legs = [{ set: 1, starter: m.first, turns: [] }];
  else m.turns = [];
  return m;
}

/** Werfer einer Seite: Mitglieder reihum, Reihenfolge läuft über das ganze Match. */
export const throwerOf = (m, s, sideTurnsSoFar) => m.sides[s][sideTurnsSoFar % m.sides[s].length];
