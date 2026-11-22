/* Livebild der Kamera im Spiel (Regie): klein oben rechts über der Scheibe, antippen → groß. Rote Kreise zeigen, wo die Kamera
   die Darts der laufenden Aufnahme erkannt hat (Board-mm → Bild über die Kalibrierpunkte der Kamera). */
import { ui } from '../store.js';
import { link, send } from '../camera-link.js';
import { calibrate, project } from '../homography.js';

/** Welche Kamera wird gezeigt? Die erste eingerichtete. */
export const viewCam = () => link.cams.find((c) => c.status === 'connected' && c.calibrated) || link.cams[0] || null;

export function camThumb() {
  const c = viewCam(), f = c && ui.camFrames?.[c.code];
  if (!c) return '';
  return `<button class="cam-live thumb" data-act="camBig" aria-label="Kamerabild groß"><img draggable="false" alt="" ${f ? `src="${f.img}"` : ''}><canvas></canvas>${f ? '' : '<i>Kamerabild …</i>'}</button>`;
}
export function camBigView() {
  const c = viewCam(), f = c && ui.camFrames?.[c.code];
  return `<h3>Kamera ${c?.n || ''}${c?.device ? ` · ${c.device}` : ''}</h3><p>Rote Kreise: dort hat die Kamera die Darts dieser Aufnahme erkannt.</p>
    <div class="cam-live big"><img draggable="false" alt="" ${f ? `src="${f.img}"` : ''}><canvas></canvas></div>
    <div class="sbtns"><button class="btn red" data-act="closeModal">Schließen</button></div>`;
}

/** Neues Livebild: in alle Ansichten setzen und Kreise neu zeichnen */
export function camFrame(m, code) {
  (ui.camFrames ??= {})[code] = m;
  const c = viewCam(); if (!c || c.code !== code) return;
  document.querySelectorAll('.cam-live img').forEach((im) => { im.src = m.img; im.parentElement.querySelector('i')?.remove(); });
}
export function paintCamViews() {
  document.querySelectorAll('.cam-live').forEach((box) => {
    const im = box.querySelector('img');
    if (!im.dataset.bound) { im.dataset.bound = '1'; im.addEventListener('load', () => paint(box)); }
    paint(box);
  });
}
function paint(box) {
  const im = box.querySelector('img'), cv = box.querySelector('canvas'), c = viewCam();
  if (!im?.naturalWidth || !cv) return;
  const r = im.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  cv.width = r.width * dpr; cv.height = r.height * dpr;
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, r.width, r.height);
  const cal = c?.pts?.length === 4 ? calibrate(c.pts.map(([x, y]) => [x * 1000, y * 1000])) : null;
  if (!cal) return;
  const ir = im.naturalWidth / im.naturalHeight, er = r.width / r.height;
  const f = ir > er ? { x: 0, y: (r.height - r.width / ir) / 2, w: r.width, h: r.width / ir } : { x: (r.width - r.height * ir) / 2, y: 0, w: r.height * ir, h: r.height };
  (ui.ct?.darts || []).forEach((d, i) => {
    if (!Number.isFinite(d.x)) return;
    const [px, py] = project(cal.toImage, d.x, d.y), x = f.x + (px / 1000) * f.w, y = f.y + (py / 1000) * f.h;
    g.strokeStyle = d.conf < 0.7 ? '#ffd23f' : '#ff3b2b'; g.lineWidth = box.classList.contains('big') ? 3.5 : 2;
    const R = box.classList.contains('big') ? 16 : 7;
    g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.stroke();
    if (box.classList.contains('big')) { g.fillStyle = '#fff'; g.font = 'bold 14px sans-serif'; g.textAlign = 'center'; g.fillText(String(i + 1), x, y - R - 6); }
  });
}

/** Livebild nur anfordern, solange im Spiel mit Kamera gespielt wird (alle 50 s erneuern, sonst abbestellen) */
let pvAt = 0, pvCode = null;
export function keepPreview(on) {
  const c = viewCam();
  if (on && c) { if (c.code !== pvCode || Date.now() - pvAt > 50e3) { send({ type: 'previewOn' }, c.code); pvAt = Date.now(); pvCode = c.code; } }
  else if (!on && pvCode) { send({ type: 'previewOff' }, pvCode); pvAt = 0; pvCode = null; }
}
