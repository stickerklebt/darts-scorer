/* Eigener Dart aus einem Foto: Dart auf einen ruhigen Untergrund legen (schwarz, weiß, braun …), fotografieren →
   die App findet den Dart, dreht ihn waagerecht (Flight links, Spitze rechts) und stellt ihn frei: der Tisch verschwindet komplett,
   übrig bleibt nur der fotografierte Dart in seinen echten Farben (leicht kräftiger), mit feinem Goldrand im Stil der App.
   Ergebnis: PNG mit transparentem Hintergrund als data-URL.
   Seit dem Dart-Steckbrief (js/dartspec.js) liefert dartFromFile nur noch die gemessenen Merkmale; gezeichnet wird in ui/dartart.js.
   Kern ohne DOM (ImageData-artige Objekte { width, height, data }), damit er testbar ist. */

const lum = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];

/** Kastenfilter über ein Integralbild (r = Radius) */
function boxBlur(ch, w, h, r) {
  const W1 = w + 1, I = new Float64Array(W1 * (h + 1));
  for (let y = 0; y < h; y++) { let s = 0; for (let x = 0; x < w; x++) { s += ch[y * w + x]; I[(y + 1) * W1 + x + 1] = I[y * W1 + x + 1] + s; } }
  const o = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1);
      o[y * w + x] = (I[y1 * W1 + x1] - I[y0 * W1 + x1] - I[y1 * W1 + x0] + I[y0 * W1 + x0]) / ((x1 - x0) * (y1 - y0));
    }
  }
  return o;
}

/**
 * Dart vom Tisch trennen – auch auf gemasertem Holz und bei ungleichem Licht:
 * leicht geglättet (Maserung/Rauschen weg) minus stark geglättet (Tisch + Lichtverlauf) = was sich vom Untergrund in seiner Umgebung abhebt.
 * Schwelle aus der Verteilung im ganzen Bild (der Dart ist nur ein kleiner Teil). Starke Pixel → Dart-Fläche (groß und länglich),
 * schwächere direkt daran (Hysterese) holen die dünne Spitze und Ränder dazu → Lücken schließen → Löcher füllen.
 */
export function segment(img) {
  const { width: w, height: h, data: d } = img, n = w * h, md = Math.min(w, h);
  const rs = Math.max(1, Math.round(md * 0.008)), R = Math.max(6, Math.round(md * 0.1));
  const small = [0, 1, 2].map((c) => { const a = new Float32Array(n); for (let p = 0; p < n; p++) a[p] = d[p * 4 + c]; return boxBlur(a, w, h, rs); });
  const big = small.map((a) => boxBlur(boxBlur(a, w, h, R), w, h, R));
  const dist = new Float32Array(n);
  for (let p = 0; p < n; p++) dist[p] = Math.hypot(small[0][p] - big[0][p], small[1][p] - big[1][p], small[2][p] - big[2][p]);
  const s = Array.from(dist).sort((a, b) => a - b);
  const med = s[n >> 1], mad = s[Math.floor(n * 0.75)] - med;
  const thr = Math.max(24, Math.min(med + 6 * mad, s[Math.floor(n * 0.985)]));
  const strong = new Uint8Array(n);
  for (let p = 0; p < n; p++) strong[p] = dist[p] > thr ? 1 : 0;
  // Zusammengehöriges (Flight · Schaft · Barrel · Spitze) erst über einen breiteren Saum verbinden, dann die Dart-Fläche wählen
  let dil = clean(strong, w, h); const k = Math.max(2, Math.round(md * 0.02));
  for (let i = 0; i < k; i++) dil = morph(dil, w, h, true);
  const grp = pick(dil, w, h, true), core = new Uint8Array(n);
  for (let p = 0; p < n; p++) core[p] = grp[p] && strong[p] ? 1 : 0;
  // Hysterese: schwächere Pixel, die an der Dart-Fläche hängen (begrenzt auf einen schmalen Saum)
  const weak = thr * 0.45, out = core.slice(), reach = Math.max(3, Math.round(md * 0.03));
  let front = []; for (let p = 0; p < n; p++) if (core[p]) front.push(p);
  for (let step = 0; step < reach && front.length; step++) {
    const next = [];
    for (const q of front) {
      const x = q % w, y = (q / w) | 0;
      for (const r of [x > 0 ? q - 1 : -1, x < w - 1 ? q + 1 : -1, y > 0 ? q - w : -1, y < h - 1 ? q + w : -1]) {
        if (r >= 0 && !out[r] && dist[r] > weak) { out[r] = 1; next.push(r); }
      }
    }
    front = next;
  }
  // Kanten nachschärfen: am Rand nur Pixel behalten, die auch ungeglättet vom Tisch abweichen (der Weichzeichner macht den Saum sonst breiter)
  // Tisch-Farbe ohne den Dart schätzen (geglättet nur über Pixel außerhalb der Fläche, etwas Abstand), damit der Saum nicht dunkler/heller gerechnet wird
  const filled = fillHoles(clean(out, w, h), w, h), sharp = new Uint8Array(n);
  let away = filled; for (let i = 0; i < Math.max(2, rs * 2); i++) away = morph(away, w, h, true);
  const wgt = new Float32Array(n); for (let p = 0; p < n; p++) wgt[p] = away[p] ? 0 : 1;
  const Rb = Math.max(4, Math.round(md * 0.05)), wb = boxBlur(boxBlur(wgt, w, h, Rb), w, h, Rb);
  const bg = [0, 1, 2].map((c) => { const a = new Float32Array(n); for (let p = 0; p < n; p++) a[p] = d[p * 4 + c] * wgt[p]; return boxBlur(boxBlur(a, w, h, Rb), w, h, Rb); });
  for (let p = 0; p < n; p++) if (filled[p]) {
    const i = p * 4, ww = wb[p] > 0.02 ? wb[p] : 0;
    const bR = ww ? bg[0][p] / ww : big[0][p], bG = ww ? bg[1][p] / ww : big[1][p], bB = ww ? bg[2][p] / ww : big[2][p];
    sharp[p] = Math.hypot(d[i] - bR, d[i + 1] - bG, d[i + 2] - bB) > thr * 0.4 ? 1 : 0;
  }
  return { mask: fillHoles(pick(clean(sharp, w, h), w, h, true), w, h), thr };
}

/** Löcher in der Fläche füllen (Glanzlichter auf dem Barrel, helle Flight-Muster in Tischfarbe) */
function fillHoles(mask, w, h) {
  const out = new Uint8Array(w * h).fill(1), stack = [];
  const push = (p) => { if (!mask[p] && out[p]) { out[p] = 0; stack.push(p); } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (stack.length) {
    const q = stack.pop(), x = q % w, y = (q / w) | 0;
    if (x > 0) push(q - 1); if (x < w - 1) push(q + 1); if (y > 0) push(q - w); if (y < h - 1) push(q + w);
  }
  return out;
}

/** Lücken schließen (kein Öffnen: das würde die dünne Spitze wegfressen; Krümel entfernt danach die größte-Fläche-Auswahl) */
function morph(mask, w, h, grow) {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = grow ? 0 : 1;
    for (let dy = -1; dy <= 1 && (grow ? !v : v); dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      const s = xx < 0 || yy < 0 || xx >= w || yy >= h ? 0 : mask[yy * w + xx];
      if (grow && s) { v = 1; break; }
      if (!grow && !s) { v = 0; break; }
    }
    out[y * w + x] = v;
  }
  return out;
}
const clean = (m, w, h) => morph(morph(m, w, h, true), w, h, false);

/** Zusammenhängende Flächen; gewählt wird die, die am ehesten ein Dart ist: groß und länglich, nicht am Bildrand entlang (Tischkante) */
function pick(mask, w, h, merge = false) {
  const lab = new Int32Array(w * h); let id = 0, best = 0, bestS = -1; const comps = [];
  const stack = [];
  for (let p = 0; p < w * h; p++) {
    if (!mask[p] || lab[p]) continue;
    id++; let n = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, edge = 0; stack.push(p); lab[p] = id;
    while (stack.length) {
      const q = stack.pop(); n++;
      const x = q % w, y = (q / w) | 0;
      sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) edge++;
      for (const [xx, yy] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const r = yy * w + xx; if (mask[r] && !lab[r]) { lab[r] = id; stack.push(r); }
      }
    }
    if (n < 30) continue;
    const mx = sx / n, my = sy / n, a = sxx / n - mx * mx, c = syy / n - my * my, b = sxy / n - mx * my;
    const tr = a + c, dt = Math.sqrt(Math.max(0, (a - c) ** 2 / 4 + b * b)), l1 = tr / 2 + dt, l2 = Math.max(1, tr / 2 - dt);
    const elong = Math.min(8, Math.sqrt(l1 / l2));
    const score = n * elong / (1 + edge / 20);
    comps.push({ id, n, mx, my });
    if (score > bestS) { bestS = score; best = id; }
  }
  const keep = new Set([best]);
  // Teile auf der Verlängerung der Dart-Achse dazunehmen (z. B. die Flight, wenn der Übergang zum Schaft kaum Kontrast hat)
  if (merge && best) {
    const out0 = new Uint8Array(w * h); for (let p = 0; p < w * h; p++) out0[p] = lab[p] === best ? 1 : 0;
    const ax = axis(out0, w), c = Math.cos(ax.angle), s = Math.sin(ax.angle);
    let u0 = Infinity, u1 = -Infinity;
    for (let p = 0; p < w * h; p++) if (out0[p]) { const u = (p % w - ax.cx) * c + (((p / w) | 0) - ax.cy) * s; if (u < u0) u0 = u; if (u > u1) u1 = u; }
    const L = u1 - u0;
    for (const k of comps) {
      if (k.id === best || k.n < ax.n * 0.03) continue;
      const u = (k.mx - ax.cx) * c + (k.my - ax.cy) * s, v = -(k.mx - ax.cx) * s + (k.my - ax.cy) * c;
      if (Math.abs(v) < L * 0.15 && u > u0 - L * 0.4 && u < u1 + L * 0.4) keep.add(k.id);
    }
  }
  const out = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) out[p] = keep.has(lab[p]) ? 1 : 0;
  return out;
}

/** Farbe an einer Kommastelle (bilinear) → [r, g, b] */
function sample(img, fx, fy) {
  const { width: w, height: h, data: d } = img;
  const x0 = Math.max(0, Math.min(w - 2, Math.floor(fx))), y0 = Math.max(0, Math.min(h - 2, Math.floor(fy)));
  const ax = Math.max(0, Math.min(1, fx - x0)), ay = Math.max(0, Math.min(1, fy - y0)), o = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    const i00 = (y0 * w + x0) * 4 + k, i10 = i00 + 4, i01 = i00 + w * 4, i11 = i01 + 4;
    o[k] = (d[i00] * (1 - ax) + d[i10] * ax) * (1 - ay) + (d[i01] * (1 - ax) + d[i11] * ax) * ay;
  }
  return o;
}
const cdist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/**
 * Halbe Breite je Spalte nachschärfen – nur im schmalen Teil (Schaft, Barrel, Spitze; die Flight bleibt):
 * Dart-Farbe = Mitte der Spalte, Untergrund = knapp außerhalb der groben Kante (beides über ein paar Spalten gemittelt).
 * Von der Mitte nach außen gehört ein Punkt zum Dart, solange er näher an der Dart- als an der Untergrundfarbe liegt
 * (ein einzelner Ausreißer, z. B. Glanzlicht, wird übersprungen). at(X, dv) = Farbe in Spalte X, dv px neben der Mitte.
 */
export function tighten(hw, at) {
  const Wc = hw.length, mx = Math.max(1, ...hw), narrow = (X) => hw[X] > 0 && hw[X] < mx * 0.5;
  const avg = (ps) => [0, 1, 2].map((k) => ps.reduce((a, p) => a + p[k], 0) / ps.length);
  const cen = [], bg = [];
  for (let X = 0; X < Wc; X++) {
    if (!narrow(X)) continue;
    const r = Math.min(1, hw[X] * 0.4);
    cen[X] = avg([-r, 0, r].map((d) => at(X, d)));
    bg[X] = avg([2, 3, 4, 5, 6].flatMap((k) => [at(X, -(hw[X] + k)), at(X, hw[X] + k)]));
  }
  const near = (arr, X) => { const ps = []; for (let k = X - 4; k <= X + 4; k++) if (arr[k]) ps.push(arr[k]); return avg(ps); };
  const out = hw.slice();
  for (let X = 0; X < Wc; X++) {
    if (!narrow(X)) continue;
    const C = near(cen, X), B = near(bg, X);
    if (cdist(C, B) < 30) continue;                 // Dart und Untergrund zu ähnlich → grobe Kante behalten
    const side = (sg) => {
      let r = 0.5, miss = 0;
      for (let d = 0.5; d <= hw[X]; d += 0.5) {
        const p = at(X, sg * d);
        if (cdist(p, C) <= cdist(p, B)) { r = d; miss = 0; } else if (++miss * 0.5 > Math.max(1.5, r * 0.4)) break; // Glanzlicht im Dart überspringen
      }
      return r;
    };
    out[X] = Math.max(0.75, (side(1) + side(-1)) / 2);
  }
  // glätten (Median über ~3 % der Länge – einzelne Linien im Untergrund fallen weg), Lücken bleiben Lücken
  const k0 = Math.max(2, Math.round(Wc * 0.015));
  return out.map((v, X) => { if (!v) return 0; const a = []; for (let k = X - k0; k <= X + k0; k++) if (out[k]) a.push(out[k]); a.sort((p, q) => p - q); return a[a.length >> 1]; });
}

/** Hauptachse (PCA) der Maske → Winkel, Mittelpunkt */
export function axis(mask, w) {
  let n = 0, mx = 0, my = 0;
  for (let p = 0; p < mask.length; p++) if (mask[p]) { n++; mx += p % w; my += (p / w) | 0; }
  if (!n) return null;
  mx /= n; my /= n;
  let sxx = 0, syy = 0, sxy = 0;
  for (let p = 0; p < mask.length; p++) if (mask[p]) { const x = p % w - mx, y = ((p / w) | 0) - my; sxx += x * x; syy += y * y; sxy += x * y; }
  return { cx: mx, cy: my, angle: 0.5 * Math.atan2(2 * sxy, sxx - syy), n };
}

/**
 * Dart waagerecht ausrichten und freistellen. → { width, height, data (RGBA), alpha (Uint8Array) }
 * Flight (die breiteste Stelle) kommt nach links, die Spitze nach rechts.
 */
export function straighten(img, mask) {
  const { width: w, height: h, data: d } = img;
  const ax = axis(mask, w);
  if (!ax || ax.n < 60) return null;
  const c = Math.cos(ax.angle), s = Math.sin(ax.angle);
  let u0 = Infinity, u1 = -Infinity;
  for (let p = 0; p < mask.length; p++) if (mask[p]) {
    const x = p % w - ax.cx, y = ((p / w) | 0) - ax.cy, u = x * c + y * s;
    if (u < u0) u0 = u; if (u > u1) u1 = u;
  }
  // Je Spalte entlang der Achse: oberste/unterste Dart-Kante
  const Wc = Math.ceil(u1 - u0) + 1, top = new Float64Array(Wc).fill(Infinity), bot = new Float64Array(Wc).fill(-Infinity);
  for (let p = 0; p < mask.length; p++) if (mask[p]) {
    const x = p % w - ax.cx, y = ((p / w) | 0) - ax.cy, X = Math.round(x * c + y * s - u0), v = -x * s + y * c;
    if (v < top[X]) top[X] = v; if (v > bot[X]) bot[X] = v;
  }
  // Mittellinie = Median der Spaltenmitten im schmalen Teil (Barrel/Schaft); ein Dart ist zur Achse symmetrisch →
  // halbe Breite je Spalte = weitere Kante; so wird die Flight auch voll, wenn eine Kante im Foto kaum Kontrast hat
  const cols = [...Array(Wc).keys()].filter((X) => top[X] <= bot[X]);
  const thk = cols.map((X) => bot[X] - top[X]).sort((a, b) => a - b), mt = thk[thk.length >> 1] || 1;
  const mids = cols.filter((X) => bot[X] - top[X] <= mt * 1.5).map((X) => (top[X] + bot[X]) / 2).sort((a, b) => a - b);
  const vc = mids.length ? mids[mids.length >> 1] : 0;
  let hw = new Float64Array(Wc);
  for (const X of cols) hw[X] = Math.max(vc - top[X], bot[X] - vc, 0.5);
  // glätten (Median über ein kleines Fenster) und kleine abgetrennte Stücke an den Enden weglassen (Krümel vom Tisch)
  const win = Math.max(1, Math.round(Wc * 0.008));
  hw = hw.map((_, X) => { const a = []; for (let k = X - win; k <= X + win; k++) if (k >= 0 && k < Wc) a.push(hw[k]); a.sort((p, q) => p - q); return a[a.length >> 1]; });
  const runs = []; for (let X = 0; X < Wc;) { if (!hw[X]) { X++; continue; } let E = X; while (E < Wc && hw[E]) E++; runs.push([X, E]); X = E; }
  const longest = runs.reduce((m, r) => (r[1] - r[0] > m[1] - m[0] ? r : m), [0, 0]);
  for (const [A, E] of runs) if (E - A < Wc * 0.06 && A !== longest[0]) for (let X = A; X < E; X++) hw[X] = 0;
  // Kanten nachschärfen (gemusterter Untergrund hängt sonst als breiter Saum an Schaft, Barrel und Spitze)
  const at = (X, dv) => sample(img, ax.cx + (X + u0) * c - (vc + dv) * s, ax.cy + (X + u0) * s + (vc + dv) * c);
  hw = tighten(hw, at);
  // Untergrund-Farbe = Median des Bildrands (fast immer Tisch) – damit Muster/Farben später Untergrund in Lücken (zwischen Flügeln) erkennen
  const ring = [], bw2 = Math.max(1, Math.round(Math.min(w, h) * 0.02));
  for (let x = 0; x < w; x += 2) for (let k = 0; k < bw2; k++) { ring.push(x + k * w); ring.push(x + (h - 1 - k) * w); }
  for (let y = 0; y < h; y += 2) for (let k = 0; k < bw2; k++) { ring.push(k + y * w); ring.push(w - 1 - k + y * w); }
  const bg = [0, 1, 2].map((k) => { const a = ring.map((p) => d[p * 4 + k]).sort((p, q) => p - q); return a[a.length >> 1]; });
  // Toleranz nach Unruhe des Untergrunds: 80 % der Randpixel liegen so nah an der Untergrundfarbe (ruhig ≈ 42, Maserung mehr, höchstens 90)
  const dev = ring.map((p) => Math.hypot(d[p * 4] - bg[0], d[p * 4 + 1] - bg[1], d[p * 4 + 2] - bg[2])).sort((p, q) => p - q);
  const bgTol = Math.max(42, Math.min(90, dev[Math.floor(dev.length * 0.8)] * 1.3));
  let Xa = 0, Xe = Wc - 1; while (Xa < Wc && !hw[Xa]) Xa++; while (Xe > Xa && !hw[Xe]) Xe--;
  const maxHw = Math.max(1, ...hw);
  const pad = 2, W = Xe - Xa + 1 + pad * 2, H = Math.ceil(maxHw * 2) + 1 + pad * 2, cy = (H - 1) / 2;
  const out = new Uint8ClampedArray(W * H * 4), alpha = new Uint8Array(W * H), thick = new Float64Array(W);
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
    const Xc = X - pad + Xa, dv = Y - cy;
    if (Xc < 0 || Xc >= Wc || Math.abs(dv) > hw[Xc]) continue;
    const u = Xc + u0, v = vc + dv;
    const fx = ax.cx + u * c - v * s, fy = ax.cy + u * s + v * c;
    if (fx < 0 || fy < 0 || fx > w - 1 || fy > h - 1) continue;
    const o = (Y * W + X) * 4;
    // bilinear abtasten – schärfer und ohne Treppen
    const x0 = Math.max(0, Math.min(w - 2, Math.floor(fx))), y0 = Math.max(0, Math.min(h - 2, Math.floor(fy))), ax_ = fx - x0, ay = fy - y0;
    for (let k = 0; k < 3; k++) {
      const i00 = (y0 * w + x0) * 4 + k, i10 = i00 + 4, i01 = i00 + w * 4, i11 = i01 + 4;
      out[o + k] = (d[i00] * (1 - ax_) + d[i10] * ax_) * (1 - ay) + (d[i01] * (1 - ax_) + d[i11] * ax_) * ay;
    }
    out[o + 3] = 255; alpha[Y * W + X] = 1; thick[X]++;
  }
  // Flight = breiteste Stelle: liegt sie rechts, spiegeln (Flight links, Spitze rechts)
  let maxX = 0; for (let X = 1; X < W; X++) if (thick[X] > thick[maxX]) maxX = X;
  if (maxX > W / 2) {
    for (let Y = 0; Y < H; Y++) for (let X = 0; X < W >> 1; X++) {
      const a = (Y * W + X), b = (Y * W + (W - 1 - X));
      [alpha[a], alpha[b]] = [alpha[b], alpha[a]];
      for (let k = 0; k < 4; k++) { const t = out[a * 4 + k]; out[a * 4 + k] = out[b * 4 + k]; out[b * 4 + k] = t; }
    }
    thick.reverse();
  }
  return { width: W, height: H, data: out, alpha, thick: [...thick], bg, bgTol };
}

/** Rand um den Dart (px im ausgerichteten Bild) und Goldton */
export const OUTLINE = 3;
const GOLD = [207,211,217], GOLD_L = [240, 217, 140];

/**
 * Im Stil der App: der echte Dart (Farben leicht kräftiger, Kontrast gestreckt), außen ein feiner Goldrand (innen hell, außen weich),
 * alles andere transparent. → { width, height, data } (je Seite OUTLINE px größer)
 */
export function stylize(st) {
  const { width: w, height: h, data, alpha } = st, P = OUTLINE, W = w + 2 * P, H = h + 2 * P;
  // Kontrast: 2 %–98 % der Helligkeit des Darts auf 12–245 strecken
  const ls = [];
  for (let p = 0; p < w * h; p++) if (alpha[p]) ls.push(lum(data, p * 4));
  ls.sort((a, b) => a - b);
  const lo = ls[Math.floor(ls.length * 0.02)] ?? 0, hi = ls[Math.floor(ls.length * 0.98)] ?? 255;
  const k = hi - lo > 20 ? 233 / (hi - lo) : 1;
  // Abstand jedes Außenpixels zum Dart (bis P) – für den Goldrand
  const dist = new Float32Array(W * H).fill(99);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!alpha[y * w + x]) continue;
    const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1 || !alpha[y * w + x - 1] || !alpha[y * w + x + 1] || !alpha[(y - 1) * w + x] || !alpha[(y + 1) * w + x];
    if (!edge) continue;
    for (let dy = -P; dy <= P; dy++) for (let dx = -P; dx <= P; dx++) {
      const q = (y + P + dy) * W + (x + P + dx), r = Math.hypot(dx, dy);
      if (r < dist[q]) dist[q] = r;
    }
  }
  const out = new Uint8ClampedArray(W * H * 4);
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
    const q = Y * W + X, o = q * 4, x = X - P, y = Y - P;
    const inside = x >= 0 && y >= 0 && x < w && y < h && alpha[y * w + x];
    if (inside) {
      const i = (y * w + x) * 4, L = lum(data, i), nl = Math.max(0, Math.min(255, 12 + (L - lo) * k));
      for (let c = 0; c < 3; c++) {
        const v = L ? data[i + c] * (nl / L) : nl;      // Helligkeit strecken, Farbe behalten
        out[o + c] = nl + (v - nl) * 1.2;                // Sättigung etwas kräftiger
      }
      out[o + 3] = 255;
    } else if (dist[q] <= P) {
      const t = dist[q] / P, c = t < 0.5 ? GOLD_L : GOLD;
      out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2];
      out[o + 3] = Math.round(255 * (t <= 0.6 ? 1 : Math.max(0, (1 - t) / 0.4)));
    }
  }
  return { width: W, height: H, data: out };
}

/* ---------- Im Browser: Foto → fertiges PNG (data-URL) ---------- */
import { features, flightTexture, cleanSpec, matchFlight } from './dartspec.js';
import { apiGate } from './api.js';

/** Foto → Dart-Steckbrief (Merkmale, kein Bild). Jeder Versuch geht mit Foto + Zwischenergebnissen ans Scan-Protokoll (Server). */
export async function dartFromFile(file) {
  const t0 = performance.now(), meta = { ok: false, step: 'decode', img: { type: file.type, size: file.size } };
  let cv = null;
  try {
    // createImageBitmap kann manche iPhone-Fotos (HEIC) nicht – dann über ein <img>
    let bmp;
    try { bmp = await createImageBitmap(file); }
    catch {
      bmp = await new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => no(new Error('Foto konnte nicht gelesen werden')); im.src = URL.createObjectURL(file); });
    }
    const scale = Math.min(1, 1200 / Math.max(bmp.width, bmp.height)); // genug Auflösung für Barrel-Rillen
    const cw = Math.round(bmp.width * scale), ch = Math.round(bmp.height * scale);
    Object.assign(meta.img, { origW: bmp.width, origH: bmp.height, w: cw, h: ch });
    cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    const cx = cv.getContext('2d'); cx.drawImage(bmp, 0, 0, cw, ch);
    const img = cx.getImageData(0, 0, cw, ch);
    meta.step = 'segment';
    const { mask, thr } = segment(img);
    meta.seg = { thr: Math.round(thr), px: mask.reduce((a, b) => a + b, 0) };
    meta.step = 'straighten';
    const st = straighten(img, mask);
    if (st) meta.st = { w: st.width, h: st.height };
    if (!st || st.width < 40) throw new Error('Kein Dart erkannt. Leg ihn auf einen ruhigen, einfarbigen Untergrund und fotografiere ihn von oben.');
    meta.step = 'features';
    const zones = {}, spec = features(st, zones);
    meta.zones = zones;
    if (!spec) throw new Error('Dart nicht sauber erkannt. Leg ihn flach und ganz ins Bild, von oben fotografiert.');
    meta.spec = { ...spec, flight: { ...spec.flight } };
    // Flight-Muster als kleines PNG (wenige Farben → wenige KB); zu groß → kleiner rechnen, sonst ohne Muster
    meta.step = 'texture';
    for (const tw of [96, 64]) {
      const tex = flightTexture(st, zones.x0, zones.gfE ?? zones.fE, tw), url = tex && texUrl(tex);
      if (url && url.length < 24000) {
        if (tex.outline) { spec.flight.outline = tex.outline; spec.flight.aspect *= tex.E; spec.flight.shape = matchFlight(tex.outline, spec.flight.aspect); }
        // nur Schatten → einfarbig in der Hauptfarbe (kein Muster); sonst Muster aus dem Foto
        if (tex.plain) spec.flight.colors = [tex.plain]; else spec.flight.tex = url;
        meta.spec.flight = { ...spec.flight, tex: undefined };
        meta.zones.tex = { w: tex.w, h: tex.h, colors: tex.pal.length, chars: url.length, E: +tex.E.toFixed(2), plain: tex.plain, shape: spec.flight.shape };
        break;
      }
    }
    meta.ok = true; meta.step = 'ok';
    return cleanSpec(spec);
  } catch (e) {
    meta.err = String(e?.message || e);
    throw e;
  } finally {
    meta.ms = performance.now() - t0;
    reportScan(file, cv, meta);
  }
}

/** Indiziertes Muster → PNG data-URL */
function texUrl({ w, h, pal, idx, alpha }) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const im = new ImageData(w, h);
  for (let n = 0; n < w * h; n++) { const c = pal[idx[n]]; im.data[n * 4] = c[0]; im.data[n * 4 + 1] = c[1]; im.data[n * 4 + 2] = c[2]; im.data[n * 4 + 3] = alpha && !alpha[n] ? 0 : 255; }
  cv.getContext('2d').putImageData(im, 0, 0);
  return cv.toDataURL('image/png');
}

/** Scan-Protokoll: genau das Bild, das die Erkennung gesehen hat (JPEG ≤ 1200 px), sonst das Originalfoto (z. B. HEIC, das nicht lesbar war).
    Nebenbei, Fehler werden ignoriert; ohne Anmeldung lehnt der Server ab. */
async function reportScan(file, cv, meta) {
  if (apiGate.demo) return;
  try {
    const blob = cv ? await new Promise((ok) => cv.toBlob(ok, 'image/jpeg', 0.9)) : file;
    if (!blob) return;
    await fetch('api/dartscan', { method: 'POST', credentials: 'same-origin', body: blob,
      headers: { 'Content-Type': blob.type || 'image/jpeg', 'X-Scan-Meta': encodeURIComponent(JSON.stringify(meta)) } });
  } catch { /* Protokoll ist nur Beiwerk */ }
}
