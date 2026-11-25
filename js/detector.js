/* Erkennung auf dem Kamera-Gerät: schneidet den Bereich ums Board aus dem Video (max. 800 px breit), schickt ~12 Bilder/s
   an den Worker (Fallback: gleiche Logik im Hauptthread), erzeugt bei jedem Dart ein kleines JPEG mit markierter Spitze.
   Pausiert, wenn die App im Hintergrund ist. */
import { homography, homographyN, homographyRobust, project, CALIB_TARGETS } from './homography.js';
import { Detector, rgbaToGray, refineTip } from './detect-core.js';
import { scoreFromBoardMM } from './board-geometry.js';

const FPS = 10, IDLE_FPS = 4, MAX_W = 640; // Akku schonen: kleiner rechnen, in Ruhe nur 4 Bilder/s

export class CamDetector {
  /** video: laufendes <video>; pts: 4 Kalibrierpunkte (0–1, relativ zum Video); onEvent(e); extra: Zusatzpunkte [{ img: [nx, ny], board: [x, y] }] */
  constructor(video, pts, onEvent, extra = []) {
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
    const toCrop = ([x, y]) => [(x - x0) * this.s, (y - y0) * this.s];
    const src = [...P.map(toCrop), ...extra.map((e) => toCrop([e.img[0] * vw, e.img[1] * vh]))], dst = [...CALIB_TARGETS, ...extra.map((e) => e.board)];
    this.H = (extra.length > 8 ? homographyRobust(src, dst, 1.5) : extra.length ? homographyN(src, dst) : null) || homography(P.map(toCrop), CALIB_TARGETS);
    // Hauptpunkt (Videomitte) und geschätzte Brennweite in Ausschnitt-Koordinaten – für die Kamera-Pose (Spitze über die Board-Normale)
    this.pp = [(vw / 2 - x0) * this.s, (vh / 2 - y0) * this.s]; this.fGuess = 0.85 * Math.max(vw, vh) * this.s;
    this.canvas = document.createElement('canvas'); this.canvas.width = this.w; this.canvas.height = this.h;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    try {
      this.worker = new Worker('js/detector-worker.js', { type: 'module' });
      this.worker.onmessage = (e) => this.result(e.data);
      this.worker.onerror = () => this.fallback();
      this.worker.postMessage({ type: 'init', w: this.w, h: this.h, H: this.H, debug: this.debug, pp: this.pp, fGuess: this.fGuess });
    setTimeout(() => this.grabRef(), 1200);
    } catch { this.fallback(); }
  }
  fallback() {
    this.worker?.terminate(); this.worker = null;
    const mask = new Uint8Array(this.w * this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { const [u, v] = project(this.H, x, y); if (Math.hypot(u, v) <= 190) mask[y * this.w + x] = 1; }
    this.local = new Detector(this.w, this.h, this.H, mask, { pp: this.pp, fGuess: this.fGuess });
  }
  start() { if (this.running) return; this.running = true; this.loop(); }
  stop() { this.running = false; clearTimeout(this.t); }
  destroy() { this.stop(); this.worker?.terminate(); }
  setDebug(on) { this.debug = on; this.worker?.postMessage({ type: 'debug', on }); }
  takeout() { setTimeout(() => this.grabRef(), 400); this.dartIndex = 0; this.worker ? this.worker.postMessage({ type: 'takeout' }) : this.local?.takeout(); }
  resume() { this.worker ? this.worker.postMessage({ type: 'resume' }) : Object.assign(this.local, { paused: false, empty: null }); }
  loop() {
    if (!this.running) return;
    this.t = setTimeout(() => this.loop(), 1000 / (performance.now() - (this.lastMotion || 0) > 20000 ? IDLE_FPS : FPS));
    if (document.hidden || this.busy || !this.video.videoWidth) return;
    const { x, y, w, h } = this.crop;
    this.ctx.drawImage(this.video, x, y, w, h, 0, 0, this.w, this.h);
    const img = this.ctx.getImageData(0, 0, this.w, this.h);
    if (this.worker) { this.busy = true; this.worker.postMessage({ type: 'frame', buf: img.data.buffer, t: performance.now() }, [img.data.buffer]); }
    else { const r = this.local.feed(rgbaToGray(img.data, this.w, this.h), performance.now()); this.result({ state: r.state, event: r.event || null, tip: r.tip, tail: r.tail, hidden: r.hidden, boardX: r.boardX, boardY: r.boardY, score: r.score, confidence: r.confidence, axis: r.axis && { center: r.axis.center, dir: r.axis.axis, length: r.axis.length }, mask: this.debug ? r.mask?.buffer : null }); }
  }
  result(d) {
    this.busy = false;
    if (d.state === 'motion' || d.event) this.lastMotion = performance.now();
    if (d.event === 'takeout') { this.dartIndex = 0; setTimeout(() => this.grabRef(), 400); }
    if (d.event === 'dart') { this.fine(d).then((e) => this.onEvent(e)); return; }
    this.onEvent(d);
  }

  /** Graustufen aus dem Video in voller Auflösung (Rechteck in Videopixeln) */
  grayFull(x, y, w, h) {
    const c = this.full ??= document.createElement('canvas');
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(this.video, x, y, w, h, 0, 0, w, h);
    const px = g.getImageData(0, 0, w, h).data, out = new Float32Array(w * h);
    for (let i = 0, j = 0; i < out.length; i++, j += 4) out[i] = px[j] * 0.299 + px[j + 1] * 0.587 + px[j + 2] * 0.114;
    return out;
  }
  /** Referenz des ganzen Board-Ausschnitts in voller Auflösung (nach jedem Dart und nach dem Ziehen neu) */
  grabRef() {
    if (!this.video.videoWidth) return;
    const { x, y, w, h } = this.crop;
    this.refFull = { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
    this.refFull.g = this.grayFull(this.refFull.x, this.refFull.y, this.refFull.w, this.refFull.h);
  }

  /**
   * Feinstufe: um die grobe Spitze 160×160 Videopixel aus 4 Bildern mitteln, mit der Referenz vergleichen und die Spitze auf
   * Subpixel genau bestimmen. Plausibel nur, wenn sie ≤ 6 mm von der groben Spitze liegt – sonst grob behalten (weniger sicher).
   */
  async fine(d) {
    this.dartIndex = Math.min(3, this.dartIndex + 1); d.dartIndex = this.dartIndex;
    const vx = this.crop.x + d.tip[0] / this.s, vy = this.crop.y + d.tip[1] / this.s;
    let dir = d.tail ? [d.tail[0] - d.tip[0], d.tail[1] - d.tip[1]] : d.axis?.dir || [1, 0];
    const L = Math.hypot(dir[0], dir[1]) || 1; dir = [dir[0] / L, dir[1] / L];
    d.coarse = [d.boardX, d.boardY];
    const R = this.refFull, P = 160, px0 = Math.round(vx - P / 2), py0 = Math.round(vy - P / 2);
    try {
      if (R && px0 >= R.x && py0 >= R.y && px0 + P <= R.x + R.w && py0 + P <= R.y + R.h && px0 >= 0 && py0 >= 0) {
        const acc = new Float32Array(P * P);
        for (let k = 0; k < 4; k++) { const g = this.grayFull(px0, py0, P, P); for (let i = 0; i < acc.length; i++) acc[i] += g[i] / 4; if (k < 3) await new Promise((r) => setTimeout(r, 45)); }
        const ref = new Float32Array(P * P);
        for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) ref[y * P + x] = R.g[(py0 - R.y + y) * R.w + (px0 - R.x + x)];
        const r = refineTip(acc, ref, P, P, [vx - px0, vy - py0], dir);
        if (r.ok) {
          const fx = px0 + r.tip[0], fy = py0 + r.tip[1];
          const [bx, by] = project(this.H, (fx - this.crop.x) * this.s, (fy - this.crop.y) * this.s);
          if (Math.hypot(bx - d.boardX, by - d.boardY) <= 6) { d.boardX = bx; d.boardY = by; d.tip = [(fx - this.crop.x) * this.s, (fy - this.crop.y) * this.s]; d.fine = true; }
          else d.confidence = Math.round(d.confidence * 0.8 * 100) / 100;
        }
      }
    } catch { /* Feinstufe ist ein Bonus – grob bleibt gültig */ }
    const sc = scoreFromBoardMM(d.boardX, d.boardY);
    d.score = sc;
    if (d.fine) { // Feinstufe gelungen: Sicherheit hängt vor allem davon ab, wie nah die Spitze an einem Draht liegt
      const wireF = sc.wire < 1 ? 0.6 : sc.wire < 2 ? 0.8 : 1;
      d.confidence = Math.round(Math.max(d.confidence, 0.85) * wireF * 100) / 100;
    }
    if (d.hidden) d.confidence = Math.min(d.confidence, 0.75); // Spitze verdeckt → bitte prüfen
    d.tipVideo = [this.crop.x + d.tip[0] / this.s, this.crop.y + d.tip[1] / this.s];
    d.snapshot = this.snapshot(d.tip);
    this.grabRef();
    return d;
  }
  /** JPEG (480 px breit) aus dem Video, auf die Spitze zentriert (Ausschnitt ~240 Videopixel), feines Fadenkreuz */
  snapshot(tip) {
    const vx = this.crop.x + tip[0] / this.s, vy = this.crop.y + tip[1] / this.s, S = 240, K = 2;
    const c = document.createElement('canvas'); c.width = S * K; c.height = S * K * 0.75;
    const g = c.getContext('2d');
    g.drawImage(this.video, vx - S / 2, vy - S * 0.375, S, S * 0.75, 0, 0, c.width, c.height);
    const cx = c.width / 2, cy = c.height / 2;
    g.strokeStyle = '#eef1f6'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(cx - 14, cy); g.lineTo(cx - 3, cy); g.moveTo(cx + 3, cy); g.lineTo(cx + 14, cy); g.moveTo(cx, cy - 14); g.lineTo(cx, cy - 3); g.moveTo(cx, cy + 3); g.lineTo(cx, cy + 14); g.stroke();
    g.fillStyle = '#eef1f6'; g.beginPath(); g.arc(cx, cy, 2, 0, Math.PI * 2); g.fill();
    try { return c.toDataURL('image/jpeg', 0.7); } catch { return null; }
  }
}
