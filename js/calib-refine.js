/* Kalibrierung automatisch verfeinern: entlang von Strahlen aus der Board-Mitte die Kanten der farbigen Ringe (Double 162/170 mm,
   Triple 99/107 mm) im Bild suchen – Farbsättigung springt dort. Jede gefundene Kante ist ein Punktpaar Bild ↔ Board-mm.
   Reine Funktion (RGBA-Pixel rein, Punktpaare raus); die Homographie wird danach robust aus allen Paaren geschätzt. */
import { project } from './homography.js';

const EDGES = [[170, -1], [162, 1], [107, -1], [99, 1]]; // [Radius, Sättigung nach außen: −1 fällt, +1 steigt]

function satAt(px, W, Hh, x, y) {
  const x0 = Math.floor(x), y0 = Math.floor(y); if (x0 < 0 || y0 < 0 || x0 >= W - 1 || y0 >= Hh - 1) return null;
  const fx = x - x0, fy = y - y0, s = (i) => { const r = px[i], g = px[i + 1], b = px[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx ? (mx - mn) / mx : 0; };
  const i = (y0 * W + x0) * 4;
  return s(i) * (1 - fx) * (1 - fy) + s(i + 4) * fx * (1 - fy) + s(i + W * 4) * (1 - fx) * fy + s(i + W * 4 + 4) * fx * fy;
}

/**
 * rgba: Pixel (W×Hh), toImage: Homographie Board-mm → Bildpixel (Startschätzung). → [{ img: [x, y], board: [bx, by] }]
 */
export function ringEdges(rgba, W, Hh, toImage, { angles = 90, span = 6 } = {}) {
  const out = [];
  for (let k = 0; k < angles; k++) {
    const deg = (k / angles) * 360, rel = ((deg + 9) % 18 + 18) % 18;
    if (rel < 2 || rel > 16) continue; // nicht direkt auf einem Segmentdraht
    const a = (deg * Math.PI) / 180, sx = Math.sin(a), sy = -Math.cos(a);
    for (const [R, sign] of EDGES) {
      const prof = [];
      for (let r = R - span; r <= R + span; r += 0.25) { const [x, y] = project(toImage, r * sx, r * sy); prof.push([r, satAt(rgba, W, Hh, x, y)]); }
      if (prof.some(([, v]) => v === null)) continue;
      let best = null;
      for (let i = 2; i < prof.length - 2; i++) {
        const g = sign * ((prof[i + 1][1] + prof[i + 2][1]) - (prof[i - 1][1] + prof[i - 2][1])) / 2;
        if (!best || g > best.g) best = { i, g };
      }
      if (!best || best.g < 0.12) continue;
      // Parabel durch die Nachbarn → Subpixel-Lage der Kante
      const gAt = (i) => sign * ((prof[i + 1][1] + (prof[i + 2]?.[1] ?? prof[i + 1][1])) - (prof[i - 1][1] + (prof[i - 2]?.[1] ?? prof[i - 1][1]))) / 2;
      const i = best.i, y1 = gAt(i - 1), y2 = best.g, y3 = gAt(i + 1), den = y1 - 2 * y2 + y3;
      const r = prof[i][0] + (Math.abs(den) > 1e-9 ? (0.5 * (y1 - y3) / den) * 0.25 : 0);
      out.push({ img: project(toImage, r * sx, r * sy), board: [R * sx, R * sy], ring: true });
    }
  }
  return out;
}

/** Farbwerte an (x, y): Rot-minus-Grün (Ring-Segmente wechseln rot/grün) und Helligkeit (Single-Felder hell/dunkel) */
function colAt(px, W, Hh, x, y) {
  const x0 = Math.floor(x), y0 = Math.floor(y); if (x0 < 0 || y0 < 0 || x0 >= W - 1 || y0 >= Hh - 1) return null;
  const fx = x - x0, fy = y - y0, ws = [(1 - fx) * (1 - fy), fx * (1 - fy), (1 - fx) * fy, fx * fy], is = [0, 4, W * 4, W * 4 + 4].map((o) => (y0 * W + x0) * 4 + o);
  let r = 0, g = 0, b = 0; is.forEach((i, k) => { r += px[i] * ws[k]; g += px[i + 1] * ws[k]; b += px[i + 2] * ws[k]; });
  return { rg: (r - g) / 255, lum: (r * 0.3 + g * 0.59 + b * 0.11) / 255 };
}
/**
 * Segmentdrähte: auf mehreren Radien quer über jede der 20 Grenzen (alle 18°, um 9° versetzt) den Farbwechsel suchen.
 * → [{ img, board }] mit der Board-Position genau auf dem Draht (so wird die Drehung des Boards bestimmt).
 */
export function wireEdges(rgba, W, Hh, toImage) {
  const out = [], RS = [[60, 'lum'], [103, 'rg'], [135, 'lum'], [166, 'rg']];
  for (let k = 0; k < 20; k++) {
    const phi = k * 18 - 9;
    for (const [r, ch] of RS) {
      const prof = [];
      for (let d = -4; d <= 4; d += 0.1) { const a = ((phi + d) * Math.PI) / 180, [x, y] = project(toImage, r * Math.sin(a), -r * Math.cos(a)); const c = colAt(rgba, W, Hh, x, y); prof.push([d, c && c[ch]]); }
      if (prof.some(([, v]) => v === null)) continue;
      let best = null;
      const gAt = (i) => Math.abs((prof[i + 1][1] + prof[i + 2][1] + prof[i + 3][1]) - (prof[i - 1][1] + prof[i - 2][1] + prof[i - 3][1])) / 3;
      for (let i = 3; i < prof.length - 3; i++) { const g = gAt(i); if (!best || g > best.g) best = { i, g }; }
      if (!best || best.g < 0.15) continue;
      // Parabel durch die Nachbarn → Lage des Drahts zwischen den Abtastpunkten
      let dd = prof[best.i][0];
      if (best.i > 3 && best.i < prof.length - 4) { const y1 = gAt(best.i - 1), y2 = best.g, y3 = gAt(best.i + 1), den = y1 - 2 * y2 + y3; if (Math.abs(den) > 1e-9) dd += (0.5 * (y1 - y3) / den) * 0.1; }
      const a = ((phi + dd) * Math.PI) / 180, b = (phi * Math.PI) / 180;
      out.push({ img: project(toImage, r * Math.sin(a), -r * Math.cos(a)), board: [r * Math.sin(b), -r * Math.cos(b)] });
    }
  }
  return out;
}

/**
 * Ganze Verfeinerung: mit den getippten Punkten starten, dann mehrmals Ring- und Drahtkanten suchen und die Homographie robust
 * neu schätzen (jede Runde mit der besseren Schätzung). fit(src, dst) = robuste Homographie, inv = Matrix-Inverse.
 * → { toBoard, toImage, n, rms } (rms in mm über alle Kantenpunkte)
 */
export function refineCalibration(rgba, W, Hh, tapsImg, tapsBoard, { fit, inv, rounds = 14 }) {
  let toBoard = fit(tapsImg, tapsBoard), toImage = toBoard && inv(toBoard), edges = [];
  for (let k = 0; k < rounds && toImage; k++) {
    edges = [...ringEdges(rgba, W, Hh, toImage), ...wireEdges(rgba, W, Hh, toImage)];
    if (edges.length < 12) break;
    // Ringkanten: Board-Punkt in Richtung der aktuellen Schätzung (der Radius ist sicher, der Winkel kommt von den Drähten)
    const src = [], dst = [];
    for (const e of edges) {
      src.push(e.img);
      if (e.ring) { const [x, y] = project(toBoard, e.img[0], e.img[1]), R = Math.hypot(...e.board), r = Math.hypot(x, y) || 1; dst.push([(x / r) * R, (y / r) * R]); }
      else dst.push(e.board);
    }
    if (k === 0) for (let i = 0; i < tapsImg.length; i++) { src.push(tapsImg[i]); dst.push(tapsBoard[i]); } // getippte Punkte nur zum Start
    const H = fit(src, dst); if (!H) break;
    toBoard = H; toImage = inv(H);
  }
  let se = 0; for (const e of edges) { const [x, y] = project(toBoard, e.img[0], e.img[1]); const r = Math.hypot(x, y), R = Math.hypot(...e.board); se += (r - R) ** 2; }
  return { toBoard, toImage, n: edges.length, edges, rms: edges.length ? Math.sqrt(se / edges.length) : null };
}
