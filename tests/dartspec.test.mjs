import assert from 'node:assert/strict';
import { segment, straighten } from '../js/dartscan.js';
import { features, cleanSpec, flightTexture } from '../js/dartspec.js';
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
  assert.equal(sp.flight.shape, 'photo');
  assert.equal(sp.flight.outline.length, 16);
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

test('Flight-Muster: Streifen bleiben, Farben auf wenige reduziert; Muster im Steckbrief nur als PNG', () => {
  // Flight 60 Spalten, 40 hoch: abwechselnd grün/schwarz in 10er-Streifen (+ etwas Rauschen)
  const w = [...Array(60).fill(40), ...Array(40).fill(4), ...Array(60).fill(8), ...Array(30).fill(3)], W = w.length, H = 44, cy = (H - 1) / 2;
  const data = new Uint8ClampedArray(W * H * 4), alpha = new Uint8Array(W * H);
  w.forEach((ww, X) => { for (let Y = 0; Y < H; Y++) if (Math.abs(Y - cy) <= ww / 2) {
    const g = X < 60 && Math.floor(X / 10) % 2 === 0, n = ((X * 7 + Y * 13) % 11) - 5;
    alpha[Y * W + X] = 1; data.set(g ? [150 + n, 200 + n, 40 + n, 255] : [25 + n, 30 + n, 20 + n, 255], (Y * W + X) * 4);
  } });
  const t = flightTexture({ width: W, height: H, data, alpha, thick: w }, 0, 59, 60);
  assert.ok(t.pal.length >= 2 && t.pal.length <= 5, `Farben ${t.pal.length}`);
  const row = Math.floor(t.h / 2), col = (i) => t.pal[t.idx[row * t.w + i]];
  assert.ok(col(5)[1] > 150 && col(15)[1] < 60, 'Streifen grün/schwarz');
  assert.equal(cleanSpec({ flight: { tex: 'javascript:alert(1)' } }).flight.tex, undefined);
});

test('Dart-Steckbrief: kein Dart (Streifen, Fläche) wird abgelehnt', () => {
  const dbg = {};
  assert.equal(features(straightFrom(Array(200).fill(60)), dbg), null);      // Streifen: überall gleich breit, keine Spitze
  assert.match(dbg.fail, /kein Dart/);
  assert.equal(features(straightFrom(Array(60).fill(50)), {}), null);         // Fläche: zu breit für einen Dart
});

test('Dart-Steckbrief: abgetrenntes Flight-Stück hinten → kein Strich nach links, Renderer ohne Einschnürung', () => {
  // wie das 3D-Produktfoto: kleines Flügelstück, Lücke, dann die eigentliche Flight
  const w = [...Array(40).fill(30), ...Array(60).fill(0), ...Array(80).fill(120), ...Array(60).fill(10), ...Array(90).fill(24), ...Array(60).fill(6)];
  const dbg = {}, sp = features(straightFrom(w), dbg);
  assert.ok(sp && dbg.cut >= 100, `Stück hinten nicht abgeschnitten (cut ${dbg.cut})`);
  // Renderer: auch ein absichtlich kaputter Umriss (dünn hinten, Einschnürung) wird hinten ≥ 35 % und ohne Einschnürung gezeichnet
  const svg = renderDart({ ...sp, flight: { ...sp.flight, shape: 'photo', outline: [0.05, 0.05, 0.05, 0.6, 0.1, 0.1, 0.8, 1, 1, 0.9, 0.8, 0.6, 0.4, 0.3, 0.2, 0.1] } });
  const d = svg.match(/<path d="(M[^"]+)" fill="url\(#da\d+f\)"/)[1];
  // hintere Hälfte der Flight (x < 8 + 60): oberer Rand nie näher als 35 % der halben Höhe (≥ 18) an der Mitte (y = 45)
  const ys = [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].filter((m) => +m[1] < 68 && +m[2] < 45).map((m) => +m[2]);
  assert.ok(ys.length && Math.max(...ys) <= 45 - 0.35 * 18 + 0.5, `hinten zu dünn: ${Math.max(...ys)}`);
});
