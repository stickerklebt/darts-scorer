import assert from 'node:assert/strict';
import { homography, homographyN, homographyRobust, residual, project, poseFromH, CALIB_TARGETS } from '../js/homography.js';

/** Künstliche Kamera: Brennweite f, schräg von rechts, 600 mm vor dem Board */
function camera(f = 900, cx = 640, cy = 360) {
  const a = 0.6; // Drehung um die y-Achse
  const R = [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]], t = [40, 20, 650];
  return (X, Y, Z = 0) => { const p = [0, 1, 2].map((i) => R[i][0] * X + R[i][1] * Y + R[i][2] * -Z + t[i]); return [f * p[0] / p[2] + cx, f * p[1] / p[2] + cy]; };
}

test('Homographie aus vielen Punkten; robust gegen einen Ausreißer; Restfehler in mm', () => {
  const cam = camera(), board = [], img = [];
  for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2, r = k % 2 ? 170 : 99; board.push([r * Math.sin(a), -r * Math.cos(a)]); img.push(cam(...board.at(-1))); }
  const H = homographyN(img, board);
  assert.ok(residual(H, img, board) < 1e-6);
  img[5] = [img[5][0] + 25, img[5][1] - 18]; // ein verrutschter Klick
  const Hr = homographyRobust(img, board, 1.5);
  const errOthers = residual(Hr, img.filter((_, i) => i !== 5), board.filter((_, i) => i !== 5));
  assert.ok(errOthers < 0.8, `Restfehler ohne Ausreißer ${errOthers}`);
});

test('Pose aus der Homographie: Brennweite und Richtung der Board-Normale stimmen', () => {
  const cam = camera(900);
  const img = CALIB_TARGETS.map(([x, y]) => cam(x, y));
  const Hb = homography(CALIB_TARGETS, img); // Board → Bild
  const pose = poseFromH(Hb, 640, 360);
  assert.ok(Math.abs(pose.f - 900) < 20, `f = ${pose.f}`);
  // Ein Punkt 60 mm vor dem Board (Richtung Kamera) muss dort landen, wo die echte Kamera ihn sieht
  const [px, py] = pose.project3(30, -100, 60), [qx, qy] = cam(30, -100, 60);
  assert.ok(Math.hypot(px - qx, py - qy) < 3, `${px},${py} vs ${qx},${qy}`);
  const [bx, by] = project(Hb, 30, -100), [cx, cy] = cam(30, -100);
  assert.ok(Math.hypot(bx - cx, by - cy) < 1e-6);
});

test('Spitze über die Board-Normale: von der Seite gefilmt zeigt die Flight vom Board weg', async () => {
  const { tipByNormal } = await import('../js/detect-core.js');
  const cam = camera(900);
  const img = CALIB_TARGETS.map(([x, y]) => cam(x, y));
  const Hi2b = homography(img, CALIB_TARGETS), Hb = homography(CALIB_TARGETS, img);
  const pose = poseFromH(Hb, 640, 360);
  // Dart steckt bei (20, -150) (nahe D20/D1-Rand), ragt 70 mm heraus
  const tip = cam(20, -150, 0), tail = cam(20, -150, 70);
  assert.equal(tipByNormal({ tip, tail }, Hi2b, pose).tipFirst, true);
  assert.equal(tipByNormal({ tip: tail, tail: tip }, Hi2b, pose).tipFirst, false); // vertauscht → erkannt
});

test('Kalibrierung verfeinern: Ringkanten im (künstlichen) Bild finden, ungenaue Klicks werden auf < 0,5 mm korrigiert', async () => {
  const { refineCalibration } = await import('../js/calib-refine.js');
  const { homographyRobust, inv3 } = await import('../js/homography.js');
  // ~2 px pro mm wie beim Standbild (1280 px) – Board leicht schräg
  const W = 1000, Hh = 860, cam = (X, Y) => { const p = [1.9 * X + 0.1 * Y + 500, 0.04 * X + 2.1 * Y + 430, 0.0004 * X + 1]; return [p[0] / p[2], p[1] / p[2]]; };
  const trueB2I = homography(CALIB_TARGETS, CALIB_TARGETS.map(([x, y]) => cam(x, y))), trueI2B = inv3(trueB2I);
  const rgba = new Uint8ClampedArray(W * Hh * 4);
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    const [bx, by] = project(trueI2B, x, y), r = Math.hypot(bx, by), i = (y * W + x) * 4;
    const ring = (r >= 99 && r <= 107) || (r >= 162 && r <= 170), seg = Math.floor(((((Math.atan2(bx, -by) * 180) / Math.PI + 369) % 360)) / 18) % 2;
    const c = r > 170 ? [20, 20, 20] : r < 15.9 ? [40, 140, 60] : ring ? (seg ? [200, 40, 35] : [40, 150, 70]) : (seg ? [30, 28, 25] : [225, 210, 170]);
    rgba[i] = c[0]; rgba[i + 1] = c[1]; rgba[i + 2] = c[2]; rgba[i + 3] = 255;
  }
  // Getippte Punkte je ~6 px (≈ 3 mm) daneben
  const tapped = CALIB_TARGETS.map(([x, y], k) => { const [u, v] = cam(x, y); return [u + [6, -4, 4, -6][k], v + [-4, 6, 6, -4][k]]; });
  const res = refineCalibration(rgba, W, Hh, tapped, CALIB_TARGETS, { fit: (a, b) => homographyRobust(a, b, 1.5), inv: inv3 });
  assert.ok(res.n > 120, `nur ${res.n} Kanten`);
  const Href = res.toBoard;
  let worst = 0;
  for (const [bx, by] of [[0, 0], [0, -103], [120, 40], [-160, 30], [60, 150]]) {
    const [u, v] = cam(bx, by), [ex, ey] = project(Href, u, v); worst = Math.max(worst, Math.hypot(ex - bx, ey - by));
  }
  const [u0, v0] = cam(0, -103), [sx, sy] = project(homography(tapped, CALIB_TARGETS), u0, v0);
  assert.ok(worst < 0.5, `Fehler nach Verfeinern ${worst.toFixed(2)} mm (vorher ${Math.hypot(sx, sy + 103).toFixed(2)} mm)`);
});
