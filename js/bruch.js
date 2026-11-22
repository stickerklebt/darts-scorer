/* Bruchchallenge: 3 zufällige Herausforderungen eines Levels, 1 Stunde Zeit. Man hakt selbst ab, was man geschafft hat.
   Reine Logik ohne DOM. Laufende Challenge: S.bruch = { level, ids, done: [bool×3], startedAt, endsAt }.
   Am Ende wird sie als Match (game 'bruch') gespeichert → Historie, Sync; zählt nicht in die 501-Statistik. */

export const DURATION = 60 * 60e3;
export const LEVELS = [
  { id: 1, name: 'Leicht', sub: 'Zum Warmwerfen' },
  { id: 2, name: 'Mittel', sub: 'Für Kneipen-Könige' },
  { id: 3, name: 'Schwer', sub: 'Nur mit Nerven' },
  { id: 4, name: 'Extrem', sub: 'Bühnenreif' },
];

/* 100 Herausforderungen (je Level 25). Alles selbst prüfbar, ohne Hilfsmittel. „Aufnahme“ = 3 Darts. */
const L1 = [
  'Triff mit 9 Darts mindestens 5× die 20 (egal welches Feld der 20).',
  'Wirf eine Aufnahme mit 60 oder mehr Punkten.',
  'Triff die Zahlen 1 bis 10 der Reihe nach – höchstens 30 Darts.',
  'Triff einmal die 25 oder das Bull – höchstens 15 Darts.',
  'Wirf drei Aufnahmen hintereinander mit jeweils mindestens 30 Punkten.',
  'Triff drei verschiedene Doppel – höchstens 30 Darts.',
  'Checke 40 (Doppel 20) – höchstens 9 Darts.',
  'Triff in einer Aufnahme dreimal dieselbe Zahl.',
  'Erziele mit 9 Darts zusammen mindestens 150 Punkte.',
  'Triff ein Triple deiner Wahl – höchstens 15 Darts.',
  'Triff die 19 fünfmal – höchstens 12 Darts.',
  'Checke 32 (Doppel 16) – höchstens 9 Darts.',
  'Spiele 101 Single Out in höchstens 6 Aufnahmen.',
  'Triff in einer Aufnahme die 5, die 20 und die 1 (Reihenfolge egal).',
  'Triff 20, 1 und 18 im Uhrzeigersinn nacheinander – höchstens 9 Darts.',
  'Wirf 10 Aufnahmen hintereinander ohne eine einzige Null.',
  'Triff mindestens 4× den Doppelring (egal welche Zahl) – höchstens 15 Darts.',
  'Erziele 100 Punkte mit 6 Darts.',
  'Triff 3× die 25 oder das Bull – höchstens 24 Darts.',
  'Triff jede Zahl der oberen Hälfte (11, 14, 9, 12, 5, 20, 1, 18, 4, 13) einmal.',
  'Checke 20 (Doppel 10) – höchstens 9 Darts.',
  'Triff in drei Aufnahmen hintereinander jeweils mindestens einmal die 16.',
  'Erziele in 5 Aufnahmen zusammen mindestens 200 Punkte.',
  'Triff 15, 16, 17, 18, 19 und 20 je einmal – höchstens 18 Darts.',
  'Checke 8 (Doppel 4) und danach 16 (Doppel 8) – jeweils höchstens 6 Darts.',
];
const L2 = [
  'Wirf eine Aufnahme mit 100 oder mehr.',
  'Checke 50 (z. B. 10, Doppel 20 oder Bull) – höchstens 6 Darts.',
  'Triff 3× die Triple 20 – höchstens 15 Darts.',
  'Spiele Around the Clock 1–20 (Single reicht) in höchstens 40 Darts.',
  'Triff Doppel 20, Doppel 16 und Doppel 8 – jedes mit höchstens 3 Darts.',
  'Spiele 301 Double Out in höchstens 30 Darts.',
  'Wirf fünf Aufnahmen hintereinander mit jeweils mindestens 41 Punkten.',
  'Checke 60 in einer Aufnahme (z. B. 20, Doppel 20).',
  'Triff das Bull (50) einmal – höchstens 12 Darts.',
  'Erziele mit 9 Darts zusammen mindestens 200 Punkte.',
  'Triff 5 verschiedene Triples – höchstens 30 Darts.',
  'Checke 81 in höchstens zwei Aufnahmen.',
  'Triff jedes Triple von 15 bis 20 einmal – höchstens 60 Darts.',
  'Checke 32 dreimal hintereinander – jeweils höchstens 6 Darts.',
  'Wirf drei Aufnahmen hintereinander mit jeweils über 60.',
  'Spiele Around the Clock nur auf Doppel D1–D10 in höchstens 50 Darts.',
  'Checke 121 in höchstens 9 Darts.',
  'Triff 10 Doppel (beliebig) – höchstens 30 Darts.',
  'Erziele in 10 Aufnahmen zusammen mindestens 500 Punkte.',
  'Beende ein Leg auf dem Bull (50) – Rest selbst wählen, höchstens 9 Darts.',
  'Triff 2× die Triple 17 – höchstens 15 Darts.',
  'Shanghai 1–7: triff in jeder Runde (3 Darts) mindestens einmal die Rundenzahl.',
  'Cricket solo: schließe 20 bis 15 und Bull (je 3 Treffer) in höchstens 60 Darts.',
  'Checke zwei verschiedene Restwerte über 50, jeweils in einer Aufnahme.',
  'Triff in einer Aufnahme zwei Triples (egal welche).',
];
const L3 = [
  'Wirf eine Aufnahme mit 140 oder mehr.',
  'Checke 100 in einer Aufnahme.',
  'Spiele 501 Double Out in höchstens 24 Darts.',
  'Triff 3× das Bull (50) – höchstens 15 Darts.',
  'Checke alle Doppel von D1 bis D20 der Reihe nach – höchstens 80 Darts.',
  'Wirf drei Aufnahmen mit 100+ innerhalb von 10 Aufnahmen.',
  'Checke 121 in höchstens 6 Darts.',
  'Erziele in 10 Aufnahmen zusammen mindestens 600 Punkte.',
  'Triff 3× die Triple 20 – höchstens 9 Darts.',
  'Checke 70, 80 und 90 – jeweils höchstens 6 Darts.',
  'Spiele Around the Clock nur auf Triples T1–T20 in höchstens 90 Darts.',
  'Triff in einer Aufnahme zwei Doppel (egal welche).',
  'Gewinne zwei Legs 301 Double Out hintereinander – jeweils höchstens 18 Darts.',
  'Triff in einer Aufnahme drei verschiedene Triples.',
  'Checke 60 dreimal hintereinander – jeweils mit höchstens 3 Darts.',
  'Triff 20 Doppel (beliebig) – höchstens 60 Darts.',
  'Triff die Doppel 16 zehnmal – höchstens 30 Darts.',
  'Wirf fünf Aufnahmen hintereinander mit jeweils 60 oder mehr.',
  'Checke 110 in einer Aufnahme.',
  'Cricket solo: schließe 20 bis 15 und Bull in höchstens 40 Darts.',
  'Triff mit dem ersten Dart von drei Aufnahmen hintereinander die 25 oder das Bull.',
  'Spiele 501 Double Out mit einem Average über 50 (höchstens 30 Darts).',
  'Triff 3× die Triple 19 – höchstens 12 Darts.',
  'Checke 41, 45 und 50 – jeweils in einer Aufnahme.',
  'Triff die Doppel 20 dreimal – höchstens 9 Darts.',
];
const L4 = [
  'Wirf eine 180.',
  'Checke 170 (Triple 20, Triple 20, Bull) – der Big Fish.',
  'Spiele 501 Double Out in höchstens 15 Darts.',
  'Spiele 501 Double Out in höchstens 12 Darts.',
  'Checke 121 in einer Aufnahme.',
  'Triff dreimal das Bull (50) in einer Aufnahme.',
  'Wirf zwei Aufnahmen mit 140+ hintereinander.',
  'Checke die Doppel D1 bis D20 der Reihe nach – höchstens 50 Darts.',
  'Triff 5× die Triple 20 – höchstens 9 Darts.',
  'Erziele in 10 Aufnahmen zusammen mindestens 1000 Punkte.',
  'Checke zweimal hintereinander einen Rest von 100 oder mehr – jeweils in einer Aufnahme.',
  'Triff alle Triples von T1 bis T20 – höchstens 60 Darts.',
  'Triff in einer Aufnahme dreimal den Doppelring.',
  'Checke 141 in einer Aufnahme.',
  'Spiele 701 Double Out in höchstens 24 Darts.',
  'Wirf fünf Aufnahmen hintereinander mit jeweils 100 oder mehr.',
  'Triff Single, Double und Triple derselben Zahl in einer Aufnahme (Shanghai).',
  'Checke 160 (Triple 20, Triple 20, Doppel 20).',
  'Triff 10× das Bull (50) – höchstens 45 Darts.',
  'Cricket solo: schließe 20 bis 15 und Bull in höchstens 24 Darts.',
  'Checke 99 in einer Aufnahme.',
  'Gewinne drei Legs 301 Double Out hintereinander – jeweils höchstens 12 Darts.',
  'Triff das Bull (50) mit den ersten beiden Darts einer Aufnahme.',
  'Erziele 300 Punkte mit 6 Darts.',
  'Checke 10 verschiedene Restwerte über 80 – jeweils in einer Aufnahme.',
];

export const CHALLENGES = [L1, L2, L3, L4].flatMap((list, i) => list.map((text, k) => ({ id: `b${i + 1}-${String(k + 1).padStart(2, '0')}`, level: i + 1, text })));
export const challenge = (id) => CHALLENGES.find((c) => c.id === id) || null;

/** 3 verschiedene zufällige Herausforderungen eines Levels */
export function draw(level, rnd = Math.random) {
  const pool = CHALLENGES.filter((c) => c.level === level).map((c) => c.id);
  const out = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out;
}

export function start(level, now = Date.now(), rnd = Math.random) {
  return { level, ids: draw(level, rnd), done: [false, false, false], startedAt: now, endsAt: now + DURATION };
}
export const left = (b, now = Date.now()) => Math.max(0, b.endsAt - now);
export const allDone = (b) => b.done.every(Boolean);

/** Fertige Challenge als Match für Historie/Sync. Geschafft = alle 3 innerhalb der Stunde. */
export function toMatch(b, pid, now = Date.now(), id = `m_${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`) {
  const won = allDone(b);
  return {
    id, game: 'bruch', opts: { level: b.level }, sides: [[pid]], playerIds: [pid], first: 0, pending: [], turns: [],
    startedAt: b.startedAt, endedAt: Math.min(now, b.endsAt), done: true, winners: won ? [0] : [],
    bruch: { level: b.level, items: b.ids.map((cid, i) => ({ id: cid, text: challenge(cid)?.text || '', done: !!b.done[i] })) },
  };
}
