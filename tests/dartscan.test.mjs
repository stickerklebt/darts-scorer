import assert from 'node:assert/strict';
import { segment, straighten, stylize } from '../js/dartscan.js';

/* Synthetischer Dart auf weißem Tisch: schräg (30°), Spitze links unten, Flight rechts oben (breit), Barrel mit dunklen Ringen */
function synth(W = 320, H = 220) {
  const data = new Uint8ClampedArray(W * H * 4).fill(245);
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  const a = -30 * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), cx = 160, cy = 110;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = (x - cx) * c + (y - cy) * s, v = -(x - cx) * s + (y - cy) * c; // u: -120 (Spitze) … +120 (Flight)
    let half = 0, col = 60;
    if (u > -120 && u < -70) half = 1.2;                 // Spitze
    else if (u >= -70 && u < 0) { half = 6; col = Math.round((u + 70) / 6) % 2 ? 90 : 30; } // Barrel mit Ringen
    else if (u >= 0 && u < 50) half = 2.5;                // Schaft
    else if (u >= 50 && u < 120) half = 28;               // Flight
    if (Math.abs(v) <= half) { const i = (y * W + x) * 4; data[i] = data[i + 1] = data[i + 2] = col; }
  }
  return { width: W, height: H, data };
}

test('Dart-Foto: Dart freigestellt, waagerecht, Flight links und Spitze rechts', () => {
  const img = synth();
  const { mask } = segment(img);
  const n = mask.reduce((a, b) => a + b, 0);
  assert.ok(n > 2000, `Maske zu klein: ${n}`);
  const st = straighten(img, mask);
  assert.ok(st.width > 200 && st.width < 260, `Länge ${st.width}`);
  assert.ok(st.height > 45 && st.height < 70, `Höhe ${st.height}`);
  const t = st.thick, third = Math.floor(t.length / 3);
  const left = Math.max(...t.slice(0, third)), right = Math.max(...t.slice(-third));
  assert.ok(left > right * 3, 'Flight muss links sein');
  const sy = stylize(st);
  assert.equal(sy.data.length, st.width * st.height * 4);
});
