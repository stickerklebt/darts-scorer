/* „501“ + „Double Out“ aus hellem, gebürstetem Titan (SVG-Text + Filter):
   1. Verlauf mit vielen Stops als Umgebungsreflexion (dunkles Band, fast weiß, ein Hauch Rot vom Stoff in den dunkelsten Zonen)
   2. gebürstete Mikrostruktur: feTurbulence mit anisotroper Frequenz („0.002 0.9“)
   3. Fase/Kanten: helle Innenkante oben, dunkle Kante unten, feSpecularLighting mit fePointLight (#mtlLight)
   Jede Ziffer ist ein eigenes <svg> (einzeln animierbar), alle teilen sich EIN Koordinatensystem (viewBox-Versatz),
   damit das eine Licht über alle Ziffern gleichmäßig wandert. Steuerung: `metalLight` unten. */
import { TUNE } from '../intro-config.js';

const W = 150, H = 232, SUB_Y = 244, SUB_H = 62; // Ziffernfeld je 150 breit, Untertitel darunter
const STOPS = [[0, '#5d6168'], [0.1, '#c9ced5'], [0.2, '#fbfcfd'], [0.29, '#dfe3e8'], [0.38, '#9da3ab'], [0.46, '#3a2e33'], [0.5, '#2a2226'],
  [0.56, '#8c9199'], [0.66, '#e9ecf0'], [0.74, '#ffffff'], [0.83, '#bcc1c8'], [0.92, '#6c7078'], [1, '#a7adb5']];
const grad = (id, y0, y1) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${y0}" x2="40" y2="${y1}">${STOPS.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;

const FILTER = `<filter id="mtlF" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.002 0.9" numOctaves="2" seed="7" result="n"/>
  <feColorMatrix in="n" type="matrix" values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 1" result="ng"/>
  <feComposite in="ng" in2="SourceGraphic" operator="arithmetic" k1="0.55" k2="0" k3="0.78" k4="-0.03" result="br"/>
  <feComposite in="br" in2="SourceAlpha" operator="in" result="brushed"/>
  <feOffset in="SourceAlpha" dy="-2.4" result="up"/><feComposite in="SourceAlpha" in2="up" operator="out" result="botE"/>
  <feFlood flood-color="#160a0d" flood-opacity=".8"/><feComposite in2="botE" operator="in" result="dark"/>
  <feOffset in="SourceAlpha" dy="1.6" result="dn"/><feComposite in="SourceAlpha" in2="dn" operator="out" result="topE"/>
  <feFlood flood-color="#ffffff" flood-opacity=".9"/><feComposite in2="topE" operator="in" result="lite"/>
  <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="bl"/>
  <feSpecularLighting id="mtlSpec" in="bl" surfaceScale="4.5" specularConstant="${TUNE.light.spec}" specularExponent="${TUNE.light.exp}" lighting-color="#ffffff" result="spec">
    <fePointLight id="mtlLight" x="225" y="-40" z="${TUNE.light.z}"/></feSpecularLighting>
  <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn"/>
  <feMerge result="base"><feMergeNode in="brushed"/><feMergeNode in="dark"/><feMergeNode in="lite"/></feMerge>
  <feComposite in="specIn" in2="base" operator="arithmetic" k2=".85" k3="1" result="out"/>
</filter>`;

const digit = (ch, i) => `<svg class="m501-d" viewBox="${i * W} 0 ${W} ${H}" aria-hidden="true"><text x="${i * W + W / 2}" y="${H - 34}" text-anchor="middle" fill="url(#mtlG)" filter="url(#mtlF)">${ch}</text></svg>`;

/** Markup der Titan-501 (für die 501-Kachel) */
export function metal501() {
  return `<div class="m501" role="img" aria-label="501 Double Out">
    <svg class="m501-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>${grad('mtlG', 20, H - 20)}${grad('mtlS', SUB_Y, SUB_Y + SUB_H)}${FILTER}</defs></svg>
    <div class="m501-digits">${['5', '0', '1'].map(digit).join('')}</div>
    <svg class="m501-sub" viewBox="0 ${SUB_Y} ${3 * W} ${SUB_H}" aria-hidden="true"><text x="${1.5 * W}" y="${SUB_Y + 42}" text-anchor="middle" fill="url(#mtlS)" filter="url(#mtlF)">Double Out</text></svg>
    <i class="m501-glint g1" aria-hidden="true"></i><i class="m501-glint g2" aria-hidden="true"></i>
  </div>`;
}

/* ---------- Licht: langsame Bahn (~10 s), folgt dem Finger, Taschenlampen-Sweep alle 6–8 s; pausiert, wenn unsichtbar ---------- */
const L = TUNE.light;
const state = { frac: null, raf: 0, t0: 0, visible: true, follow: null, press: false, sweep: null, nextSweep: 0, cur: { x: 225, y: -40, s: L.spec }, still: false, io: null, el: null };

function setLight(x, y, s) {
  const li = document.getElementById('mtlLight'), sp = document.getElementById('mtlSpec');
  if (!li) return;
  li.setAttribute('x', x.toFixed(1)); li.setAttribute('y', y.toFixed(1));
  sp?.setAttribute('specularConstant', s.toFixed(2));
  // dasselbe Licht auf den Linien neben der Zahl (Kachel-Koordinaten 1000 × 560): unter dem Finger/der Maus genau, sonst aus der Bahn der Zahl umgerechnet
  const ll = document.getElementById('slL');
  if (ll) {
    const f = state.frac || { x: 0.11 + 0.78 * (x / 450), y: 0.12 + 0.72 * (y / 300) };
    ll.setAttribute('cx', (f.x * 1000).toFixed(0)); ll.setAttribute('cy', (f.y * 560).toFixed(0));
    ll.setAttribute('r', (150 + 60 * s).toFixed(0));
  }
}
/** Glints: kurz an einer Kante aufblitzen, wenn das Licht vorbeizieht */
function glint(which) {
  const g = state.el?.querySelector(`.m501-glint.${which}`);
  g?.animate([{ opacity: 0, transform: 'scale(.4) rotate(0deg)' }, { opacity: 1, transform: 'scale(1) rotate(25deg)', offset: 0.35 }, { opacity: 0, transform: 'scale(.6) rotate(45deg)' }],
    { duration: 520, easing: 'ease-out' });
}

function frame(now) {
  state.raf = 0;
  if (!state.visible || document.hidden || !document.getElementById('mtlLight')) return;
  const t = (now - state.t0) / 1000;
  // Grundbahn: organische Lissajous-Schleife über der Zahl
  const ph = (t / L.loop) * Math.PI * 2;
  let tx = 225 + 210 * Math.sin(ph) + 30 * Math.sin(ph * 2.3), ty = 70 + 95 * Math.sin(ph * 0.5 + 1) + 20 * Math.cos(ph * 1.7), ts = L.spec;
  if (state.follow) { tx = state.follow.x; ty = state.follow.y; ts = state.press ? L.pressSpec : L.spec * 1.3; }
  if (state.sweep) {
    const k = (now - state.sweep.t) / state.sweep.dur;
    if (k >= 1) state.sweep = null;
    else {
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      tx = -140 + 760 * e; ty = -90 + 420 * e; ts = L.spec + (L.sweepSpec - L.spec) * Math.sin(Math.PI * k);
      if (!state.sweep.g1 && tx > 30) { state.sweep.g1 = 1; glint('g1'); }
      if (!state.sweep.g2 && tx > 400) { state.sweep.g2 = 1; glint('g2'); }
    }
  } else if (!state.follow && !state.still && now > state.nextSweep) {
    sweep(600);
  }
  const f = state.sweep ? 1 : state.follow ? 0.35 : L.follow;
  const c = state.cur;
  c.x += (tx - c.x) * f; c.y += (ty - c.y) * f; c.s += (ts - c.s) * 0.2;
  setLight(c.x, c.y, c.s);
  state.raf = requestAnimationFrame(frame);
}
const schedule = (now = performance.now()) => { const [a, b] = L.sweepEvery; state.nextSweep = now + (a + Math.random() * (b - a)) * 1000; };
const kick = () => { if (!state.raf && state.visible && !document.hidden && !state.still) state.raf = requestAnimationFrame(frame); };

/** Taschenlampen-Sweep jetzt (dur in ms) */
export function sweep(dur = 600) {
  state.sweep = { t: performance.now(), dur }; schedule(); kick();
  if (state.still) { // ohne Dauerlicht: Sweep trotzdem einmal zeigen
    const t0 = performance.now();
    const step = (now) => { const k = Math.min(1, (now - t0) / dur); setLight(-140 + 760 * k, -90 + 420 * k, L.spec + (L.sweepSpec - L.spec) * Math.sin(Math.PI * k)); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
}

/** Licht-Steuerung starten (nach jedem Zeichnen aufrufen – bindet sich nur einmal an die aktuelle Kachel). still: kein Dauerlicht */
export function metalLight(still = false) {
  state.still = still;
  const el = document.querySelector('.silk-hero');
  if (!el) { if (state.io) { state.io.disconnect(); state.io = null; } state.el = null; return; }
  if (el === state.el) { kick(); return; }
  state.el = el; state.t0 = performance.now(); schedule();
  state.io?.disconnect();
  if ('IntersectionObserver' in window) {
    state.io = new IntersectionObserver((es) => { state.visible = es.some((e) => e.isIntersecting); kick(); });
    state.io.observe(el);
  }
  let rect = null, hrect = null;
  const frac = (e) => { const r = hrect || (hrect = el.getBoundingClientRect()); return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }; };
  const toSvg = (e) => { // Finger → Koordinaten der Zahl (0–450 × 0–300); Rechteck nur beim Aufsetzen gemessen
    const r = rect || (rect = el.querySelector('.m501').getBoundingClientRect());
    return { x: ((e.clientX - r.left) / r.width) * 450, y: ((e.clientY - r.top) / r.height) * 300 };
  };
  el.addEventListener('pointerdown', (e) => { rect = null; hrect = null; state.frac = frac(e); state.press = true; state.follow = toSvg(e); state.cur.x = state.follow.x; state.cur.y = state.follow.y; el.classList.add('pressing'); kick(); });
  el.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' || state.press) { state.follow = toSvg(e); state.frac = frac(e); kick(); } });
  el.addEventListener('pointerenter', () => { rect = null; hrect = null; });
  const up = () => { state.press = false; el.classList.remove('pressing'); };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', () => { up(); state.follow = null; state.frac = null; });
  el.addEventListener('pointerleave', () => { up(); state.follow = null; state.frac = null; });
  kick();
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
