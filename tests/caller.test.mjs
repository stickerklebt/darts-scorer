import assert from 'node:assert/strict';
import { trimNormalize, encodeWav, wavDuration, peaksOf, resample } from '../js/caller.js';

test('Caller: Stille abschneiden, normalisieren, WAV schreiben', () => {
  const rate = 1000, d = new Float32Array(3000);
  for (let i = 1000; i < 2000; i++) d[i] = 0.25 * Math.sin(i / 3);
  const out = trimNormalize(d, rate);
  assert.ok(out.length > 1000 && out.length < 1200, `Länge ${out.length}`);
  const peak = Math.max(...out.map(Math.abs));
  assert.ok(Math.abs(peak - 0.9) < 0.02, `Spitze ${peak}`);
  const wav = encodeWav(out, rate);
  assert.equal(Buffer.from(wav).toString('ascii', 0, 4), 'RIFF');
  assert.ok(Math.abs(wavDuration(wav) - out.length / rate) < 1e-9);
  assert.equal(peaksOf(out, 10).length, 10);
  assert.equal(trimNormalize(new Float32Array(500), rate).length, 0); // nur Stille → nichts
});

test('Caller: Abtastrate umrechnen (48 kHz → 22,05 kHz), Verlauf bleibt erhalten', () => {
  const d = new Float32Array(48000);
  for (let i = 0; i < d.length; i++) d[i] = i / d.length;          // Rampe 0 → 1
  const r = resample(d, 48000, 22050);
  assert.equal(r.length, 22050);
  assert.ok(Math.abs(r[11025] - 0.5) < 0.001, String(r[11025]));
  assert.equal(resample(d, 22050, 22050), d);
});
