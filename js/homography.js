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
