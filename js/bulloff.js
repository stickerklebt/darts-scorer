/* Ausbullen + echte Scheibengeometrie (Millimeter). Reine Logik ohne DOM.
   Koordinaten: Mittelpunkt (0,0), x nach rechts, y nach unten, 20 oben. */

/** Echte Maße einer Steeldart-Scheibe in mm (Radien). */
export const MM = { bull: 6.35, outer: 15.9, triIn: 99, triOut: 107, dblIn: 162, dblOut: 170, edge: 225 };
export const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

/** Welches Feld liegt an (x,y)? → { n, m } (n = 0 heißt daneben) */
export function segmentAt(x, y) {
  const r = Math.hypot(x, y);
  if (r <= MM.bull) return { n: 25, m: 2 };
  if (r <= MM.outer) return { n: 25, m: 1 };
  if (r > MM.dblOut) return { n: 0, m: 1 };
  const a = ((Math.atan2(x, -y) * 180) / Math.PI + 360 + 9) % 360;
  const n = ORDER[Math.floor(a / 18) % 20];
  if (r >= MM.triIn && r <= MM.triOut) return { n, m: 3 };
  if (r >= MM.dblIn) return { n, m: 2 };
  return { n, m: 1 };
}

/** Zielpunkt (Mitte des Feldes) für einen Dart { n, m }. Single = großes äußeres Single-Feld. */
export function aimPoint(d) {
  if (d.n === 25) return d.m === 2 ? { x: 0, y: 0 } : { x: 0, y: -(MM.bull + MM.outer) / 2 };
  const i = ORDER.indexOf(d.n);
  const r = d.m === 3 ? (MM.triIn + MM.triOut) / 2 : d.m === 2 ? (MM.dblIn + MM.dblOut) / 2 : (MM.triOut + MM.dblIn) / 2;
  const a = (i * 18 * Math.PI) / 180;
  return { x: r * Math.sin(a), y: -r * Math.cos(a) };
}

/* ---------------- Ausbullen ---------------- */

/** Neues Ausbullen für n Seiten. */
export function createBulloff(n) {
  return { contenders: Array.from({ length: n }, (_, i) => i), throws: [], rounds: [], winner: null };
}

/** Seite, die als Nächstes wirft (oder null, wenn die Runde komplett ist). */
export const bullNext = (b) => (b.winner !== null ? null : b.contenders[b.throws.length] ?? null);

/**
 * Auswertung einer Runde: Wer am nächsten am Mittelpunkt ist, gewinnt.
 * Gleichstand: mehrere im Bull (50) oder – wenn keiner im Bull – mehrere im Single Bull (25),
 * oder exakt gleicher Abstand. Dann werfen nur diese erneut.
 * @returns { group: [Seiten], winner: Seite | null }
 */
export function evaluateRound(throws) {
  const ds = throws.map((t) => ({ s: t.s, d: Math.hypot(t.x, t.y) }));
  const min = Math.min(...ds.map((t) => t.d));
  let group;
  if (min <= MM.bull) group = ds.filter((t) => t.d <= MM.bull);
  else if (min <= MM.outer) group = ds.filter((t) => t.d <= MM.outer);
  else group = ds.filter((t) => t.d === min);
  const ids = group.map((t) => t.s);
  return { group: ids, winner: ids.length === 1 ? ids[0] : null };
}

/** Dart setzen (bestätigt). Gibt nach dem letzten Dart der Runde die Auswertung zurück. */
export function bullThrow(b, x, y) {
  const s = bullNext(b);
  if (s === null) return null;
  b.throws.push({ s, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
  if (b.throws.length < b.contenders.length) return { type: 'next' };
  const res = evaluateRound(b.throws);
  b.rounds.push({ throws: b.throws, ...res });
  if (res.winner !== null) { b.winner = res.winner; return { type: 'winner', ...res }; }
  b.contenders = res.group;
  b.throws = [];
  return { type: 'tie', ...res };
}

/** Letzten bestätigten Dart der laufenden Runde zurücknehmen. */
export function bullUndo(b) {
  if (b.winner !== null || !b.throws.length) return false;
  b.throws.pop();
  return true;
}
