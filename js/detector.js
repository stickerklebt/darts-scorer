/* Erkennung auf dem Kamera-Gerät: schneidet den Bereich ums Board aus dem Video (max. 800 px breit), schickt ~12 Bilder/s
   an den Worker (Fallback: gleiche Logik im Hauptthread), erzeugt bei jedem Dart ein kleines JPEG mit markierter Spitze.
   Pausiert, wenn die App im Hintergrund ist. */
import { homography, project, CALIB_TARGETS } from './homography.js';
import { Detector, rgbaToGray } from './detect-core.js';

const FPS = 10, IDLE_FPS = 4, MAX_W = 640; // Akku schonen: kleiner rechnen, in Ruhe nur 4 Bilder/s

export class CamDetector {
  /** video: laufendes <video>; pts: 4 Kalibrierpunkte (0–1, relativ zum Video); onEvent(e) */
  constructor(video, pts, onEvent) {
    this.video = video; this.onEvent = onEvent; this.debug = false; this.running = false; this.dartIndex = 0;
    const vw = video.videoWidth, vh = video.videoHeight, P = pts.map(([x, y]) => [x * vw, y * vh]);
    // Ausschnitt: Rechteck um die 4 Punkte + 30 % Rand
    const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]);
    const mx = (Math.max(...xs) - Math.min(...xs)) * 0.3, my = (Math.max(...ys) - Math.min(...ys)) * 0.3;
    const x0 = Math.max(0, Math.min(...xs) - mx), y0 = Math.max(0, Math.min(...ys) - my);
    const x1 = Math.min(vw, Math.max(...xs) + mx), y1 = Math.min(vh, Math.max(...ys) + my);
    this.crop = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    this.s = Math.min(1, MAX_W / this.crop.w);
    this.w = Math.max(40, Math.round(this.crop.w * this.s)); this.h = Math.max(40, Math.round(this.crop.h * this.s));
    this.H = homography(P.map(([x, y]) => [(x - x0) * this.s, (y - y0) * this.s]), CALIB_TARGETS);
    this.canvas = document.createElement('canvas'); this.canvas.width = this.w; this.canvas.height = this.h;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    try {
      this.worker = new Worker('js/detector-worker.js', { type: 'module' });
      this.worker.onmessage = (e) => this.result(e.data);
      this.worker.onerror = () => this.fallback();
      this.worker.postMessage({ type: 'init', w: this.w, h: this.h, H: this.H, debug: this.debug });
    } catch { this.fallback(); }
  }
  fallback() {
    this.worker?.terminate(); this.worker = null;
    const mask = new Uint8Array(this.w * this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { const [u, v] = project(this.H, x, y); if (Math.hypot(u, v) <= 190) mask[y * this.w + x] = 1; }
    this.local = new Detector(this.w, this.h, this.H, mask);
  }
  start() { if (this.running) return; this.running = true; this.loop(); }
  stop() { this.running = false; clearTimeout(this.t); }
  destroy() { this.stop(); this.worker?.terminate(); }
  setDebug(on) { this.debug = on; this.worker?.postMessage({ type: 'debug', on }); }
  takeout() { this.dartIndex = 0; this.worker ? this.worker.postMessage({ type: 'takeout' }) : this.local?.takeout(); }
  resume() { this.worker ? this.worker.postMessage({ type: 'resume' }) : Object.assign(this.local, { paused: false, empty: null }); }
  loop() {
    if (!this.running) return;
    this.t = setTimeout(() => this.loop(), 1000 / (performance.now() - (this.lastMotion || 0) > 20000 ? IDLE_FPS : FPS));
    if (document.hidden || this.busy || !this.video.videoWidth) return;
    const { x, y, w, h } = this.crop;
    this.ctx.drawImage(this.video, x, y, w, h, 0, 0, this.w, this.h);
    const img = this.ctx.getImageData(0, 0, this.w, this.h);
    if (this.worker) { this.busy = true; this.worker.postMessage({ type: 'frame', buf: img.data.buffer, t: performance.now() }, [img.data.buffer]); }
    else { const r = this.local.feed(rgbaToGray(img.data, this.w, this.h), performance.now()); this.result({ state: r.state, event: r.event || null, tip: r.tip, boardX: r.boardX, boardY: r.boardY, score: r.score, confidence: r.confidence, axis: r.axis && { center: r.axis.center, dir: r.axis.axis, length: r.axis.length }, mask: this.debug ? r.mask?.buffer : null }); }
  }
  result(d) {
    this.busy = false;
    if (d.state === 'motion' || d.event) this.lastMotion = performance.now();
    if (d.event === 'takeout') this.dartIndex = 0;
    if (d.event === 'dart') { this.dartIndex = Math.min(3, this.dartIndex + 1); d.dartIndex = this.dartIndex; d.snapshot = this.snapshot(d.tip); d.tipVideo = [this.crop.x + d.tip[0] / this.s, this.crop.y + d.tip[1] / this.s]; }
    this.onEvent(d);
  }
  /** Kleines JPEG (320 px) vom Ausschnitt mit markierter Spitze */
  snapshot(tip) {
    const c = document.createElement('canvas'), sw = 320, sh = Math.round((320 * this.h) / this.w);
    c.width = sw; c.height = sh;
    const g = c.getContext('2d'), { x, y, w, h } = this.crop;
    g.drawImage(this.video, x, y, w, h, 0, 0, sw, sh);
    const k = sw / this.w;
    g.strokeStyle = '#ffd23f'; g.lineWidth = 2.5; g.beginPath(); g.arc(tip[0] * k, tip[1] * k, 9, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(tip[0] * k - 14, tip[1] * k); g.lineTo(tip[0] * k + 14, tip[1] * k); g.moveTo(tip[0] * k, tip[1] * k - 14); g.lineTo(tip[0] * k, tip[1] * k + 14); g.stroke();
    try { return c.toDataURL('image/jpeg', 0.6); } catch { return null; }
  }
}
