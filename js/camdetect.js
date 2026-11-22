/* Kamera (Beta): Erkennung ohne fremde Bibliotheken. Reine Rechenlogik, kein DOM.
   1) Kalibrieren: 4 Punkte am äußeren Doppelring antippen (oben bei 20, rechts bei 6, unten bei 3, links bei 11) →
      Homographie Bild → Scheibe (mm, Mitte 0/0, y nach unten wie in bulloff.js).
   2) Vergleich vorher/nachher (Graustufen, verkleinert): die größte zusammenhängende Änderung ist der neue Dart.
      Annahme: Handy steht UNTER der Scheibe und schaut schräg nach oben → die Spitze ist der oberste Teil der Änderung.
   3) Spitze → Scheibe (mm) → Feld (segmentAt). Ergebnis ist nur ein Vorschlag. */
import { segmentAt } from './bulloff.js';

/** Scheibenpunkte der 4 Kalibrierpunkte (äußerer Doppelring, mm) – Reihenfolge wie beim Antippen */
export const CALIB_TARGETS = [[0, -170], [170, 0], [0, 170], [-170, 0]];
export const CALIB_NAMES = ['oben bei der 20', 'rechts bei der 6', 'unten bei der 3', 'links bei der 11'];

/** Homographie aus 4 Punktpaaren (src → dst), als 3×3 (h33 = 1). Gauß-Elimination, 8 Gleichungen. */
export function homography(src, dst) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  const n = 8;
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-12) return null;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  const h = b.map((v, i) => v / A[i][i]);
  return [[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1]];
}
export function project(H, x, y) {
  const w = H[2][0] * x + H[2][1] * y + H[2][2];
  return [(H[0][0] * x + H[0][1] * y + H[0][2]) / w, (H[1][0] * x + H[1][1] * y + H[1][2]) / w];
}

/** RGBA → Graustufen */
export function toGray(rgba, w, h) {
  const g = new Uint8Array(w * h);
  for (let i = 0, j = 0; i < g.length; i++, j += 4) g[i] = (rgba[j] * 77 + rgba[j + 1] * 150 + rgba[j + 2] * 29) >> 8;
  return g;
}
/** Mittlere Helligkeitsänderung zweier Bilder (für „bewegt sich gerade etwas?“) */
export function delta(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i += 4) s += Math.abs(a[i] - b[i]);
  return s / (a.length / 4);
}

/**
 * Größte zusammenhängende Änderung zwischen a und b (nur innerhalb von mask, falls gegeben).
 * → { size, tip: [x, y], box } oder null. Spitze = Mittel der obersten Zeilen der Änderung.
 */
export function changeBlob(a, b, w, h, { thr = 30, mask = null } = {}) {
  const on = new Uint8Array(w * h);
  for (let i = 0; i < on.length; i++) if ((!mask || mask[i]) && Math.abs(a[i] - b[i]) > thr) on[i] = 1;
  const seen = new Uint8Array(w * h), stack = [];
  let best = null;
  for (let i = 0; i < on.length; i++) {
    if (!on[i] || seen[i]) continue;
    const px = [];
    stack.push(i); seen[i] = 1;
    while (stack.length) {
      const p = stack.pop(); px.push(p);
      const x = p % w, y = (p / w) | 0;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
        if (q >= 0 && on[q] && !seen[q]) { seen[q] = 1; stack.push(q); }
      }
    }
    if (!best || px.length > best.length) best = px;
  }
  if (!best || best.length < 6) return null;
  let minY = h, maxY = 0, minX = w, maxX = 0;
  for (const p of best) { const x = p % w, y = (p / w) | 0; minY = Math.min(minY, y); maxY = Math.max(maxY, y); minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
  const band = Math.max(2, Math.round((maxY - minY) * 0.12));
  let sx = 0, sy = 0, n = 0;
  for (const p of best) { const x = p % w, y = (p / w) | 0; if (y <= minY + band) { sx += x; sy += y; n++; } }
  return { size: best.length, tip: [sx / n, sy / n], box: [minX, minY, maxX, maxY] };
}

/** Maske: nur Pixel, die auf der Scheibe liegen (bis knapp außerhalb des Doppelrings) */
export function boardMask(H, w, h, rMax = 185) {
  const m = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [u, v] = project(H, x, y); if (Math.hypot(u, v) <= rMax) m[y * w + x] = 1; }
  return m;
}

/** Bildpunkt (Pixel im verkleinerten Bild) → Dart { n, m, x, y } */
export function fieldOf(H, px, py) {
  const [x, y] = project(H, px, py);
  return { ...segmentAt(x, y), x, y };
}

/**
 * Zustandsautomat der Erkennung, je Bild aufgerufen. state = { ref, prev, still, darts: [] }.
 * Liefert { event: 'dart' | 'clear' | null, dart? }. Größen relativ zur Bildgröße.
 */
export function step(state, gray, w, h, H, mask) {
  const prev = state.prev;
  state.prev = gray;
  if (!state.ref) { state.ref = gray; return { event: null }; }
  if (!prev) return { event: null };
  const moving = delta(prev, gray) > 3.2;
  state.still = moving ? 0 : state.still + 1;
  if (state.still < 2) return { event: null }; // erst wenn das Bild mindestens zwei Takte ruhig ist (jedes ruhige Bild wird verglichen)
  const blob = changeBlob(state.ref, gray, w, h, { mask });
  const area = w * h;
  if (!blob) return { event: null };
  if (blob.size > area * 0.12) { state.ref = gray; state.darts = []; return { event: 'clear' } } // Darts gezogen / jemand vor der Scheibe
  if (blob.size < area * 0.0008) return { event: null };
  state.ref = gray;
  if (state.darts.length >= 3) return { event: null };
  const d = fieldOf(H, blob.tip[0], blob.tip[1]);
  state.darts.push(d);
  return { event: 'dart', dart: d };
}
