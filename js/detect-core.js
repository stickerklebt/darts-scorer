/* Wurferkennung – reine Bildverarbeitung ohne DOM und ohne Bibliothek (läuft im Web Worker und in den Tests).
   Eingabe: Graustufenbilder (Uint8Array, Breite w, Höhe h) eines Ausschnitts um das Board; H bildet Ausschnitt-Pixel auf Board-mm ab.

   Zustandsmaschine (Detector.feed):
   BEREIT → Bewegung (Differenz zum letzten Bild) → warten, bis das Bild STABLE_MS ruhig ist → Vergleich mit der Referenz:
     · fast wie das leere Board (und es steckten Darts)  → 'takeout'  (Referenz = leeres Board)
     · großer Teil verändert + ganzes Bild verschoben     → 'moved'    (Kamera verrutscht, Erkennung pausiert)
     · großer Teil verändert, sonst                        → nichts (jemand steht davor) – nächste Ruhe abwarten
     · neue, längliche Kontur in plausibler Größe          → 'dart'     (Spitze = schmales Ende der Hauptachse)
   Nach jedem Dart wird das aktuelle Bild die neue Referenz. */
import { project } from './homography.js';
import { scoreFromBoardMM } from './board-geometry.js';

export const PARAMS = {
  stableMs: 500, motionMean: 1.4, motionFrac: 0.004, diffThr: 24,
  minArea: 0.00025, maxArea: 0.06, bigChange: 0.18, emptyLike: 0.006, moveGain: 0.55,
};

/** 3×3-Kastenweichzeichner */
export function blur3(g, w, h) {
  const o = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0, n = 0;
    for (let dy = -1; dy <= 1; dy++) { const yy = y + dy; if (yy < 0 || yy >= h) continue; for (let dx = -1; dx <= 1; dx++) { const xx = x + dx; if (xx < 0 || xx >= w) continue; s += g[yy * w + xx]; n++; } }
    o[y * w + x] = (s / n) | 0;
  }
  return o;
}
export function rgbaToGray(rgba, w, h) {
  const g = new Uint8Array(w * h);
  for (let i = 0, j = 0; i < g.length; i++, j += 4) g[i] = (rgba[j] * 77 + rgba[j + 1] * 150 + rgba[j + 2] * 29) >> 8;
  return g;
}
/** Binärmaske |a − b| > thr (nur innerhalb mask) und Anteil der gesetzten Pixel */
export function diffMask(a, b, w, h, thr, mask) {
  const m = new Uint8Array(w * h); let n = 0, area = 0;
  for (let i = 0; i < m.length; i++) { if (mask && !mask[i]) continue; area++; if (Math.abs(a[i] - b[i]) > thr) { m[i] = 1; n++; } }
  return { m, frac: area ? n / area : 0 };
}
export function meanDiff(a, b, mask) {
  let s = 0, n = 0;
  for (let i = 0; i < a.length; i += 3) { if (mask && !mask[i]) continue; s += Math.abs(a[i] - b[i]); n++; }
  return n ? s / n : 0;
}
function morph(m, w, h, keep) { // keep(count of 9 neighbours set) → bool
  const o = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    let c = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) c += m[(y + dy) * w + x + dx];
    o[y * w + x] = keep(c) ? 1 : 0;
  }
  return o;
}
export const erode = (m, w, h) => morph(m, w, h, (c) => c === 9);
export const dilate = (m, w, h) => morph(m, w, h, (c) => c > 0);
export const open = (m, w, h) => dilate(erode(m, w, h), w, h);
export const close = (m, w, h) => erode(dilate(m, w, h), w, h);

/** Zusammenhängende Flächen (8er-Nachbarschaft), größte zuerst */
export function components(m, w, h, minSize = 1) {
  const seen = new Uint8Array(w * h), out = [], st = [];
  for (let i = 0; i < m.length; i++) {
    if (!m[i] || seen[i]) continue;
    const px = []; st.push(i); seen[i] = 1;
    while (st.length) {
      const p = st.pop(); px.push(p);
      const x = p % w, y = (p / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const q = yy * w + xx; if (m[q] && !seen[q]) { seen[q] = 1; st.push(q); }
      }
    }
    if (px.length >= minSize) out.push(px);
  }
  return out.sort((a, b) => b.length - a.length);
}

/**
 * Hauptachse (PCA) einer Kontur, Breite an beiden Enden, Spitze am schmaleren Ende.
 * → { tip: [x, y], axis: [ux, uy], center, length, width, elong, endRatio }
 */
export function dartAxis(px, w) {
  let mx = 0, my = 0;
  for (const p of px) { mx += p % w; my += (p / w) | 0; }
  mx /= px.length; my /= px.length;
  let sxx = 0, syy = 0, sxy = 0;
  for (const p of px) { const dx = (p % w) - mx, dy = ((p / w) | 0) - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
  const th = 0.5 * Math.atan2(2 * sxy, sxx - syy), ux = Math.cos(th), uy = Math.sin(th);
  let tMin = Infinity, tMax = -Infinity;
  const proj = px.map((p) => { const dx = (p % w) - mx, dy = ((p / w) | 0) - my; const t = dx * ux + dy * uy, s = -dx * uy + dy * ux; tMin = Math.min(tMin, t); tMax = Math.max(tMax, t); return [t, s]; });
  const len = Math.max(1, tMax - tMin), band = len * 0.2;
  const spread = (fromMin) => { let lo = Infinity, hi = -Infinity, n = 0; for (const [t, s] of proj) if (fromMin ? t <= tMin + band : t >= tMax - band) { lo = Math.min(lo, s); hi = Math.max(hi, s); n++; } return n ? hi - lo + 1 : 0; };
  const wMin = spread(true), wMax = spread(false);
  const tipAtMin = wMin <= wMax, edge = tipAtMin ? tMin : tMax;
  // Spitze: Mittel der Pixel ganz am schmalen Ende (letzte 4 % der Länge)
  let sx = 0, sy = 0, n = 0;
  proj.forEach(([t], i) => { if (tipAtMin ? t <= edge + len * 0.04 : t >= edge - len * 0.04) { sx += px[i] % w; sy += (px[i] / w) | 0; n++; } });
  let sMax = 0; for (const [, s] of proj) sMax = Math.max(sMax, Math.abs(s));
  return { tip: [sx / n, sy / n], axis: [ux, uy], center: [mx, my], length: len, width: 2 * sMax + 1, elong: len / (2 * sMax + 1),
    endRatio: Math.min(wMin, wMax) / Math.max(1, Math.max(wMin, wMax)) };
}

/** Wie stark passt b verschoben auf a? Beste Verschiebung (±r Pixel) und Gewinn gegenüber keiner Verschiebung */
export function bestShift(a, b, w, h, r = 6, mask = null) {
  const sad = (dx, dy) => { let s = 0, n = 0; for (let y = r; y < h - r; y += 2) for (let x = r; x < w - r; x += 2) { const i = y * w + x; if (mask && !mask[i]) continue; s += Math.abs(a[i] - b[(y + dy) * w + x + dx]); n++; } return n ? s / n : 0; };
  const base = sad(0, 0); let best = { dx: 0, dy: 0, v: base };
  for (let dy = -r; dy <= r; dy += 2) for (let dx = -r; dx <= r; dx += 2) { const v = sad(dx, dy); if (v < best.v) best = { dx, dy, v }; }
  return { ...best, gain: base ? 1 - best.v / base : 0 };
}

/** Konfidenz 0–1: niedrig nah am Draht, bei unklarer Form oder mehreren Kandidaten */
export function confidence(ax, score, candidates) {
  let c = 1;
  if (score.wire < 2) c *= 0.55; else if (score.wire < 4) c *= 0.85;
  if (ax.elong < 1.8) c *= 0.75;
  if (ax.endRatio > 0.8) c *= 0.8;   // beide Enden gleich breit → Spitze unsicher
  if (candidates > 1) c *= 0.75;
  return Math.round(c * 100) / 100;
}

export class Detector {
  constructor(w, h, H, mask, params = {}) {
    Object.assign(this, { w, h, H, mask, p: { ...PARAMS, ...params } });
    this.reset();
  }
  reset() { this.empty = null; this.ref = null; this.prev = null; this.lastMove = 0; this.checked = true; this.darts = 0; this.paused = false; }
  /** Referenz neu setzen (z. B. „Darts gezogen“ auf dem Steuer-Gerät) */
  takeout(g = this.prev) { if (g) { this.empty = g; this.ref = g; } this.darts = 0; this.checked = true; }
  feed(gray, t) {
    const { w, h, mask, p } = this;
    const g = blur3(gray, w, h);
    const prev = this.prev; this.prev = g;
    if (!this.empty) { this.empty = g; this.ref = g; this.lastMove = t; return { state: 'ready' }; }
    if (!prev) return { state: 'ready' };
    const { frac } = diffMask(prev, g, w, h, p.diffThr, mask);
    const moving = meanDiff(prev, g, mask) > p.motionMean || frac > p.motionFrac;
    if (moving) { this.lastMove = t; this.checked = false; return { state: 'motion' }; }
    if (this.paused || this.checked || t - this.lastMove < p.stableMs) return { state: this.paused ? 'paused' : 'ready' };
    this.checked = true;
    const vsRef = diffMask(this.ref, g, w, h, p.diffThr, mask);
    const vsEmpty = diffMask(this.empty, g, w, h, p.diffThr, mask);
    if (this.darts > 0 && vsEmpty.frac < p.emptyLike && vsRef.frac > vsEmpty.frac) { this.takeout(g); return { state: 'ready', event: 'takeout' }; }
    if (vsRef.frac > p.bigChange) {
      const sh = bestShift(this.ref, g, w, h, 6, mask);
      if (sh.gain > p.moveGain && (sh.dx || sh.dy)) { this.paused = true; return { state: 'paused', event: 'moved', shift: sh }; }
      return { state: 'ready' };
    }
    const area = (mask ? mask.reduce((a, v) => a + v, 0) : w * h);
    const m = close(open(vsRef.m, w, h), w, h);
    const comps = components(m, w, h, Math.max(4, Math.round(area * p.minArea))).filter((c) => c.length <= area * p.maxArea);
    if (!comps.length) return { state: 'ready' };
    const ax = dartAxis(comps[0], w);
    const [bx, by] = project(this.H, ax.tip[0], ax.tip[1]);
    const score = scoreFromBoardMM(bx, by);
    this.ref = g; this.darts++;
    return { state: 'ready', event: 'dart', tip: ax.tip, axis: ax, boardX: bx, boardY: by, score,
      confidence: confidence(ax, score, comps.filter((c) => c.length > comps[0].length * 0.5).length), mask: m };
  }
}
