import assert from 'node:assert/strict';
import { segment, straighten } from '../js/dartscan.js';
import { features, cleanSpec } from '../js/dartspec.js';
import { renderDart } from '../js/ui/dartart.js';

/* Synthetischer Dart auf hellem Tisch, schräg: Spitze · Barrel mit 6 dunklen Rillen · Schaft · rote Standard-Flight (hinten gerade) */
function synth(W = 400, H = 260, tipHalf = 1.5) {
  const data = new Uint8ClampedArray(W * H * 4).fill(240);
  const a = -25 * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), cx = 200, cy = 130;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = (x - cx) * c + (y - cy) * s, v = -(x - cx) * s + (y - cy) * c; // -150 Spitze … +150 Flight
    let half = 0, col = [70, 70, 75];
    if (u > -150 && u < -95) half = tipHalf;
    else if (u >= -95 && u < -10) { half = 7; col = [175, 180, 188]; if (u > -80 && u < -25 && ((Math.round(u) % 10) + 10) % 10 < 3) col = [40, 40, 45]; }
    else if (u >= -10 && u < 70) half = 3;
    else if (u >= 70 && u < 150) { half = 36; col = [190, 30, 50]; }
    if (Math.abs(v) <= half) { const i = (y * W + x) * 4; data[i] = col[0]; data[i + 1] = col[1]; data[i + 2] = col[2]; }
  }
  return { width: W, height: H, data };
}

test('Dart-Steckbrief: Längen, Rillen, Metall, Flight-Farbe und -Form aus dem Foto', () => {
  const img = synth(), st = straighten(img, segment(img).mask), sp = features(st);
  assert.ok(sp, 'kein Steckbrief');
  assert.ok(Math.abs(sp.len.barrel - 85 / 300) < 0.07, `Barrel ${sp.len.barrel}`);
  assert.ok(Math.abs(sp.len.flight - 80 / 300) < 0.07, `Flight ${sp.len.flight}`);
  assert.ok(sp.rings.length >= 4 && sp.rings.length <= 8, `Rillen ${sp.rings.length}`);
  assert.equal(sp.metal, 'silver');
  assert.equal(sp.flight.shape, 'standard');
  const [r, g] = [1, 3].map((i) => parseInt(sp.flight.colors[0].slice(i, i + 2), 16));
  assert.ok(r > 140 && g < 80, `Flight-Farbe ${sp.flight.colors[0]}`);
});

test('Dart-Steckbrief: fremde Daten werden bereinigt, Zeichnung ist gleichbleibend', () => {
  assert.equal(cleanSpec('data:image/png;base64,xx'), null);
  const sp = cleanSpec({ metal: 'evil', tone: '"><script>', flight: { shape: 'x', colors: ['red', '#ABCDEF'] }, rings: [2, -1] });
  assert.equal(sp.metal, 'silver'); assert.equal(sp.tone, '#9da3ab');
  assert.deepEqual(sp.flight.colors, ['#abcdef']); assert.deepEqual(sp.rings, [0, 1]);
  const a = renderDart(sp).replace(/da\d+/g, ''), b = renderDart(sp).replace(/da\d+/g, '');
  assert.equal(a, b); assert.ok(a.startsWith('<svg') && !a.includes('NaN') && !a.includes('<script'));
});

/** Fertig ausgerichteter Dart (Flight links) aus einem Breitenprofil – prüft nur die Zonen-Logik, ohne Segmentierung */
function straightFrom(widths) {
  const W = widths.length, H = Math.max(...widths) + 4, cy = (H - 1) / 2, data = new Uint8ClampedArray(W * H * 4), alpha = new Uint8Array(W * H);
  widths.forEach((w, X) => { for (let Y = 0; Y < H; Y++) if (Math.abs(Y - cy) <= w / 2) { alpha[Y * W + X] = 1; data.set([150, 150, 150, 255], (Y * W + X) * 4); } });
  return { width: W, height: H, data, alpha, thick: widths };
}

test('Dart-Steckbrief: Soft-Dart – Spitze halb so dick wie der Barrel wird nicht als Barrel gezählt', () => {
  // wie das Produktfoto vom 26.11.: Flight 57 · Schaft 46 (4 px) · Barrel 71 (8 px) · Spitze 31 (4 px)
  const w = [...Array(57).fill(40), ...Array(46).fill(4), ...Array(71).fill(8), ...Array(31).fill(4)];
  const sp = features(straightFrom(w));
  assert.ok(sp, 'kein Steckbrief');
  assert.ok(Math.abs(sp.len.barrel - 71 / 205) < 0.03, `Barrel ${sp.len.barrel}`);
  assert.ok(Math.abs(sp.len.tip - 31 / 205) < 0.03, `Spitze ${sp.len.tip}`);
});
