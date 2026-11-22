/* Web Worker: Wurferkennung abseits der Oberfläche. Bekommt RGBA-Ausschnitte, liefert Ereignisse (dart, takeout, moved). */
import { Detector, rgbaToGray } from './detect-core.js';
import { project } from './homography.js';

let det = null, debug = false;
self.onmessage = (e) => {
  const d = e.data;
  if (d.type === 'init') {
    const mask = new Uint8Array(d.w * d.h);
    for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) { const [u, v] = project(d.H, x, y); if (Math.hypot(u, v) <= 190) mask[y * d.w + x] = 1; }
    det = new Detector(d.w, d.h, d.H, mask); debug = !!d.debug;
  } else if (d.type === 'debug') debug = !!d.on;
  else if (d.type === 'takeout') det?.takeout();
  else if (d.type === 'resume') { if (det) { det.paused = false; det.empty = null; } }
  else if (d.type === 'frame' && det) {
    const r = det.feed(rgbaToGray(new Uint8ClampedArray(d.buf), det.w, det.h), d.t);
    const out = { type: 'state', state: r.state, event: r.event || null };
    if (r.event === 'dart') Object.assign(out, { tip: r.tip, axis: { center: r.axis.center, dir: r.axis.axis, length: r.axis.length }, boardX: r.boardX, boardY: r.boardY, score: r.score, confidence: r.confidence });
    if (debug && r.mask) out.mask = r.mask.buffer;
    self.postMessage(out, out.mask ? [out.mask] : []);
  }
};
