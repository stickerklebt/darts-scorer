/* Eigener Dart aus einem Foto: Dart auf einen ruhigen Untergrund legen (schwarz, weiß, braun …), fotografieren →
   die App findet den Dart, dreht ihn waagerecht (Flight links, Spitze rechts) und stellt ihn frei: der Tisch verschwindet komplett,
   übrig bleibt nur der fotografierte Dart in seinen echten Farben (leicht kräftiger), mit feinem Goldrand im Stil der App.
   Ergebnis: PNG mit transparentem Hintergrund als data-URL.
   Kern ohne DOM (ImageData-artige Objekte { width, height, data }), damit er testbar ist. */

const lum = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];

/** Lineares Löse-System 3×3 (Cramer) */
function solve3(A, v) {
  const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det(A);
  if (Math.abs(D) < 1e-9) return null;
  return [0, 1, 2].map((k) => det(A.map((row, r) => row.map((x, c) => (c === k ? v[r] : x)))) / D);
}

/**
 * Hintergrund = Ebene durch die Randpixel (je Farbkanal a + b·x + c·y, gleicht Licht-Verläufe auf dem Tisch aus);
 * Maske = Pixel, die deutlich davon abweichen → Lücken schließen → passende Fläche (groß und länglich) → Löcher füllen.
 */
export function segment(img) {
  const { width: w, height: h, data: d } = img;
  const m = Math.max(2, Math.round(Math.min(w, h) * 0.03));
  const pts = [];
  const step = Math.max(1, Math.round((w + h) / 1500));
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) {
    if (x >= m && y >= m && x < w - m && y < h - m) { x = w - m - 1; continue; }
    pts.push(x, y, (y * w + x) * 4);
  }
  // Ebene per kleinster Quadrate, dann ein zweiter Durchgang ohne Ausreißer (z. B. Dart berührt den Rand)
  const fit = (use) => {
    const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], B = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let k = 0; k < pts.length; k += 3) {
      if (use && !use[k / 3]) continue;
      const x = pts[k] / w, y = pts[k + 1] / h, i = pts[k + 2], r = [1, x, y];
      for (let a = 0; a < 3; a++) { for (let b = 0; b < 3; b++) A[a][b] += r[a] * r[b]; for (let c = 0; c < 3; c++) B[c][a] += r[a] * d[i + c]; }
    }
    return [0, 1, 2].map((c) => solve3(A, B[c]) || [d[pts[2] + c], 0, 0]);
  };
  const bgAt = (P, x, y, c) => P[c][0] + P[c][1] * (x / w) + P[c][2] * (y / h);
  const resid = (P) => { const r = []; for (let k = 0; k < pts.length; k += 3) { const i = pts[k + 2]; r.push(Math.hypot(d[i] - bgAt(P, pts[k], pts[k + 1], 0), d[i + 1] - bgAt(P, pts[k], pts[k + 1], 1), d[i + 2] - bgAt(P, pts[k], pts[k + 1], 2))); } return r; };
  let P = fit(null);
  let r = resid(P);
  const med = r.slice().sort((a, b) => a - b)[r.length >> 1];
  P = fit(r.map((x) => x <= Math.max(12, med * 3)));
  r = resid(P).sort((a, b) => a - b);
  const thr = Math.max(30, r[Math.floor(r.length * 0.95)] * 1.8);
  const mask = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x, i = p * 4;
    mask[p] = Math.hypot(d[i] - bgAt(P, x, y, 0), d[i + 1] - bgAt(P, x, y, 1), d[i + 2] - bgAt(P, x, y, 2)) > thr ? 1 : 0;
  }
  return { mask: fillHoles(pick(clean(mask, w, h), w, h), w, h), bg: [0, 1, 2].map((c) => Math.round(bgAt(P, w / 2, h / 2, c))) };
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
function pick(mask, w, h) {
  const lab = new Int32Array(w * h); let id = 0, best = 0, bestS = -1;
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
    if (score > bestS) { bestS = score; best = id; }
  }
  const out = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) out[p] = lab[p] === best ? 1 : 0;
  return out;
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
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (let p = 0; p < mask.length; p++) if (mask[p]) {
    const x = p % w - ax.cx, y = ((p / w) | 0) - ax.cy, u = x * c + y * s, v = -x * s + y * c;
    if (u < u0) u0 = u; if (u > u1) u1 = u; if (v < v0) v0 = v; if (v > v1) v1 = v;
  }
  const pad = 2, W = Math.ceil(u1 - u0) + pad * 2, H = Math.ceil(v1 - v0) + pad * 2;
  const out = new Uint8ClampedArray(W * H * 4), alpha = new Uint8Array(W * H), thick = new Float64Array(W);
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
    const u = X - pad + u0, v = Y - pad + v0;
    const fx = ax.cx + u * c - v * s, fy = ax.cy + u * s + v * c, x = Math.round(fx), y = Math.round(fy);
    if (x < 0 || y < 0 || x >= w || y >= h || !mask[y * w + x]) continue;
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
  return { width: W, height: H, data: out, alpha, thick: [...thick] };
}

/** Rand um den Dart (px im ausgerichteten Bild) und Goldton */
export const OUTLINE = 3;
const GOLD = [212, 166, 58], GOLD_L = [240, 217, 140];

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
export async function dartFromFile(file) {
  // createImageBitmap kann manche iPhone-Fotos (HEIC) nicht – dann über ein <img>
  let bmp;
  try { bmp = await createImageBitmap(file); }
  catch {
    bmp = await new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => no(new Error('Foto konnte nicht gelesen werden')); im.src = URL.createObjectURL(file); });
  }
  const scale = Math.min(1, 1400 / Math.max(bmp.width, bmp.height)); // genug Auflösung für Barrel-Rillen
  const cw = Math.round(bmp.width * scale), ch = Math.round(bmp.height * scale);
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
  const cx = cv.getContext('2d'); cx.drawImage(bmp, 0, 0, cw, ch);
  const img = cx.getImageData(0, 0, cw, ch);
  const { mask } = segment(img);
  const st = straighten(img, mask);
  if (!st || st.width < 40) throw new Error('Kein Dart erkannt. Leg ihn auf einen ruhigen, einfarbigen Untergrund und fotografiere ihn von oben.');
  const sy = stylize(st);
  // auf 1000 px Länge bringen (scharf auf großen Bildschirmen)
  const tmp = document.createElement('canvas'); tmp.width = sy.width; tmp.height = sy.height;
  tmp.getContext('2d').putImageData(new ImageData(sy.data, sy.width, sy.height), 0, 0);
  const L = 1000, f = L / sy.width;
  const out = document.createElement('canvas'); out.width = L; out.height = Math.max(8, Math.round(sy.height * f));
  const ox = out.getContext('2d'); ox.imageSmoothingEnabled = true; ox.imageSmoothingQuality = 'high'; ox.drawImage(tmp, 0, 0, out.width, out.height);
  return out.toDataURL('image/png');
}
