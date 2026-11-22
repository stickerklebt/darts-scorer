/* Kamera einrichten vom ANDEREN Gerät aus (Steuer-Gerät, gleiches Konto). Das Handy steht schon und wird nicht mehr angefasst:
   Livebild kommt als JPEG über camera-link (frame), hier wird geholfen, getippt und geprüft; die 4 Punkte gehen ans Handy (calibrate).
   1 Aufstellen (mit Livebild) · 2 Vier Punkte auf einem scharfen Standbild (Lupe, verschiebbar) · 3 Kontrolle (Overlay auf Livebild) · 4 Testdart. */
import { calibrate, project, CALIB_NAMES } from '../homography.js';
import { OVERLAY, RADII } from '../board-geometry.js';
import { send } from '../camera-link.js';

let S = null; // { step, el, img, still, pts, drag, test, onDone, toast }

export const setupOpen = () => !!S;

export function openRemoteSetup({ code, n = 1, toast, onDone }) {
  closeRemoteSetup(true);
  S = { code, n, step: 1, el: document.createElement('div'), img: null, still: null, pts: [], drag: -1, test: [], onDone, toast, frameAt: 0 };
  S.el.className = 'calib remote';
  document.body.appendChild(S.el);
  S.el.addEventListener('click', onClick);
  send({ type: 'recalibrate' }, code);
  send({ type: 'previewOn' }, code);
  send({ type: 'listCams' }, code);
  render();
}
export function closeRemoteSetup(silent = false) {
  if (!S) return;
  send({ type: 'previewOff' }, S.code);
  S.el.remove(); const cb = S.onDone; S = null;
  if (!silent) cb?.();
}

/** Nachrichten vom Kamera-Gerät, solange der Assistent offen ist */
export function setupMessage(m, code) {
  if (!S || code !== S.code) return false;
  if (m.type === 'frame') {
    if (m.still) { S.still = m; if (S.step === 2) render(); }
    else { S.img = m; S.frameAt = Date.now(); updateLive(); }
    return true;
  }
  if (m.type === 'cams') { S.lenses = m.list || []; S.lens = m.current; if (S.step === 1) render(); return true; }
  if (m.type === 'throw' && S.step === 4) { S.test.unshift(`${m.label} (${Math.round((m.confidence ?? 1) * 100)} %)`); render(); return true; }
  return false;
}

const SKETCH = `<svg class="cal-sketch" viewBox="0 0 220 120" aria-hidden="true">
  <rect x="2" y="2" width="216" height="116" fill="none" stroke="#3a3229"/>
  <circle cx="70" cy="60" r="40" fill="#1d1913" stroke="#d4a63a" stroke-width="2"/><circle cx="70" cy="60" r="4" fill="#e5402c"/>
  <rect x="160" y="70" width="14" height="26" rx="2" fill="#0b0a08" stroke="#f3e9d2" stroke-width="1.5"/><circle cx="167" cy="76" r="2" fill="#f3e9d2"/>
  <path d="M160 80 L112 64" stroke="#ffd86b" stroke-dasharray="3 3"/><path d="M118 108 H160" stroke="#a89d87"/><text x="122" y="104" fill="#a89d87" font-size="9">40–80 cm</text>
  <text x="140" y="24" fill="#a89d87" font-size="9">≥ 30 cm vom Rand</text></svg>`;

function render() {
  if (!S) return;
  const live = '<div class="rs-live"><img class="rs-img" alt=""><canvas class="cal-ov"></canvas><span class="rs-wait">Warte auf Bild vom Handy …</span></div>';
  if (S.step === 1) {
    S.el.innerHTML = `<div class="cal-h"><small>Kamera ${S.n} einrichten · 1 von 4</small><b>Handy aufstellen</b></div>
      <div class="rs-two">${live}<div class="rs-help"><p class="cal-big">Stell dein Handy seitlich neben das Board (Stuhl, Regal oder Klemmhalter), ca. 40–80 cm entfernt,
        etwa auf Boardhöhe oder leicht darunter, schräg auf das Board gerichtet. Mindestens 30 cm außerhalb des Boardrands, damit keine Darts
        das Handy treffen.</p><p class="cal-big"><b>Das ganze Board muss im Bild sein</b> – links siehst du live, was das Handy sieht.</p>
        ${(S.lenses || []).length > 1 ? `<div class="cc-lens"><small>Objektiv am Handy:</small>${S.lenses.map((l) => `<button class="${l.id === S.lens ? 'on' : ''}" data-r="lens" data-id="${l.id}">${l.label}</button>`).join('')}</div>` : ''}${SKETCH}</div></div>
      <div class="cal-btns"><button data-r="cancel">Abbrechen</button><button class="go" data-r="next">Steht – weiter</button></div>`;
  } else if (S.step === 2) {
    const done = S.pts.length === 4;
    S.el.innerHTML = `<div class="cal-h"><small>Kamera ${S.n} einrichten · 2 von 4</small><b>${done ? 'Alle 4 Punkte gesetzt' : `Tippe auf Punkt ${S.pts.length + 1}: ${CALIB_NAMES[S.pts.length]}`}</b>
        <span>Äußerer Rand des Doppelrings, jeweils in der Mitte des Feldes. Beim Tippen erscheint eine Lupe, Punkte lassen sich verschieben.</span></div>
      <div class="rs-live rs-still">${S.still ? `<img class="rs-img" src="${S.still.img}" alt="Standbild">` : '<span class="rs-wait">Hole ein scharfes Bild vom Handy …</span>'}<canvas class="cal-ov"></canvas><canvas class="cal-lupe"></canvas></div>
      <div class="cal-btns"><button data-r="reset">Zurücksetzen</button><button data-r="still">Neues Bild</button><button data-r="cancel">Abbrechen</button><button class="go" data-r="next" ${done ? '' : 'disabled'}>Weiter</button></div>`;
    if (!S.still) send({ type: 'still' }, S.code);
    else requestAnimationFrame(() => { drawPts(); bindPts(); });
  } else if (S.step === 3) {
    S.el.innerHTML = `<div class="cal-h"><small>Kamera ${S.n} einrichten · 3 von 4</small><b>Passt das Gitter?</b><span>Ringe und Linien sollten im Livebild genau auf den Drähten liegen.</span></div>
      ${live}<div class="cal-btns"><button data-r="redo">Neu setzen</button><button class="go" data-r="next">Passt</button></div>`;
  } else {
    S.el.innerHTML = `<div class="cal-h"><small>Kamera ${S.n} einrichten · 4 von 4</small><b>Wirf einen Testdart</b><span>Optional – zeigt, was die Kamera erkennt. Danach Darts ziehen und weiter testen oder fertig.</span></div>
      <div class="cal-test"><b class="cal-res">${S.test.length ? `Erkannt: ${S.test[0]}` : 'Warte auf Wurf …'}</b>${S.test.length > 1 ? `<small>${S.test.slice(1, 5).join(' · ')}</small>` : ''}</div>
      <div class="cal-btns"><button data-r="back">Zurück zum Gitter</button><button class="go" data-r="finish">Fertig</button></div>`;
  }
  updateLive();
}

/** Livebild + (ab Schritt 3) Overlay aktualisieren, ohne den Rest neu zu bauen */
function updateLive() {
  if (!S || S.step === 2 || S.step === 4) return;
  const box = S.el.querySelector('.rs-live'); if (!box) return;
  const im = box.querySelector('.rs-img'), wait = box.querySelector('.rs-wait');
  if (S.img) { im.src = S.img.img; if (wait) wait.style.display = 'none'; }
  if (S.step === 3 && S.img) im.onload = () => drawGrid(box.querySelector('.cal-ov'), im, S.pts);
}

function fit(im) {
  const r = im.getBoundingClientRect(), nw = im.naturalWidth || 1, nh = im.naturalHeight || 1, ir = nw / nh, er = r.width / r.height;
  if (ir > er) { const h = r.width / ir; return { x: 0, y: (r.height - h) / 2, w: r.width, h, r }; }
  const w = r.height * ir; return { x: (r.width - w) / 2, y: 0, w, h: r.height, r };
}
function prep(canvas, f) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = f.r.width * dpr; canvas.height = f.r.height * dpr;
  const g = canvas.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, f.r.width, f.r.height); return g;
}
function drawGrid(canvas, im, pts) {
  if (!canvas || !im.naturalWidth || pts.length < 4) return;
  const f = fit(im), g = prep(canvas, f), cal = calibrate(pts.map(([x, y]) => [x * 1000, y * 1000]));
  if (!cal) return;
  const toScr = (mx, my) => { const [px, py] = project(cal.toImage, mx, my); return [f.x + (px / 1000) * f.w, f.y + (py / 1000) * f.h]; };
  g.strokeStyle = 'rgba(255,214,107,.9)'; g.lineWidth = 1.4;
  for (const R of OVERLAY.rings) { g.beginPath(); for (let i = 0; i <= 96; i++) { const a = (i / 96) * Math.PI * 2, [x, y] = toScr(R * Math.sin(a), -R * Math.cos(a)); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  for (const deg of OVERLAY.spokes) { const a = (deg * Math.PI) / 180, [x0, y0] = toScr(RADII.outer * Math.sin(a), -RADII.outer * Math.cos(a)), [x1, y1] = toScr(RADII.dblOut * Math.sin(a), -RADII.dblOut * Math.cos(a)); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
}
function drawPts() {
  const box = S.el.querySelector('.rs-still'), im = box?.querySelector('.rs-img'), ov = box?.querySelector('.cal-ov');
  if (!im || !ov) return;
  if (!im.complete) { im.onload = drawPts; return; }
  if (S.pts.length === 4) drawGrid(ov, im, S.pts); else prep(ov, fit(im));
  const f = fit(im), g = ov.getContext('2d');
  S.pts.forEach(([x, y], i) => {
    const sx = f.x + x * f.w, sy = f.y + y * f.h;
    g.strokeStyle = '#ffd23f'; g.fillStyle = 'rgba(255,210,63,.25)'; g.lineWidth = 2;
    g.beginPath(); g.arc(sx, sy, 11, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#f3e9d2'; g.font = '13px sans-serif'; g.textAlign = 'center'; g.fillText(String(i + 1), sx, sy - 16);
  });
}
function bindPts() {
  const box = S.el.querySelector('.rs-still'), im = box?.querySelector('.rs-img'), lupe = box?.querySelector('.cal-lupe');
  if (!im) return;
  const norm = (e) => { const f = fit(im); return [(e.clientX - f.r.left - f.x) / f.w, (e.clientY - f.r.top - f.y) / f.h]; };
  const showLupe = (e, p) => {
    const f = fit(im), L = 140, zoom = 3, nw = im.naturalWidth, nh = im.naturalHeight, sw = (L / zoom) * (nw / f.w), sh = (L / zoom) * (nh / f.h);
    lupe.width = L; lupe.height = L; lupe.style.display = 'block';
    lupe.style.left = `${e.clientX - f.r.left - L / 2}px`; lupe.style.top = `${e.clientY - f.r.top - L - 44}px`;
    const g = lupe.getContext('2d'); g.clearRect(0, 0, L, L);
    g.drawImage(im, p[0] * nw - sw / 2, p[1] * nh - sh / 2, sw, sh, 0, 0, L, L);
    g.strokeStyle = '#ffd23f'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(L / 2, L / 2 - 16); g.lineTo(L / 2, L / 2 + 16); g.moveTo(L / 2 - 16, L / 2); g.lineTo(L / 2 + 16, L / 2); g.stroke();
  };
  box.addEventListener('pointerdown', (e) => {
    const p = norm(e); if (p[0] < 0 || p[1] < 0 || p[0] > 1 || p[1] > 1) return;
    const f = fit(im);
    S.drag = S.pts.findIndex(([x, y]) => Math.hypot((x - p[0]) * f.w, (y - p[1]) * f.h) < 28);
    if (S.drag < 0 && S.pts.length < 4) { S.pts.push(p); S.drag = S.pts.length - 1; }
    if (S.drag < 0) return;
    box.setPointerCapture(e.pointerId); showLupe(e, S.pts[S.drag]); drawPts();
  });
  box.addEventListener('pointermove', (e) => { if (S.drag < 0) return; const p = norm(e); S.pts[S.drag] = [Math.min(1, Math.max(0, p[0])), Math.min(1, Math.max(0, p[1]))]; showLupe(e, S.pts[S.drag]); drawPts(); });
  const end = () => { if (S.drag < 0) return; S.drag = -1; lupe.style.display = 'none'; render(); };
  box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
}

function onClick(e) {
  const b = e.target.closest('[data-r]'); if (!b || b.disabled || !S) return;
  const c = b.dataset.r;
  if (c === 'cancel') return closeRemoteSetup();
  if (c === 'lens') { send({ type: 'useCam', id: b.dataset.id }, S.code); S.lens = b.dataset.id; S.img = null; setTimeout(() => send({ type: 'previewOn' }, S.code), 1500); return render(); }
  if (c === 'reset') { S.pts = []; return render(); }
  if (c === 'still') { S.still = null; S.pts = []; return render(); }
  if (c === 'redo') { S.step = 2; return render(); }
  if (c === 'back') { S.step = 3; return render(); }
  if (c === 'next') {
    if (S.step === 3) { send({ type: 'calibrate', pts: S.pts }, S.code); S.test = []; }
    S.step++; return render();
  }
  if (c === 'finish') { S.toast?.('Kamera eingerichtet'); return closeRemoteSetup(); }
}
