/* Homographie aus 4 Punktpaaren (eigene DLT-Rechnung, keine Bibliothek). Bild-Pixel ↔ Board-mm.
   Kalibrierpunkte: äußerer Rand des Doppelrings (170 mm) in der Mitte von 20 (oben), 6 (rechts), 3 (unten), 11 (links). */

export const CALIB_TARGETS = [[0, -170], [170, 0], [0, 170], [-170, 0]];
export const CALIB_NAMES = ['20 · oben', '6 · rechts', '3 · unten', '11 · links'];

/** 3×3-Matrix (h33 = 1), die src[i] auf dst[i] abbildet; null, wenn die Punkte entartet sind */
export function homography(src, dst) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  for (let c = 0; c < 8; c++) {
    let p = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-10) return null;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k];
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

/** Bild → Board und Board → Bild aus den 4 angetippten Bildpunkten */
export function calibrate(imgPts) {
  const toBoard = homography(imgPts, CALIB_TARGETS), toImage = homography(CALIB_TARGETS, imgPts);
  return toBoard && toImage ? { toBoard, toImage } : null;
}

/* ---------- Viele Punkte, Kamera-Pose ---------- */

/** Homographie aus N ≥ 4 Punktpaaren (Least Squares, normalisiert nach Hartley); w = Gewichte (für robuste Schätzung) */
export function homographyN(src, dst, w = null) {
  const n = src.length;
  if (n < 4) return null;
  if (n === 4 && !w) return homography(src, dst);
  const norm = (P) => {
    const mx = P.reduce((a, p) => a + p[0], 0) / n, my = P.reduce((a, p) => a + p[1], 0) / n;
    const d = P.reduce((a, p) => a + Math.hypot(p[0] - mx, p[1] - my), 0) / n || 1, s = Math.SQRT2 / d;
    return { T: [[s, 0, -s * mx], [0, s, -s * my], [0, 0, 1]], P: P.map(([x, y]) => [(x - mx) * s, (y - my) * s]) };
  };
  const a = norm(src), b = norm(dst);
  const M = Array.from({ length: 8 }, () => new Array(8).fill(0)), v = new Array(8).fill(0);
  for (let i = 0; i < n; i++) {
    const [x, y] = a.P[i], [u, vv] = b.P[i], wi = w ? w[i] : 1;
    for (const [row, rhs] of [[[x, y, 1, 0, 0, 0, -u * x, -u * y], u], [[0, 0, 0, x, y, 1, -vv * x, -vv * y], vv]]) {
      for (let r = 0; r < 8; r++) { v[r] += wi * row[r] * rhs; for (let c = 0; c < 8; c++) M[r][c] += wi * row[r] * row[c]; }
    }
  }
  const h = solve(M, v);
  if (!h) return null;
  const Hn = [[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1]];
  const H = mul(inv3(b.T), mul(Hn, a.T));
  return H.map((r) => r.map((x) => x / H[2][2]));
}
/** Robust (Huber, iterativ neu gewichtet): Ausreißer-Punkte zählen weniger. delta in Zielkoordinaten (z. B. mm) */
export function homographyRobust(src, dst, delta = 1.5, iters = 6) {
  let H = homographyN(src, dst), w = null;
  for (let k = 0; k < iters && H; k++) {
    w = src.map((p, i) => { const [x, y] = project(H, p[0], p[1]), e = Math.hypot(x - dst[i][0], y - dst[i][1]); return e <= delta ? 1 : delta / e; });
    H = homographyN(src, dst, w) || H;
  }
  return H;
}
/** Restfehler (RMS) der Punkte nach Abbildung, in Zielkoordinaten */
export const residual = (H, src, dst) => Math.sqrt(src.reduce((a, p, i) => { const [x, y] = project(H, p[0], p[1]); return a + (x - dst[i][0]) ** 2 + (y - dst[i][1]) ** 2; }, 0) / src.length);

export function inv3(m) {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-15) return null;
  return [[A / det, -(b * i - c * h) / det, (b * f - c * e) / det], [B / det, (a * i - c * g) / det, -(a * f - c * d) / det], [C / det, -(a * h - b * g) / det, (a * e - b * d) / det]];
}
export const mul = (A, B) => A.map((r) => [0, 1, 2].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
function solve(M, v) {
  const n = v.length, A = M.map((r, i) => [...r, v[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-12) return null;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < n; r++) { if (r === c) continue; const f = A[r][c] / A[c][c]; for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k]; }
  }
  return A.map((r, i) => r[n] / r[i]);
}

/**
 * Kamera-Pose aus der Homographie Board(mm) → Bild(px). Hauptpunkt (cx, cy) ≈ Bildmitte, quadratische Pixel.
 * → { f, r1, r2, r3, t, project3(X, Y, Z) } oder null. r3 zeigt aus dem Board heraus Richtung Kamera.
 */
export function poseFromH(Hb, cx, cy, fGuess = null) {
  const col = (j) => [Hb[0][j] - cx * Hb[2][j], Hb[1][j] - cy * Hb[2][j], Hb[2][j]];
  const a = col(0), b = col(1), c3 = col(2);
  const cands = [];
  // Zwei Bedingungen (r1 ⟂ r2, |r1| = |r2|) – nur nutzen, wenn sie nicht entartet sind (z. B. Kamera nur seitlich gedreht → r1 ⟂ r2 sagt nichts)
  const sc = Math.max(a[2] ** 2, b[2] ** 2) || 1e-30;
  if (Math.abs(a[2] * b[2]) > sc * 0.05) { const f1 = -(a[0] * b[0] + a[1] * b[1]) / (a[2] * b[2]); if (Number.isFinite(f1) && f1 > 0) cands.push(f1); }
  if (Math.abs(a[2] ** 2 - b[2] ** 2) > sc * 0.05) { const f2 = -(a[0] ** 2 + a[1] ** 2 - b[0] ** 2 - b[1] ** 2) / (a[2] ** 2 - b[2] ** 2); if (Number.isFinite(f2) && f2 > 0) cands.push(f2); }
  const f = cands.length ? Math.sqrt(cands.reduce((x, y) => x + y, 0) / cands.length) : fGuess;
  if (!f || !Number.isFinite(f)) return null;
  const k = (v) => [v[0] / f, v[1] / f, v[2]];
  let m1 = k(a), m2 = k(b), m3 = k(c3);
  const lam = 2 / (Math.hypot(...m1) + Math.hypot(...m2));
  m1 = m1.map((x) => x * lam); m2 = m2.map((x) => x * lam); m3 = m3.map((x) => x * lam);
  if (m3[2] < 0) { m1 = m1.map((x) => -x); m2 = m2.map((x) => -x); m3 = m3.map((x) => -x); } // Board vor der Kamera
  let r3 = [m1[1] * m2[2] - m1[2] * m2[1], m1[2] * m2[0] - m1[0] * m2[2], m1[0] * m2[1] - m1[1] * m2[0]];
  // Kamera-Mittelpunkt im Board-System: z = −(r3 · t). Z soll zur Kamera zeigen (Darts ragen zur Kamera hin heraus).
  const sgn = -(r3[0] * m3[0] + r3[1] * m3[1] + r3[2] * m3[2]) >= 0 ? 1 : -1;
  r3 = r3.map((x) => x * sgn);
  const project3 = (X, Y, Z) => {
    const p = [0, 1, 2].map((j) => m1[j] * X + m2[j] * Y + r3[j] * Z + m3[j]);
    return [f * p[0] / p[2] + cx, f * p[1] / p[2] + cy];
  };
  return { f, r1: m1, r2: m2, r3, t: m3, project3, normalSign: sgn };
}
