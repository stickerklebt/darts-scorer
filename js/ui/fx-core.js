/* Animations-Grundgerüst: Vollbild-Ebene außerhalb von #app, Partikel auf Canvas, Wackeln, Zeitsteuerung.
   Antippen überspringt jede Animation. */

let current = null, frozen = false;
export const fxRunning = () => !!current;
/* Nur zum Prüfen per Konsole: Animation anhalten (Standbild) */
globalThis.__fxFreeze = () => { frozen = true; document.getAnimations?.().forEach((a) => a.pause()); if (current) current.timers.forEach(clearTimeout); };
globalThis.__fxThaw = () => { frozen = false; stopFx(); };

/** Zufall im Bereich */
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const MAGIC = ['#ff4fb3', '#52e4ff', '#a66bff', '#ffd45c', '#7dff9b', '#ff7a3d'];

/* ---------- Partikel ---------- */
export class Particles {
  constructor(parent) {
    this.c = document.createElement('canvas');
    this.c.className = 'fx-canvas';
    parent.appendChild(this.c);
    this.x = this.c.getContext('2d');
    this.list = [];
    this.emitters = [];
    this.resize();
    this.t0 = performance.now();
    this.last = this.t0;
    this.running = true;
    const loop = (t) => { if (!this.running) return; if (!frozen) this.step(t); else this.last = t; requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  resize() {
    const d = Math.min(2, window.devicePixelRatio || 1);
    this.w = window.innerWidth; this.h = window.innerHeight;
    this.c.width = this.w * d; this.c.height = this.h * d;
    this.x.setTransform(d, 0, 0, d, 0, 0);
  }
  add(p) {
    this.list.push({ vx: 0, vy: 0, ax: 0, ay: 0, drag: 0, life: 1500, age: 0, size: 6, rot: 0, vr: 0, shape: 'rect', color: '#fff', alpha: 1, fade: true, grow: 0, ...p });
  }
  /** Emitter: fn(p, t) wird pro Frame aufgerufen, solange t < until */
  every(fn, from = 0, until = Infinity) { this.emitters.push({ fn, from, until }); }
  burst(n, mk) { for (let i = 0; i < n; i++) this.add(mk(i)); }
  step(t) {
    const dt = Math.min(48, t - this.last); this.last = t;
    const el = t - this.t0, x = this.x;
    for (const e of this.emitters) if (el >= e.from && el < e.until) e.fn(this, el, dt);
    x.clearRect(0, 0, this.w, this.h);
    const k = dt / 1000;
    this.list = this.list.filter((p) => (p.age += dt) < p.life);
    for (const p of this.list) {
      p.vx += p.ax * k; p.vy += p.ay * k;
      if (p.drag) { p.vx *= 1 - p.drag * k; p.vy *= 1 - p.drag * k; }
      p.x += p.vx * k; p.y += p.vy * k; p.rot += p.vr * k; p.size += p.grow * k;
      const a = p.fade ? p.alpha * (1 - p.age / p.life) : p.alpha;
      if (a <= 0 || p.size <= 0) continue;
      x.globalAlpha = a;
      x.save(); x.translate(p.x, p.y); x.rotate(p.rot);
      x.fillStyle = p.color; x.strokeStyle = p.color;
      const s = p.size;
      switch (p.shape) {
        case 'circle': x.beginPath(); x.arc(0, 0, s, 0, 6.283); x.fill(); break;
        case 'ring': x.lineWidth = Math.max(1, s * 0.12); x.beginPath(); x.arc(0, 0, s, 0, 6.283); x.stroke(); break;
        case 'tri': x.beginPath(); x.moveTo(0, -s); x.lineTo(s * 0.87, s * 0.5); x.lineTo(-s * 0.87, s * 0.5); x.closePath(); x.fill(); x.strokeStyle = '#0e1211'; x.lineWidth = 1.5; x.stroke(); break;
        case 'spark': x.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? s * 0.22 : s; const a2 = (i * Math.PI) / 4; x.lineTo(Math.cos(a2) * r, Math.sin(a2) * r); } x.closePath(); x.fill(); break;
        case 'streak': x.fillRect(-s * 2.2, -s * 0.18, s * 4.4, s * 0.36); break;
        case 'drop': x.beginPath(); x.ellipse(0, 0, s * 0.6, s, 0, 0, 6.283); x.fill(); break;
        case 'shard': x.beginPath(); x.moveTo(-s, -s * 0.4); x.lineTo(s * 0.8, -s); x.lineTo(s * 0.4, s); x.closePath(); x.fill(); x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 1.2; x.stroke(); break;
        default: x.fillRect(-s / 2, -s * 0.3, s, s * 0.6);
      }
      x.restore();
    }
    x.globalAlpha = 1;
  }
  stop() { this.running = false; }
}

/* ---------- Wackeln (ganzer Bildschirm) ---------- */
export function shake(strength = 10, ms = 400) {
  const els = [document.getElementById('app'), current?.el].filter(Boolean);
  const t0 = performance.now();
  const tick = (t) => {
    const p = (t - t0) / ms;
    if (p >= 1 || !current) { els.forEach((e) => { e.style.transform = ''; }); return; }
    const k = strength * (1 - p);
    const tr = `translate(${rand(-k, k).toFixed(1)}px, ${rand(-k, k).toFixed(1)}px) rotate(${rand(-k, k) * 0.08}deg)`;
    els.forEach((e) => { e.style.transform = tr; });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ---------- Zeitsteuerung ---------- */
export function at(ms, fn) { const id = setTimeout(() => { if (current) fn(); }, ms); current?.timers.push(id); }

/** HTML-Knoten in die Ebene einfügen */
export function add(el, html, cls = '') {
  const d = document.createElement('div');
  if (cls) d.className = cls;
  d.innerHTML = html;
  el.appendChild(d);
  return d;
}

/**
 * Animation abspielen. build(el, ctx) baut sie auf; gibt optional { onEnd } zurück.
 * Ergebnis: Promise, das nach `ms` oder beim Antippen erfüllt wird.
 */
export function play(name, build, ms, ctx = {}) {
  stopFx();
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = `fx fx-${name}`;
    el.style.setProperty('--dur', `${ms}ms`);
    document.body.appendChild(el);
    current = { el, timers: [], parts: [], resolve };
    const res = build(el, ctx) || {};
    current.onEnd = res.onEnd;
    const end = () => stopFx();
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); end(); });
    current.timers.push(setTimeout(end, ms));
  });
}

/** Partikel-System, das mit der Animation aufgeräumt wird */
export function particles(el) { const p = new Particles(el); current?.parts.push(p); return p; }

export function stopFx() {
  if (!current) return;
  const c = current;
  current = null;
  c.timers.forEach(clearTimeout);
  c.parts.forEach((p) => p.stop());
  try { c.onEnd?.(); } catch (e) { /* */ }
  const app = document.getElementById('app');
  if (app) app.style.transform = '';
  frozen = false;
  c.el.classList.add('out');
  setTimeout(() => c.el.remove(), 160);
  c.resolve();
}
