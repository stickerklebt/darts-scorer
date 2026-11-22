/* Board-Geometrie (Standard-Steeldart), Koordinaten in mm: Mitte (0,0), x nach rechts, y nach UNTEN, 20 oben.
   Reine Funktionen – genutzt von Kamera-Erkennung (Worker), Kalibrier-Overlay und Tests. */

export const RADII = { bull: 6.35, outer: 15.9, triIn: 99, triOut: 107, dblIn: 162, dblOut: 170 };
export const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const RINGS = [RADII.bull, RADII.outer, RADII.triIn, RADII.triOut, RADII.dblIn, RADII.dblOut];

/** Winkel im Uhrzeigersinn ab oben (Grad, 0–360) */
export const angleOf = (x, y) => ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360;

/** Abstand (mm) zum nächsten Draht: Ringe und – außerhalb des Bulls – die Segmentgrenzen */
export function wireDistance(x, y) {
  const r = Math.hypot(x, y);
  let d = Math.min(...RINGS.map((R) => Math.abs(r - R)));
  if (r > RADII.outer && r <= RADII.dblOut + 2) {
    const a = (angleOf(x, y) + 9) % 18;                // 0 = genau auf einer Grenze
    const da = Math.min(a, 18 - a) * Math.PI / 180;
    d = Math.min(d, r * Math.sin(da));
  }
  return d;
}

/** Punktwert an (x, y) mm → { segment, multiplier, points, label, wire } */
export function scoreFromBoardMM(x, y) {
  const r = Math.hypot(x, y), wire = wireDistance(x, y);
  if (r <= RADII.bull) return { segment: 25, multiplier: 2, points: 50, label: 'BULL', wire };
  if (r <= RADII.outer) return { segment: 25, multiplier: 1, points: 25, label: '25', wire };
  if (r > RADII.dblOut) return { segment: 0, multiplier: 0, points: 0, label: 'MISS', wire };
  const segment = ORDER[Math.floor(((angleOf(x, y) + 9) % 360) / 18) % 20];
  const multiplier = r >= RADII.triIn && r <= RADII.triOut ? 3 : r >= RADII.dblIn ? 2 : 1;
  return { segment, multiplier, points: segment * multiplier, label: `${multiplier === 3 ? 'T' : multiplier === 2 ? 'D' : 'S'}${segment}`, wire };
}

/** Wurf im App-Format { n, m } (n = 0 heißt daneben) */
export const toDart = (s) => ({ n: s.segment, m: s.segment === 0 ? 1 : s.multiplier });
/** Label aus { n, m } */
export const labelOf = (d) => (d.n === 0 ? 'MISS' : d.n === 25 ? (d.m === 2 ? 'BULL' : '25') : `${d.m === 3 ? 'T' : d.m === 2 ? 'D' : 'S'}${d.n}`);

/** Linien fürs Overlay: Ringe (Radien) und Segmentgrenzen (Winkel in Grad) */
export const OVERLAY = { rings: RINGS, spokes: ORDER.map((_, i) => i * 18 - 9) };
