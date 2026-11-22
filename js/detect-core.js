/* Wurferkennung – reine Bildverarbeitung ohne DOM und ohne Bibliothek (läuft im Web Worker und in den Tests).
   Eingabe: Graustufenbilder (Uint8Array, Breite w, Höhe h) eines Ausschnitts um das Board; H bildet Ausschnitt-Pixel auf Board-mm ab.

   Zustandsmaschine (Detector.feed):
   BEREIT → Bewegung (Differenz zum letzten Bild) → warten, bis das Bild STABLE_MS ruhig ist → Vergleich mit der Referenz:
     · fast wie das leere Board (und es steckten Darts)  → 'takeout'  (Referenz = leeres Board)
     · großer Teil verändert + ganzes Bild verschoben     → 'moved'    (Kamera verrutscht, Erkennung pausiert)
     · großer Teil verändert, sonst                        → nichts (jemand steht davor) – nächste Ruhe abwarten
     · neue, längliche Kontur in plausibler Größe          → 'dart'     (Spitze = schmales Ende der Hauptachse)
   Nach jedem Dart wird das aktuelle Bild die neue Referenz. */
import { project, inv3, poseFromH } from './homography.js';
import { scoreFromBoardMM } from './board-geometry.js';

export const PARAMS = {
  stableMs: 450, motionMean: 1.4, motionFrac: 0.0015, diffThr: 24, recheckMs: 900,
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
/** Mittlere Helligkeit (für den Ausgleich der automatischen Belichtung der Handykamera) */
export function meanOf(g, mask) { let s = 0, n = 0; for (let i = 0; i < g.length; i += 2) { if (mask && !mask[i]) continue; s += g[i]; n++; } return n ? s / n : 0; }
/** Binärmaske |a − b| > thr (nur innerhalb mask) und Anteil der gesetzten Pixel. comp: Helligkeitsunterschied ausgleichen */
export function diffMask(a, b, w, h, thr, mask, comp = false) {
  const off = comp ? meanOf(b, mask) - meanOf(a, mask) : 0;
  const m = new Uint8Array(w * h); let n = 0, area = 0;
  for (let i = 0; i < m.length; i++) { if (mask && !mask[i]) continue; area++; if (Math.abs(a[i] + off - b[i]) > thr) { m[i] = 1; n++; } }
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
  // Breitenprofil entlang der Achse: die breiteste Stelle ist die Flight – die Spitze ist das Ende auf der ANDEREN Seite.
  const BINS = 10, prof = Array.from({ length: BINS }, () => [Infinity, -Infinity]);
  for (const [t, s] of proj) { const b = Math.min(BINS - 1, Math.floor(((t - tMin) / len) * BINS)); prof[b][0] = Math.min(prof[b][0], s); prof[b][1] = Math.max(prof[b][1], s); }
  const widths = prof.map(([lo, hi]) => (hi >= lo ? hi - lo + 1 : 0));
  const fb = widths.indexOf(Math.max(...widths));
  const sorted = widths.filter((x) => x > 0).sort((a, b) => a - b), median = sorted[Math.floor(sorted.length / 2)] || 1;
  const flightClear = widths[fb] >= median * 1.4 && fb !== (BINS - 1) / 2;
  // Flight klar zu sehen → Spitze am Ende gegenüber; sonst: schmaleres Ende
  const tipAtMin = flightClear ? fb >= BINS / 2 : wMin <= wMax;
  // Endpunkte: Mittel der Pixel ganz am jeweiligen Ende (letzte 4 % der Länge)
  const endPt = (atMin) => {
    const edge = atMin ? tMin : tMax; let sx = 0, sy = 0, n = 0;
    proj.forEach(([t], i) => { if (atMin ? t <= edge + len * 0.04 : t >= edge - len * 0.04) { sx += px[i] % w; sy += (px[i] / w) | 0; n++; } });
    return [sx / n, sy / n];
  };
  const tip = endPt(tipAtMin), tail = endPt(!tipAtMin);
  let sMax = 0; for (const [, s] of proj) sMax = Math.max(sMax, Math.abs(s));
  return { tip, tail, axis: [ux, uy], center: [mx, my], length: len, width: 2 * sMax + 1, elong: len / (2 * sMax + 1), flightClear,
    endRatio: flightClear ? 0.3 : Math.min(wMin, wMax) / Math.max(1, Math.max(wMin, wMax)) };
}

/**
 * Ein Dart zerfällt im Differenzbild oft in Stücke (Flight, Schaft, Barrel). Stücke, die auf der Achse des größten Teils liegen
 * und nah genug sind, werden zu einem Dart zusammengefasst – damit Spitze UND Flight in einer Kontur stecken.
 */
export function mergeDart(comps, w) {
  if (comps.length < 2) return comps[0];
  let base = comps[0].slice();
  for (let round = 0; round < 2; round++) {
    const ax = dartAxis(base, w), [cx, cy] = ax.center, [ux, uy] = ax.axis;
    for (const c of comps.slice(1)) {
      if (c.__used) continue;
      let mx = 0, my = 0; for (const p of c) { mx += p % w; my += (p / w) | 0; } mx /= c.length; my /= c.length;
      const dx = mx - cx, dy = my - cy, along = dx * ux + dy * uy, across = Math.abs(-dx * uy + dy * ux);
      if (across <= ax.width * 0.9 + 4 && Math.abs(along) <= ax.length * 1.6 + 12) { c.__used = true; base = base.concat(c); }
    }
  }
  return base;
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

/**
 * Welches Ende ist die Spitze? Über die Board-Normale: Ein Dart ragt senkrecht aus dem Board heraus. Steckt Ende E im Board,
 * muss das andere Ende in der Richtung liegen, in die ein Punkt „E + 50 mm aus dem Board“ im Bild wandert. Das Ende, für das das
 * besser passt, ist die Spitze. → { tipFirst: true|false|null (unklar), margin }
 */
export function tipByNormal(ax, H, pose) {
  // Nur bei schräger Kamera aussagekräftig (von vorn zeigt die Normale fast genau auf die Kamera) – sonst Flight-Profil
  if (!pose || Math.abs(pose.r3[2]) > 0.94) return { tipFirst: null, margin: 0 };
  const score = (E, O) => {
    const [bx, by] = project(H, E[0], E[1]), [qx, qy] = pose.project3(bx, by, 50);
    const vx = qx - E[0], vy = qy - E[1], dx = O[0] - E[0], dy = O[1] - E[1];
    const nv = Math.hypot(vx, vy), nd = Math.hypot(dx, dy);
    return nv > 0.5 && nd > 0.5 ? (vx * dx + vy * dy) / (nv * nd) : 0;
  };
  const a = score(ax.tip, ax.tail), b = score(ax.tail, ax.tip);
  return { tipFirst: Math.abs(a - b) < 0.25 ? null : a > b, margin: Math.abs(a - b) };
}

export class Detector {
  constructor(w, h, H, mask, params = {}) {
    Object.assign(this, { w, h, H, mask, p: { ...PARAMS, ...params } });
    // Kamera-Pose aus der Kalibrierung (Hauptpunkt = Videomitte in Ausschnitt-Koordinaten); ohne Angabe: Ausschnittmitte
    const Hb = inv3(H), pp = this.p.pp || [w / 2, h / 2];
    this.pose = Hb ? poseFromH(Hb, pp[0], pp[1], this.p.fGuess || Math.max(w, h) * 1.1) : null;
    this.reset();
  }
  reset() { this.empty = null; this.ref = null; this.prev = null; this.lastMove = 0; this.lastEval = 0; this.checked = true; this.darts = 0; this.paused = false; this.bigRuns = 0; this.dartMask = null; }
  /** Referenz neu setzen (z. B. „Darts gezogen“ auf dem Steuer-Gerät) */
  takeout(g = this.prev) { if (g) { this.empty = g; this.ref = g; } this.darts = 0; this.checked = true; this.dartMask = null; }
  feed(gray, t) {
    const { w, h, mask, p } = this;
    const g = blur3(gray, w, h);
    const prev = this.prev; this.prev = g;
    if (!this.empty) { this.empty = g; this.ref = g; this.lastMove = t; return { state: 'ready' }; }
    if (!prev) return { state: 'ready' };
    const { frac } = diffMask(prev, g, w, h, p.diffThr, mask);
    const moving = meanDiff(prev, g, mask) > p.motionMean || frac > p.motionFrac;
    if (moving) { this.lastMove = t; this.checked = false; return { state: 'motion' }; }
    if (this.paused) return { state: 'paused' };
    // Ausgewertet wird nach jeder Bewegung, sobald es ruhig ist – und zusätzlich regelmäßig, denn ein Dart von der Seite
    // gesehen verändert oft zu wenig, um als Bewegung zu gelten.
    if (t - this.lastMove < p.stableMs || (this.checked && t - this.lastEval < p.recheckMs)) return { state: 'ready' };
    this.checked = true; this.lastEval = t;
    const vsRef = diffMask(this.ref, g, w, h, p.diffThr, mask, true);
    const vsEmpty = diffMask(this.empty, g, w, h, p.diffThr, mask, true);
    if (this.darts > 0 && vsEmpty.frac < p.emptyLike && vsRef.frac > vsEmpty.frac) { this.takeout(g); return { state: 'ready', event: 'takeout' }; }
    if (this.darts === 0 && vsEmpty.frac < p.emptyLike * 0.4) this.empty = g; // leeres Board mitführen (Licht ändert sich langsam)
    if (vsRef.frac > p.bigChange) {
      const sh = bestShift(this.ref, g, w, h, 6, mask);
      if (sh.gain > p.moveGain && (sh.dx || sh.dy)) { this.paused = true; return { state: 'paused', event: 'moved', shift: sh }; }
      // Bleibt das Bild ruhig, aber ganz anders (Licht an/aus): nach drei Prüfungen als neue Referenz nehmen
      if (++this.bigRuns >= 3) { this.ref = g; if (!this.darts) this.empty = g; this.bigRuns = 0; }
      return { state: 'ready' };
    }
    this.bigRuns = 0;
    const area = (mask ? mask.reduce((a, v) => a + v, 0) : w * h);
    const m = close(open(vsRef.m, w, h), w, h);
    const comps = components(m, w, h, Math.max(4, Math.round(area * p.minArea))).filter((c) => c.length <= area * p.maxArea);
    if (!comps.length) return { state: 'ready' };
    const blob = mergeDart(comps, w), ax = dartAxis(blob, w);
    // 1) Board-Normale (Kamera-Pose) entscheidet, welches Ende im Board steckt. 2) Sonst Flight-Profil (dartAxis).
    // 3) Erst wenn beides unklar ist: ein Ende auf dem Board schlägt eines weit daneben.
    const nrm = tipByNormal(ax, this.H, this.pose);
    if (nrm.tipFirst === false) { [ax.tip, ax.tail] = [ax.tail, ax.tip]; }
    let byNormal = nrm.tipFirst !== null;
    if (!byNormal && !ax.flightClear) {
      const on = (q) => { const [x, y] = project(this.H, q[0], q[1]); return Math.hypot(x, y) <= 172; };
      if (!on(ax.tip) && on(ax.tail)) [ax.tip, ax.tail] = [ax.tail, ax.tip];
    }
    if (!byNormal && !ax.flightClear) ax.endRatio = Math.max(ax.endRatio, 0.81); // Spitze unsicher
    const [bx, by] = project(this.H, ax.tip[0], ax.tip[1]);
    const score = scoreFromBoardMM(bx, by);
    // Verdeckt? Die Spitze stößt an einen schon steckenden Dart → Spitze evtl. nicht sichtbar
    let hidden = false;
    if (this.dartMask) { const tx = Math.round(ax.tip[0]), ty = Math.round(ax.tip[1]); for (let dy = -3; dy <= 3 && !hidden; dy++) for (let dx = -3; dx <= 3; dx++) { const x = tx + dx, y = ty + dy; if (x >= 0 && y >= 0 && x < w && y < h && this.dartMask[y * w + x]) { hidden = true; break; } } }
    // Diesen Dart in die Maske bekannter Darts aufnehmen (etwas verbreitert)
    this.dartMask ??= new Uint8Array(w * h);
    for (const q of blob) { const x = q % w, y = (q / w) | 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < w && yy < h) this.dartMask[yy * w + xx] = 1; } }
    this.ref = g; this.darts++;
    let conf = confidence(ax, score, comps.filter((c) => c.length > comps[0].length * 0.5).length);
    if (byNormal && nrm.margin > 0.8) conf = Math.min(1, conf + 0.05);
    if (hidden) conf = Math.min(conf, 0.75);
    return { state: 'ready', event: 'dart', tip: ax.tip, tail: ax.tail, axis: ax, boardX: bx, boardY: by, score, hidden, byNormal, confidence: conf, mask: m };
  }
}

/* ---------- Feinstufe: Spitze in voller Auflösung auf Subpixel genau ---------- */
const bil = (a, W, Hh, x, y) => {
  const x0 = Math.floor(x), y0 = Math.floor(y); if (x0 < 0 || y0 < 0 || x0 >= W - 1 || y0 >= Hh - 1) return 0;
  const fx = x - x0, fy = y - y0, i = y0 * W + x0;
  return a[i] * (1 - fx) * (1 - fy) + a[i + 1] * fx * (1 - fy) + a[i + W] * (1 - fx) * fy + a[i + W + 1] * fx * fy;
};
/**
 * cur/ref: Graustufen-Ausschnitt (W×Hh, volle Auflösung, möglichst über mehrere Bilder gemittelt), c0: grobe Spitze im Ausschnitt,
 * dir: Einheitsvektor von der Spitze zur Flight. Achse per RANSAC nur aus Spitze + Barrel (Flight/Reflexe fallen raus), dann
 * Differenzprofil entlang der Achse (0,25 px, quer über 3 px gemittelt): Spitze = Übergang vom Dart ins Board (halbe Barrel-Stärke,
 * linear interpoliert). → { tip: [x, y], dir, ok, inliers } oder { ok: false }
 */
export function refineTip(cur, ref, W, Hh, c0, dir, rnd = Math.random) {
  const d = new Float32Array(W * Hh);
  for (let i = 0; i < d.length; i++) d[i] = Math.abs(cur[i] - ref[i]);
  const sample = []; for (let i = 0; i < d.length; i += 7) sample.push(d[i]); sample.sort((a, b) => a - b);
  const thr = Math.max(14, sample[Math.floor(sample.length / 2)] * 3 + 8);
  const pts = [];
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    if (d[y * W + x] <= thr) continue;
    const ox = x - c0[0], oy = y - c0[1], t = ox * dir[0] + oy * dir[1], s = -ox * dir[1] + oy * dir[0];
    if (t > -30 && t < 70 && Math.abs(s) < 16) pts.push([x, y]);
  }
  if (pts.length < 8) return { ok: false };
  // RANSAC-Linie, Richtung höchstens ~25° von der groben Achse
  let best = null;
  for (let k = 0; k < 160; k++) {
    const p = pts[(rnd() * pts.length) | 0], q = pts[(rnd() * pts.length) | 0];
    const lx = q[0] - p[0], ly = q[1] - p[1], L = Math.hypot(lx, ly); if (L < 6) continue;
    const ux = lx / L, uy = ly / L; if (Math.abs(ux * dir[0] + uy * dir[1]) < 0.9) continue;
    let n = 0; for (const r of pts) if (Math.abs(-(r[0] - p[0]) * uy + (r[1] - p[1]) * ux) < 1.5) n++;
    if (!best || n > best.n) best = { n, p, ux, uy };
  }
  if (!best || best.n < 6) return { ok: false };
  // Achse aus den Inliern neu (PCA), Richtung zur Flight hin ausrichten
  let inl = pts.filter((r) => Math.abs(-(r[0] - best.p[0]) * best.uy + (r[1] - best.p[1]) * best.ux) < 1.5);
  // Nur der vordere Teil (Spitze + Barrel) bestimmt die Achse – das hintere Stück (Richtung Flight) fällt raus
  { const ts = inl.map((r) => (r[0] - best.p[0]) * best.ux + (r[1] - best.p[1]) * best.uy), sg = best.ux * dir[0] + best.uy * dir[1] >= 0 ? 1 : -1;
    const lo = Math.min(...ts.map((t) => t * sg)), hi = Math.max(...ts.map((t) => t * sg)), cutT = lo + (hi - lo) * 0.6;
    const front = inl.filter((_, i) => ts[i] * sg <= cutT); if (front.length >= 6) inl = front; }
  let mx = 0, my = 0; for (const [x, y] of inl) { mx += x; my += y; } mx /= inl.length; my /= inl.length;
  let sxx = 0, syy = 0, sxy = 0; for (const [x, y] of inl) { sxx += (x - mx) ** 2; syy += (y - my) ** 2; sxy += (x - mx) * (y - my); }
  const th = 0.5 * Math.atan2(2 * sxy, sxx - syy); let ux = Math.cos(th), uy = Math.sin(th);
  if (ux * dir[0] + uy * dir[1] < 0) { ux = -ux; uy = -uy; }
  let tMin = Infinity, tMax = -Infinity; for (const [x, y] of inl) { const t = (x - mx) * ux + (y - my) * uy; tMin = Math.min(tMin, t); tMax = Math.max(tMax, t); }
  // Profil entlang der Achse: Maximum quer über 3 px (so bleibt auch die dünne Stahlspitze sichtbar)
  const prof = (t) => { let v = 0; for (let o = -2; o <= 2; o += 0.5) v = Math.max(v, bil(d, W, Hh, mx + t * ux - o * uy, my + t * uy + o * ux)); return v; };
  const mid = []; for (let t = tMin + (tMax - tMin) * 0.3; t <= tMax - (tMax - tMin) * 0.2; t += 0.5) mid.push(prof(t)); mid.sort((a, b) => a - b);
  const level = mid[Math.floor(mid.length / 2)] || thr * 2, cut = Math.max(thr * 0.6, level * 0.25);
  // Vom Barrel Richtung Spitze laufen, bis das Profil unter die Schwelle fällt (Ende der dünnen Spitze), Subpixel linear
  let tPrev = tMin + (tMax - tMin) * 0.3, prev = prof(tPrev), tip = null;
  for (let t = tPrev - 0.25; t > tMin - 25; t -= 0.25) {
    const v = prof(t);
    if (v < cut && prev >= cut) { const f = (prev - cut) / (prev - v || 1); tip = tPrev - f * 0.25; break; }
    prev = v; tPrev = t;
  }
  if (tip === null) return { ok: false };
  // Quer zur Achse nachzentrieren: Schwerpunkt der Differenz knapp hinter der Spitze (die Achse liegt evtl. 1–2 px daneben)
  let sw = 0, so = 0;
  for (let t = tip + 0.5; t <= tip + 5; t += 0.5) for (let o = -3; o <= 3; o += 0.25) {
    const v = Math.max(0, bil(d, W, Hh, mx + t * ux - o * uy, my + t * uy + o * ux) - thr * 0.5); sw += v; so += v * o;
  }
  const off = sw ? so / sw : 0;
  return { ok: true, tip: [mx + tip * ux - off * uy, my + tip * uy + off * ux], dir: [ux, uy], inliers: inl.length };
}
