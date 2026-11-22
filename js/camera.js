/* Kamera (Beta) im Spiel: Kamera verbinden, Scheibe kalibrieren (4 Punkte), Darts erkennen → Vorschlag.
   Video, Kalibrier-Ansicht und kleines Vorschaufenster liegen AUSSERHALB von #app (render/morph würde das Video sonst neu
   anlegen). Die Kalibrierung gilt je Gerät (localStorage 'darts.cam'), nichts wird hochgeladen. */
import * as CD from './camdetect.js';

const KEY = 'darts.cam';
const W = 200; // Breite des Rechenbilds (verkleinert, schnell)
let stream = null, video = null, panel = null, calibEl = null, loop = null, canvas = null, ctx = null;
let H = null, mask = null, st = null, fh = 150, hooks = {};

export const camOn = () => !!stream;
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
const store = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* */ } };

export async function camToggle(h) {
  hooks = h;
  if (stream) { camStop(); return; }
  if (!navigator.mediaDevices?.getUserMedia) { hooks.toast?.('Kamera geht nur über HTTPS und in einem aktuellen Browser'); return; }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false });
  } catch (e) { stream = null; hooks.toast?.('Kamera nicht erlaubt oder nicht verfügbar'); return; }
  video = document.createElement('video');
  video.playsInline = true; video.muted = true; video.autoplay = true; video.srcObject = stream;
  await video.play().catch(() => {});
  await new Promise((ok) => (video.videoWidth ? ok() : video.addEventListener('loadedmetadata', ok, { once: true })));
  fh = Math.round((W * video.videoHeight) / video.videoWidth);
  canvas = document.createElement('canvas'); canvas.width = W; canvas.height = fh;
  ctx = canvas.getContext('2d', { willReadFrequently: true });
  buildPanel();
  const cal = load();
  if (cal?.pts?.length === 4) { setCalib(cal.pts); startLoop(); } else openCalib();
  hooks.render?.();
}

export function camStop(silent = false) {
  clearInterval(loop); loop = null;
  stream?.getTracks().forEach((t) => t.stop()); stream = null;
  panel?.remove(); panel = null; calibEl?.remove(); calibEl = null; video = null;
  if (!silent) hooks.render?.();
}

/** Neuer Zug: erkannte Darts vergessen, Referenzbild bleibt */
export function camResetTurn() { if (st) st.darts = []; setStatus('Bereit – wirf'); }

function setCalib(pts) {
  const src = pts.map(([nx, ny]) => [nx * W, ny * fh]);
  H = CD.homography(src, CD.CALIB_TARGETS);
  mask = H ? CD.boardMask(H, W, fh) : null;
  st = { ref: null, prev: null, still: 0, darts: [] };
}

function frame() {
  ctx.drawImage(video, 0, 0, W, fh);
  return CD.toGray(ctx.getImageData(0, 0, W, fh).data, W, fh);
}

function startLoop() {
  clearInterval(loop);
  setStatus('Bereit – wirf');
  loop = setInterval(() => {
    if (!video || !H || document.hidden) return;
    const r = CD.step(st, frame(), W, fh, H, mask);
    if (r.event === 'dart') { setStatus(`Erkannt: ${st.darts.map(lbl).join(' · ')}`); hooks.onDarts?.(st.darts.slice()); }
    else if (r.event === 'clear') { setStatus('Bereit – wirf'); hooks.onClear?.(); }
  }, 220);
}

const lbl = (d) => (d.n === 0 ? 'daneben' : d.n === 25 ? (d.m === 2 ? 'Bull' : '25') : `${d.m === 3 ? 'T' : d.m === 2 ? 'D' : 'S'}${d.n}`);

function setStatus(t) { const s = panel?.querySelector('.cam-st'); if (s) s.textContent = t; }

/* Kleines Vorschaufenster oben rechts: Live-Bild, Status, Neu kalibrieren, Aus */
function buildPanel() {
  panel = document.createElement('div');
  panel.className = 'campanel';
  panel.innerHTML = '<div class="cam-v"></div><div class="cam-st">Kamera an</div><div class="cam-b"><button data-cam="calib">Kalibrieren</button><button data-cam="off">Aus</button></div><small class="cam-beta">Beta · nur Vorschlag</small>';
  panel.querySelector('.cam-v').appendChild(video);
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cam]'); if (!b) return;
    if (b.dataset.cam === 'off') camStop(); else openCalib();
  });
  document.body.appendChild(panel);
}

/* Kalibrieren: großes Bild, 4 Punkte am äußeren Doppelring antippen */
function openCalib() {
  clearInterval(loop);
  calibEl?.remove();
  calibEl = document.createElement('div');
  calibEl.className = 'camcalib';
  const pts = [];
  const big = document.createElement('video');
  big.playsInline = true; big.muted = true; big.autoplay = true; big.srcObject = stream; big.play().catch(() => {});
  calibEl.innerHTML = `<div class="cc-head"><b>Scheibe kalibrieren</b><span class="cc-t"></span>
    <small>Handy fest UNTER die Scheibe stellen, schräg nach oben. Dann nacheinander auf den äußeren Rand des Doppelrings tippen.</small></div>
    <div class="cc-v"></div><div class="cc-b"><button data-cc="undo">Zurück</button><button data-cc="cancel">Abbrechen</button></div>`;
  const box = calibEl.querySelector('.cc-v');
  box.appendChild(big);
  const say = () => { calibEl.querySelector('.cc-t').textContent = `Punkt ${pts.length + 1} von 4: ${CD.CALIB_NAMES[pts.length]}`; };
  const dots = () => { box.querySelectorAll('i').forEach((x) => x.remove()); pts.forEach(([nx, ny], i) => { const r = big.getBoundingClientRect(), b = box.getBoundingClientRect(); const fit = contain(big); const dot = document.createElement('i'); dot.textContent = i + 1; dot.style.left = `${fit.x + nx * fit.w - (b.left - r.left)}px`; dot.style.top = `${fit.y + ny * fit.h - (b.top - r.top)}px`; box.appendChild(dot); }); };
  say();
  box.addEventListener('click', (e) => {
    const r = big.getBoundingClientRect(), fit = contain(big);
    const nx = (e.clientX - r.left - fit.x) / fit.w, ny = (e.clientY - r.top - fit.y) / fit.h;
    if (nx < 0 || ny < 0 || nx > 1 || ny > 1) return;
    pts.push([nx, ny]); dots();
    if (pts.length === 4) {
      store({ pts }); setCalib(pts);
      calibEl.remove(); calibEl = null;
      if (!H) { hooks.toast?.('Kalibrierung ging schief – bitte nochmal'); openCalib(); return; }
      hooks.toast?.('Kalibriert – die Kamera schlägt jetzt vor, was du triffst'); startLoop();
    } else say();
  });
  calibEl.querySelector('.cc-b').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cc]'); if (!b) return;
    if (b.dataset.cc === 'undo') { pts.pop(); dots(); say(); }
    else { calibEl.remove(); calibEl = null; if (H) startLoop(); else camStop(); }
  });
  document.body.appendChild(calibEl);
}
/** Wo liegt das Bild im Video-Element (object-fit: contain)? */
function contain(v) {
  const r = v.getBoundingClientRect(), vr = v.videoWidth / v.videoHeight, er = r.width / r.height;
  if (vr > er) { const h = r.width / vr; return { x: 0, y: (r.height - h) / 2, w: r.width, h }; }
  const w = r.height * vr; return { x: (r.width - w) / 2, y: 0, w, h: r.height };
}
