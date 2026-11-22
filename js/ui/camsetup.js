/* Kamera einrichten an der REGIE (gleiches Konto). Das Handy steht schon und wird nicht mehr angefasst:
   Livebild kommt als JPEG über camera-link (frame), hier wird geholfen, getippt und geprüft; die 4 Punkte gehen ans Handy (calibrate).
   1 Aufstellen (Livebild, Objektiv) · 2 Vier Punkte auf scharfem Standbild (Lupe, verschiebbar, Gitter erscheint)
   3 Gitter im Livebild prüfen und nachziehen · 4 Testdart: Livebild mit Markierung, Treffer ploppen rechts auf. */
import { calibrate, project } from '../homography.js';
import { OVERLAY, RADII } from '../board-geometry.js';
import { send } from '../camera-link.js';

let S = null;
const FIELDS = ['D20', 'D6', 'D3', 'D11'];

export const setupOpen = () => !!S;

export function openRemoteSetup({ code, n = 1, toast, onDone }) {
  closeRemoteSetup(true);
  S = { code, n, step: 1, el: document.createElement('div'), img: null, still: null, pts: [], drag: -1, test: [], onDone, toast, lenses: [], lens: null };
  S.el.className = 'calib remote';
  document.body.appendChild(S.el);
  S.el.addEventListener('click', onClick);
  send({ type: 'recalibrate' }, code);
  send({ type: 'previewOn' }, code);
  send({ type: 'listCams' }, code);
  S.keep = setInterval(() => send({ type: 'previewOn' }, code), 60e3); // Livebild am Handy wach halten
  render();
}
export function closeRemoteSetup(silent = false) {
  if (!S) return;
  clearInterval(S.keep);
  send({ type: 'previewOff' }, S.code);
  S.el.remove(); const cb = S.onDone; S = null;
  if (!silent) cb?.();
}

/** Nachrichten vom Kamera-Gerät, solange der Assistent offen ist */
export function setupMessage(m, code) {
  if (!S || code !== S.code) return false;
  if (m.type === 'frame') {
    if (m.still) { S.still = m; if (S.step === 2) render(); }
    else { S.img = m; showLive(); }
    return true;
  }
  if (m.type === 'cams') { S.lenses = m.list || []; S.lens = m.current; if (S.step === 1) render(); return true; }
  if (m.type === 'throw' && S.step === 4) {
    const txt = m.label === 'MISS' ? 'Daneben' : `${m.label} getroffen`;
    S.test.unshift({ txt, x: m.boardX, y: m.boardY, sure: (m.confidence ?? 1) >= 0.7, at: Date.now() });
    S.test = S.test.slice(0, 6);
    render(); return true;
  }
  return false;
}

const SKETCH = `<svg class="cal-sketch" viewBox="0 0 220 120" aria-hidden="true">
  <rect x="2" y="2" width="216" height="116" fill="none" stroke="#3a3229"/>
  <circle cx="70" cy="60" r="40" fill="#1d1913" stroke="#d4a63a" stroke-width="2"/><circle cx="70" cy="60" r="4" fill="#e5402c"/>
  <rect x="160" y="70" width="14" height="26" rx="2" fill="#0b0a08" stroke="#f3e9d2" stroke-width="1.5"/><circle cx="167" cy="76" r="2" fill="#f3e9d2"/>
  <path d="M160 80 L112 64" stroke="#ffd86b" stroke-dasharray="3 3"/><path d="M118 108 H160" stroke="#a89d87"/><text x="122" y="104" fill="#a89d87" font-size="9">40–80 cm</text>
  <text x="140" y="24" fill="#a89d87" font-size="9">≥ 30 cm vom Rand</text></svg>`;

/** Bildbühne: Bild + Zeichenebene + Lupe. kind 'live' bekommt jedes neue Livebild. */
const stage = (kind, src = '') => `<div class="rs-live" data-stage="${kind}"><img class="rs-img" draggable="false" alt="" ${src ? `src="${src}"` : ''}><canvas class="cal-ov"></canvas><canvas class="cal-lupe"></canvas>
  <span class="rs-wait" ${src ? 'hidden' : ''}>${kind === 'still' ? 'Hole ein scharfes Bild vom Handy …' : 'Warte auf Bild vom Handy …'}</span></div>`;

function render() {
  if (!S) return;
  const h = (no, title, sub = '') => `<div class="cal-h"><small>Kamera ${S.n} einrichten · ${no} von 4</small><b>${title}</b>${sub ? `<span>${sub}</span>` : ''}</div>`;
  if (S.step === 1) {
    S.el.innerHTML = `${h(1, 'Handy aufstellen')}
      <div class="rs-two">${stage('live', S.img?.img)}<div class="rs-help"><p class="cal-big">Stell dein Handy seitlich neben das Board – Stuhl, Regal oder Klemmhalter, ca. 40–80 cm entfernt,
        etwa auf Boardhöhe oder leicht darunter, schräg aufs Board gerichtet. Mindestens 30 cm neben dem Boardrand, damit kein Dart das Handy trifft.</p>
        <p class="cal-big"><b>Das ganze Board muss im Bild sein.</b> Links siehst du live, was das Handy sieht.</p>
        ${S.lenses.length > 1 ? `<div class="cc-lens"><small>Objektiv am Handy:</small>${S.lenses.map((l) => `<button class="${l.id === S.lens ? 'on' : ''}" data-r="lens" data-id="${l.id}">${l.label}</button>`).join('')}</div>` : ''}${SKETCH}</div></div>
      <div class="cal-btns"><button data-r="cancel">Abbrechen</button><button class="go" data-r="next">Steht – weiter</button></div>`;
  } else if (S.step === 2) {
    const k = S.pts.length;
    const title = k < 4 ? `Tippe auf die genaue Mitte der ${FIELDS[k]}` : 'Ziehe die Punkte, bis die goldenen Ringe genau auf den Drähten liegen';
    S.el.innerHTML = `${h(2, title, k < 4 ? 'Gedrückt halten zum Zielen – die Lupe zeigt dir die Stelle.' : 'Punkt antippen und ziehen – das Gitter bewegt sich mit.')}
      ${stage('still', S.still?.img)}
      <div class="cal-btns"><button data-r="reset">Alle Punkte löschen</button><button data-r="still">Neues Bild</button><button data-r="cancel">Abbrechen</button><button class="go" data-r="next" ${k === 4 ? '' : 'disabled'}>Weiter</button></div>`;
    if (!S.still) send({ type: 'still' }, S.code);
  } else if (S.step === 3) {
    const re = Number.isInteger(S.replace) ? S.replace : null;
    S.el.innerHTML = `${h(3, re !== null ? `Tippe auf die genaue Mitte der ${FIELDS[re]}` : 'Liegt das Gitter genau auf den Drähten?', re !== null ? 'Der Punkt wird neu gesetzt.' : 'Wenn nicht: einen Punkt ziehen – oder rechts einen Punkt neu setzen. Das Bild ist live.')}
      <div class="rs-two side">${stage('live', S.img?.img)}<div class="rs-side"><b>Neuen Punkt setzen</b>
        ${FIELDS.map((f, i) => `<button class="${re === i ? 'on' : ''}" data-r="repoint" data-i="${i}">${f} neu setzen</button>`).join('')}</div></div>
      <div class="cal-btns"><button data-r="redo">Punkte neu setzen</button><button class="go" data-r="next">Passt</button></div>`;
  } else {
    S.el.innerHTML = `${h(4, 'Wirf einen Testdart', 'Die Kamera zeigt rechts, was sie erkennt. Darts ziehen und so oft testen, wie du willst.')}
      <div class="rs-two test">${stage('live', S.img?.img)}<div class="rs-pops">${S.test.length ? S.test.map((t, i) => `<div class="rs-pop ${t.sure ? '' : 'unsure'} ${i === 0 && Date.now() - t.at < 1500 ? 'new' : ''}">${t.txt}${t.sure ? '' : '<small>unsicher</small>'}</div>`).join('') : '<p class="rs-idle">Warte auf Wurf …</p>'}</div></div>
      <div class="cal-btns"><button data-r="back">Gitter nachziehen</button><button class="go" data-r="finish">Fertig</button></div>`;
  }
  const box = S.el.querySelector('.rs-live');
  if (box) {
    const im = box.querySelector('.rs-img');
    im.addEventListener('load', () => draw(box));
    if (im.complete && im.naturalWidth) requestAnimationFrame(() => draw(box));
    if (S.step === 2 || S.step === 3) bind(box);
  }
}

/** Neues Livebild in die Bühne setzen (ohne den Rest neu zu bauen) */
function showLive() {
  const box = S?.el.querySelector('[data-stage="live"]'); if (!box) return;
  if (S.drag >= 0) return; // beim Ziehen nicht das Bild tauschen
  box.querySelector('.rs-img').src = S.img.img;
  box.querySelector('.rs-wait')?.setAttribute('hidden', '');
}

function fit(im) {
  const r = im.getBoundingClientRect(), nw = im.naturalWidth || 1, nh = im.naturalHeight || 1, ir = nw / nh, er = r.width / r.height;
  if (ir > er) { const h = r.width / ir; return { x: 0, y: (r.height - h) / 2, w: r.width, h, r }; }
  const w = r.height * ir; return { x: (r.width - w) / 2, y: 0, w, h: r.height, r };
}

/** Gitter (ab 4 Punkten), Punkte und – im Test – erkannte Treffer zeichnen */
function draw(box) {
  if (!S) return;
  const im = box.querySelector('.rs-img'), cv = box.querySelector('.cal-ov');
  if (!im?.naturalWidth || !cv) return;
  const f = fit(im), dpr = window.devicePixelRatio || 1;
  cv.width = f.r.width * dpr; cv.height = f.r.height * dpr;
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, f.r.width, f.r.height);
  const cal = S.pts.length === 4 ? calibrate(S.pts.map(([x, y]) => [x * 1000, y * 1000])) : null;
  const toScr = (mx, my) => { const [px, py] = project(cal.toImage, mx, my); return [f.x + (px / 1000) * f.w, f.y + (py / 1000) * f.h]; };
  if (cal) {
    g.strokeStyle = 'rgba(255,214,107,.95)'; g.lineWidth = 1.5;
    for (const R of OVERLAY.rings) { g.beginPath(); for (let i = 0; i <= 120; i++) { const a = (i / 120) * Math.PI * 2, [x, y] = toScr(R * Math.sin(a), -R * Math.cos(a)); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
    for (const deg of OVERLAY.spokes) { const a = (deg * Math.PI) / 180, [x0, y0] = toScr(RADII.outer * Math.sin(a), -RADII.outer * Math.cos(a)), [x1, y1] = toScr(RADII.dblOut * Math.sin(a), -RADII.dblOut * Math.cos(a)); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
    if (S.step === 4) S.test.forEach((t, i) => { if (!Number.isFinite(t.x)) return; const [x, y] = toScr(t.x, t.y); g.strokeStyle = i === 0 ? '#ff4d3a' : 'rgba(255,77,58,.5)'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 10, 0, Math.PI * 2); g.stroke(); });
  }
  if (S.step === 2 || S.step === 3) S.pts.forEach(([x, y], i) => {
    const sx = f.x + x * f.w, sy = f.y + y * f.h;
    g.strokeStyle = '#ffd23f'; g.fillStyle = 'rgba(255,210,63,.3)'; g.lineWidth = 2.5;
    g.beginPath(); g.arc(sx, sy, 13, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(sx - 6, sy); g.lineTo(sx + 6, sy); g.moveTo(sx, sy - 6); g.lineTo(sx, sy + 6); g.stroke();
    g.fillStyle = '#f3e9d2'; g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.fillText(FIELDS[i], sx, sy - 19);
  });
}

/** Punkte setzen/ziehen mit Lupe. Kein natives Bild-Ziehen (sonst schiebt der Mac eine verkleinerte Kopie mit). */
function bind(box) {
  const im = box.querySelector('.rs-img'), lupe = box.querySelector('.cal-lupe');
  const norm = (e) => { const f = fit(im); return [(e.clientX - f.r.left - f.x) / f.w, (e.clientY - f.r.top - f.y) / f.h]; };
  const showLupe = (e, p) => {
    if (!im.naturalWidth) return;
    const f = fit(im), L = 150, zoom = 3.2, nw = im.naturalWidth, nh = im.naturalHeight, sw = (L / zoom) * (nw / f.w), sh = (L / zoom) * (nh / f.h);
    lupe.width = L; lupe.height = L; lupe.style.display = 'block';
    lupe.style.left = `${e.clientX - f.r.left - L / 2}px`; lupe.style.top = `${Math.max(4, e.clientY - f.r.top - L - 44)}px`;
    const g = lupe.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, L, L);
    g.drawImage(im, p[0] * nw - sw / 2, p[1] * nh - sh / 2, sw, sh, 0, 0, L, L);
    g.strokeStyle = '#ffd23f'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(L / 2, L / 2 - 18); g.lineTo(L / 2, L / 2 + 18); g.moveTo(L / 2 - 18, L / 2); g.lineTo(L / 2 + 18, L / 2); g.stroke();
  };
  box.addEventListener('dragstart', (e) => e.preventDefault());
  box.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const p = norm(e); if (p[0] < 0 || p[1] < 0 || p[0] > 1 || p[1] > 1) return;
    const f = fit(im);
    S.drag = Number.isInteger(S.replace) ? -1 : S.pts.findIndex(([x, y]) => Math.hypot((x - p[0]) * f.w, (y - p[1]) * f.h) < 30);
    if (S.drag < 0 && S.pts.length < 4 && S.step === 2) { S.pts.push(p); S.drag = S.pts.length - 1; }
    if (Number.isInteger(S.replace)) { S.pts[S.replace] = p; S.drag = S.replace; S.replace = null; }
    if (S.drag < 0) return;
    try { box.setPointerCapture(e.pointerId); } catch { /* */ }
    showLupe(e, S.pts[S.drag]); draw(box);
  });
  box.addEventListener('pointermove', (e) => {
    if (!S || S.drag < 0) return; e.preventDefault();
    const p = norm(e); S.pts[S.drag] = [Math.min(1, Math.max(0, p[0])), Math.min(1, Math.max(0, p[1]))];
    showLupe(e, S.pts[S.drag]); draw(box);
  });
  const end = () => { if (!S || S.drag < 0) return; S.drag = -1; lupe.style.display = 'none'; render(); };
  box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
}

function onClick(e) {
  const b = e.target.closest('[data-r]'); if (!b || b.disabled || !S) return;
  const c = b.dataset.r;
  if (c === 'cancel') return closeRemoteSetup();
  if (c === 'lens') { send({ type: 'useCam', id: b.dataset.id }, S.code); S.lens = b.dataset.id; S.img = null; setTimeout(() => send({ type: 'previewOn' }, S.code), 1500); return render(); }
  if (c === 'reset') { S.pts = []; return render(); }
  if (c === 'still') { S.still = null; return render(); }
  if (c === 'redo') { S.step = 2; S.pts = []; return render(); }
  if (c === 'back') { S.step = 3; return render(); }
  if (c === 'repoint') { const i = Number(b.dataset.i); S.replace = S.replace === i ? null : i; return render(); }
  if (c === 'next') {
    if (S.step === 3) { send({ type: 'calibrate', pts: S.pts }, S.code); S.test = []; }
    S.step++; return render();
  }
  if (c === 'finish') { S.toast?.('Kamera eingerichtet'); return closeRemoteSetup(); }
}
