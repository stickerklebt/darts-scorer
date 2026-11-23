/* Spielhistorie: alle abgeschlossenen Spiele (jeder Modus) als Liste, Löschen einzelner Spiele.
   Reine Funktionen ohne DOM. Gelöschte Spiele verschwinden aus S.matches – damit aus jeder Statistik (die immer aus
   S.matches berechnet wird) und per Sync auch vom Server (Konto, andere Geräte, Freundes-Statistik). */
import * as X from './x01.js';
import * as G from './party.js';
import * as C from './cricket.js';
import * as F from './football.js';

const when = (m) => m.endedAt ?? m.startedAt ?? 0;

/** Filter der Historie: Schlüssel → passt das Spiel? */
export const HISTORY_FILTERS = {
  all: () => true,
  x01: (m) => m.game === 'x01',
  cricket: (m) => m.game === 'cricket',
  party: (m) => m.game !== 'x01' && m.game !== 'cricket',
};

/** Punktestand einer Seite in Party/Cricket (wie auf dem Ergebnis-Screen) */
function sideValue(m, s) {
  if (m.game === 'cricket') {
    const ck = C.state(m, false);
    return m.opts.mode === 'close' ? C.TARGETS.filter((t) => ck.marks[s][t] >= 3).length : ck.pts[s];
  }
  if (m.game === 'football') return F.score(m, s);
  return G.score(m, s);
}

/** Ergebnis als kurzer Text, z. B. „2 : 1 Legs“, „345 : 280“, „Solo · 21 Darts“ */
export function resultText(m) {
  try {
    if (m.game === 'bruch') return `${(m.bruch?.items || []).filter((x) => x.done).length} / 3 geschafft`;
    if (m.game === 'x01') {
      if (m.sides.length === 1) { const st = X.matchStats(m, { s: 0 }); return `${st.darts} Darts`; }
      return X.isSets(m) ? `${m.sides.map((_, s) => X.setsWon(m, s)).join(' : ')} Sets` : `${m.sides.map((_, s) => X.legsWon(m, s)).join(' : ')} Legs`;
    }
    const v = m.sides.map((_, s) => sideValue(m, s));
    const unit = m.game === 'atc' ? ` / ${G.atcTotal(m)}` : m.game === 'cricket' && m.opts.mode === 'close' ? ' / 7' : m.game === 'football' ? ' Tore' : ' Pkt';
    return `${v.join(' : ')}${unit}`;
  } catch (e) { return ''; }
}

/**
 * Zeilen der Historie, neueste zuerst.
 * outcome aus Sicht von `pid` (Hauptspieler): 'win' | 'loss' | 'draw' | 'solo' | null (nicht mitgespielt)
 */
export function historyRows(matches, pid, filter = 'all') {
  const ok = HISTORY_FILTERS[filter] || HISTORY_FILTERS.all;
  return matches.filter((m) => m.done && ok(m)).sort((a, b) => when(b) - when(a)).map((m) => {
    const s = m.sides.findIndex((side) => side.includes(pid));
    const w = m.winners || [];
    let outcome = null;
    if (m.sides.length === 1) outcome = s >= 0 ? 'solo' : null;
    else if (s >= 0) outcome = w.includes(s) ? (w.length > 1 ? 'draw' : 'win') : 'loss';
    let avg = null;
    if (m.game === 'x01' && s >= 0) { try { avg = X.matchStats(m, { pid }).avg; } catch (e) { avg = null; } }
    return {
      id: m.id, game: m.game, start: m.opts?.start ?? null, date: when(m), side: s, outcome, avg, demo: !!m.demo,
      opp: m.sides.filter((_, i) => i !== s).flat(), winners: w.map((i) => m.sides[i]), result: resultText(m),
    };
  });
}

/** Ein gespeichertes Spiel endgültig löschen. Gibt true zurück, wenn es das Spiel gab. */
export function deleteMatch(S, id) {
  const before = S.matches.length;
  S.matches = S.matches.filter((m) => m.id !== id);
  if (S.matches.length < before) S.pendingRemove = [...new Set([...(S.pendingRemove || []), id])]; // ausdrücklich gelöscht → Server
  if (S.current && S.current.id === id && S.current.done) S.current = null; // Ergebnis-Screen dieses Spiels nicht wiederbeleben
  return S.matches.length < before;
}
