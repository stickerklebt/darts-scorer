/* Kamera einrichten an der REGIE (gleiches Konto). Das Handy steht schon und wird nicht mehr angefasst:
   Livebild kommt als JPEG über camera-link (frame), hier wird geholfen, getippt und geprüft; die 4 Punkte gehen ans Handy (calibrate).
   1 Aufstellen (Livebild, Objektiv) · 2 Vier Punkte auf scharfem Standbild (Lupe, verschiebbar, Gitter erscheint)
   3 Gitter im Livebild prüfen und nachziehen · 4 Testdart: Livebild mit Markierung, Treffer ploppen rechts auf. */
import { project, homographyN, homographyRobust, inv3, residual, CALIB_TARGETS } from '../homography.js';
import { OVERLAY, RADII } from '../board-geometry.js';
import { refineCalibration } from '../calib-refine.js';
import { send } from '../camera-link.js';

let S = null;
const FIELDS = ['D20', 'D6', 'D3', 'D11'];

export const setupOpen = () => !!S;

export function openRemoteSetup({ code, n = 1, toast, onDone }) {
  closeRemoteSetup(true);
  S = { code, n, step: 1, el: document.createElement('div'), img: null, still: null, pts: [], extra: [], auto: [], rms: null, drag: -1, dragE: -1, test: [], onDone, toast, lenses: [], lens: null };
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
    const seg = segOf(m);
    S.test.unshift({ txt, x: m.boardX, y: m.boardY, sure: (m.confidence ?? 1) >= 0.7, conf: m.confidence ?? 1, label: m.label === 'MISS' ? '0' : m.label, seg, at: Date.now() });
    S.test = S.test.slice(0, 6);
    render(); return true;
  }
  return false;
}

/** Ring und Winkel des getroffenen Feldes (für die Hervorhebung) */
function segOf(m) {
  if (!m.segment) return null;
  if (m.segment === 25) return m.multiplier === 2 ? { r0: 0, r1: 6.35, a0: 0, a1: 360 } : { r0: 6.35, r1: 15.9, a0: 0, a1: 360 };
  const i = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5].indexOf(m.segment);
  const [r0, r1] = m.multiplier === 3 ? [99, 107] : m.multiplier === 2 ? [162, 170] : Math.hypot(m.boardX, m.boardY) < 99 ? [15.9, 99] : [107, 162];
  return { r0, r1, a0: i * 18 - 9, a1: i * 18 + 9 };
}

const SKETCH = `<svg class="cal-sketch" viewBox="0 0 220 120" aria-hidden="true">
  <rect x="2" y="2" width="216" height="116" fill="none" stroke="#303036"/>
  <circle cx="70" cy="60" r="40" fill="#1d1913" stroke="#cfd3d9" stroke-width="2"/><circle cx="70" cy="60" r="4" fill="#e5402c"/>
  <rect x="160" y="70" width="14" height="26" rx="2" fill="#08080a" stroke="#eef0f3" stroke-width="1.5"/><circle cx="167" cy="76" r="2" fill="#eef0f3"/>
  <path d="M160 80 L112 64" stroke="#ffd86b" stroke-dasharray="3 3"/><path d="M118 108 H160" stroke="#9a9ea6"/><text x="122" y="104" fill="#9a9ea6" font-size="9">40–80 cm</text>
  <text x="140" y="24" fill="#9a9ea6" font-size="9">≥ 30 cm vom Rand</text></svg>`;

/* ---------- Kalibrierung aus allen Punkten: 4 getippte, Zusatzpunkte (auf Linien gesetzt) und automatisch gefundene Kanten ---------- */
const K = 1000; // Bildpunkte normiert (0–1) × 1000
function corr() {
  const src = S.pts.map(([x, y]) => [x * K, y * K]), dst = CALIB_TARGETS.slice(0, S.pts.length);
  for (const e of [...S.extra, ...S.auto]) { src.push([e.img[0] * K, e.img[1] * K]); dst.push(e.board); }
  return { src, dst };
}
function cal() {
  if (S.pts.length < 4) return null;
  const { src, dst } = corr();
  const toBoard = S.auto.length ? homographyRobust(src, dst, 1.5) : homographyN(src, dst);
  const toImage = toBoard && inv3(toBoard);
  return toBoard && toImage ? { toBoard, toImage } : null;
}
/** Restfehler in mm (nur aussagekräftig mit mehr als 4 Punkten) */
function rmsMm() {
  if (S.auto.length) return S.rms;
  if (!S.extra.length) return null;
  const c = cal(); if (!c) return null; const { src, dst } = corr(); return residual(c.toBoard, src, dst);
}
const fmtMm = (v) => `${v.toFixed(1).replace('.', ',')} mm`;
function qualityLine() {
  const r = rmsMm(); if (r === null || r === undefined) return '';
  return r <= 1.5 ? `<p class="rs-q ok">Kalibrierung: ±${fmtMm(r)} ✓</p>` : `<p class="rs-q bad">Kalibrierung ungenau (±${fmtMm(r)}) – bitte Punkte prüfen</p>`;
}
/** Automatisch verfeinern: Ring- und Drahtkanten im scharfen Standbild suchen (1–2 s) */
async function autoRefine() {
  const im = S.el.querySelector('[data-stage="still"] .rs-img');
  if (!im?.naturalWidth || S.pts.length < 4) return;
  S.busy = true; render();
  await new Promise((r) => setTimeout(r, 30));
  try {
    const W = im.naturalWidth, Hh = im.naturalHeight, c = document.createElement('canvas'); c.width = W; c.height = Hh;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
    const px = g.getImageData(0, 0, W, Hh).data;
    const taps = [...S.pts.map(([x, y]) => [x * W, y * Hh]), ...S.extra.map((e) => [e.img[0] * W, e.img[1] * Hh])];
    const boards = [...CALIB_TARGETS, ...S.extra.map((e) => e.board)];
    const res = refineCalibration(px, W, Hh, taps, boards, { fit: (a, b) => homographyRobust(a, b, 1.5), inv: inv3 });
    if (res.n >= 20) { S.auto = res.edges.map((e) => ({ img: [e.img[0] / W, e.img[1] / Hh], board: e.board })); S.rms = res.rms; }
    else S.toast?.('Zu wenige Kanten gefunden – Licht verbessern oder Punkte genauer setzen');
  } catch { S.toast?.('Verfeinern hat nicht geklappt'); }
  S.busy = false; render();
}

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
        ${/ultra|0[,.]5|weitwinkel/i.test(S.lenses.find((l) => l.id === S.lens)?.label || '') ? '<p class="rs-q bad">Ultraweitwinkel verzerrt am Rand – die Hauptkamera ist genauer.</p>' : ''}
        ${S.lenses.length > 1 ? `<div class="cc-lens"><small>Objektiv am Handy:</small>${S.lenses.map((l) => `<button class="${l.id === S.lens ? 'on' : ''}" data-r="lens" data-id="${l.id}">${l.label}</button>`).join('')}</div>` : ''}${SKETCH}</div></div>
      <div class="cal-btns"><button data-r="cancel">Abbrechen</button><button class="go" data-r="next">Steht – weiter</button></div>`;
  } else if (S.step === 2) {
    const k = S.pts.length, re = Number.isInteger(S.replace) ? S.replace : null;
    const title = re !== null ? `Tippe auf die genaue Mitte der ${FIELDS[re]}` : k < 4 ? `Tippe auf die genaue Mitte der ${FIELDS[k]}` : 'Brauchst du weitere Punkte?';
    const sub = k < 4 || re !== null ? 'Gedrückt halten zum Zielen – die Lupe zeigt dir die Stelle.'
      : 'Liegt eine goldene Linie nicht genau auf dem Draht? Tippe auf die Linie – es entsteht ein neuer Punkt. Zieh ihn auf den Draht.';
    const side = k === 4 ? `<div class="rs-side">
        <button class="${S.busy ? 'on' : ''}" data-r="auto" ${S.busy ? 'disabled' : ''}>${S.busy ? 'Rechne …' : 'Automatisch verfeinern'}</button>
        <small>Sucht die farbigen Ringe und die Drähte im Bild und richtet das Gitter genau aus.</small>
        ${qualityLine()}
        ${S.extra.length || S.auto.length ? `<button data-r="clearx">Zusatzpunkte löschen (${S.extra.length + (S.auto.length ? 1 : 0)})</button>` : ''}
        <b>Punkt neu setzen</b>${FIELDS.map((f, i) => `<button class="${re === i ? 'on' : ''}" data-r="repoint" data-i="${i}">${f}</button>`).join('')}</div>` : '';
    S.el.innerHTML = `${h(2, title, sub)}
      <div class="rs-two ${k === 4 ? 'side' : 'one'}">${stage('still', S.still?.img)}${side}</div>
      <div class="cal-btns"><button data-r="reset">Alle Punkte löschen</button><button data-r="still">Neues Bild</button><button data-r="cancel">Abbrechen</button><button class="go" data-r="next" ${k === 4 && !S.busy ? '' : 'disabled'}>Weiter</button></div>`;
    if (!S.still) send({ type: 'still' }, S.code);
  } else if (S.step === 3) {
    S.el.innerHTML = `${h(3, 'OK? Liegen alle Linien auf dem Board?', 'Das Bild ist live. Wenn eine Linie danebenliegt: darauf tippen und den neuen Punkt auf den Draht ziehen.')}
      <div class="rs-two side">${stage('live', S.img?.img)}<div class="rs-side">${qualityLine()}
        <button class="yes" data-r="next">Ja – los geht's</button><button data-r="fix">Nein – nachbessern</button></div></div>
      <div class="cal-btns"><button data-r="cancel">Abbrechen</button></div>`;
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
  const C = cal();
  const toScr = (mx, my) => { const [px, py] = project(C.toImage, mx, my); return [f.x + (px / K) * f.w, f.y + (py / K) * f.h]; };
  if (C) {
    g.strokeStyle = 'rgba(255,214,107,.95)'; g.lineWidth = 1.5;
    for (const R of OVERLAY.rings) { g.beginPath(); for (let i = 0; i <= 120; i++) { const a = (i / 120) * Math.PI * 2, [x, y] = toScr(R * Math.sin(a), -R * Math.cos(a)); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
    for (const deg of OVERLAY.spokes) { const a = (deg * Math.PI) / 180, [x0, y0] = toScr(RADII.outer * Math.sin(a), -RADII.outer * Math.cos(a)), [x1, y1] = toScr(RADII.dblOut * Math.sin(a), -RADII.dblOut * Math.cos(a)); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
    if (S.step === 4) S.test.forEach((t, i) => {
      if (!Number.isFinite(t.x)) return;
      const col = t.conf >= 0.85 ? '#4fd16a' : t.conf >= 0.6 ? '#eef1f6' : '#ff4d3a', [x, y] = toScr(t.x, t.y);
      if (i === 0 && t.seg) { // getroffenes Feld halbtransparent
        const { r0, r1, a0, a1 } = t.seg; g.fillStyle = 'rgba(255,214,107,.22)'; g.beginPath();
        for (let k = 0; k <= 12; k++) { const a = ((a0 + (a1 - a0) * k / 12) * Math.PI) / 180, [px, py] = toScr(r1 * Math.sin(a), -r1 * Math.cos(a)); k ? g.lineTo(px, py) : g.moveTo(px, py); }
        for (let k = 12; k >= 0; k--) { const a = ((a0 + (a1 - a0) * k / 12) * Math.PI) / 180, [px, py] = toScr(r0 * Math.sin(a), -r0 * Math.cos(a)); g.lineTo(px, py); }
        g.fill();
      }
      g.globalAlpha = i === 0 ? 1 : 0.55; g.strokeStyle = col; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x - 14, y); g.lineTo(x - 3, y); g.moveTo(x + 3, y); g.lineTo(x + 14, y); g.moveTo(x, y - 14); g.lineTo(x, y - 3); g.moveTo(x, y + 3); g.lineTo(x, y + 14); g.stroke();
      g.fillStyle = col; g.beginPath(); g.arc(x, y, 2, 0, Math.PI * 2); g.fill();
      g.font = '12px sans-serif'; g.textAlign = 'left'; g.fillStyle = '#fff6dc'; g.fillText(`${['I', 'II', 'III', 'IV', 'V', 'VI'][i] || i + 1} · ${t.label}`, x + 9, y - 9);
      g.globalAlpha = 1;
    });
  }
  if (S.step === 2 || S.step === 3) S.extra.forEach((e) => { // Zusatzpunkte als kleine Rauten
    const sx = f.x + e.img[0] * f.w, sy = f.y + e.img[1] * f.h;
    g.strokeStyle = '#7fd6ff'; g.fillStyle = 'rgba(127,214,255,.25)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(sx, sy - 9); g.lineTo(sx + 9, sy); g.lineTo(sx, sy + 9); g.lineTo(sx - 9, sy); g.closePath(); g.fill(); g.stroke();
  });
  if (S.step === 2 || S.step === 3) S.pts.forEach(([x, y], i) => {
    const sx = f.x + x * f.w, sy = f.y + y * f.h;
    g.strokeStyle = '#eef1f6'; g.fillStyle = 'rgba(255,210,63,.3)'; g.lineWidth = 2.5;
    g.beginPath(); g.arc(sx, sy, 13, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(sx - 6, sy); g.lineTo(sx + 6, sy); g.moveTo(sx, sy - 6); g.lineTo(sx, sy + 6); g.stroke();
    g.fillStyle = '#eef0f3'; g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.fillText(FIELDS[i], sx, sy - 19);
  });
}

/** Punkte setzen/ziehen mit Lupe. Kein natives Bild-Ziehen (sonst schiebt der Mac eine verkleinerte Kopie mit). */
/** Tipp nahe einer goldenen Linie → genau dieser Board-Punkt (Ring oder Draht) wird ein neuer Zusatzpunkt */
function onLine(p) {
  const C = cal(); if (!C) return null;
  const [bx, by] = project(C.toBoard, p[0] * K, p[1] * K), r = Math.hypot(bx, by), ang = Math.atan2(bx, -by);
  let best = null;
  for (const R of OVERLAY.rings) { const d = Math.abs(r - R); if (!best || d < best.d) best = { d, pt: [R * Math.sin(ang), -R * Math.cos(ang)] }; }
  if (r > RADII.outer && r < RADII.dblOut + 4) for (const deg of OVERLAY.spokes) {
    const a = (deg * Math.PI) / 180, da = Math.atan2(Math.sin(ang - a), Math.cos(ang - a)), d = Math.abs(r * Math.sin(da));
    if (Math.abs(da) < Math.PI / 2 && d < (best?.d ?? Infinity)) best = { d, pt: [r * Math.cos(da) * Math.sin(a), -r * Math.cos(da) * Math.cos(a)] };
  }
  return best && best.d <= 7 ? best.pt : null;
}

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
    g.strokeStyle = '#eef1f6'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(L / 2, L / 2 - 18); g.lineTo(L / 2, L / 2 + 18); g.moveTo(L / 2 - 18, L / 2); g.lineTo(L / 2 + 18, L / 2); g.stroke();
  };
  box.addEventListener('dragstart', (e) => e.preventDefault());
  box.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const p = norm(e); if (p[0] < 0 || p[1] < 0 || p[0] > 1 || p[1] > 1) return;
    const f = fit(im), near = (q) => Math.hypot((q[0] - p[0]) * f.w, (q[1] - p[1]) * f.h) < 26;
    S.drag = -1; S.dragE = -1;
    if (Number.isInteger(S.replace)) { S.pts[S.replace] = p; S.drag = S.replace; S.replace = null; }
    else if ((S.drag = S.pts.findIndex(near)) >= 0) { /* Grundpunkt ziehen */ }
    else if ((S.dragE = S.extra.findIndex((x) => near(x.img))) >= 0) { /* Zusatzpunkt ziehen */ }
    else if (S.pts.length < 4 && S.step === 2) { S.pts.push(p); S.drag = S.pts.length - 1; }
    else if (S.pts.length === 4) { const x = onLine(p); if (x) { S.extra.push({ img: p, board: x }); S.dragE = S.extra.length - 1; } }
    if (S.drag < 0 && S.dragE < 0) return;
    try { box.setPointerCapture(e.pointerId); } catch { /* */ }
    showLupe(e, S.drag >= 0 ? S.pts[S.drag] : S.extra[S.dragE].img); draw(box);
  });
  box.addEventListener('pointermove', (e) => {
    if (!S || (S.drag < 0 && S.dragE < 0)) return; e.preventDefault();
    const p = norm(e), q = [Math.min(1, Math.max(0, p[0])), Math.min(1, Math.max(0, p[1]))];
    if (S.drag >= 0) S.pts[S.drag] = q; else S.extra[S.dragE].img = q;
    showLupe(e, q); draw(box);
  });
  const end = () => { if (!S || (S.drag < 0 && S.dragE < 0)) return; S.drag = -1; S.dragE = -1; lupe.style.display = 'none'; render(); };
  box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
}

function onClick(e) {
  const b = e.target.closest('[data-r]'); if (!b || b.disabled || !S) return;
  const c = b.dataset.r;
  if (c === 'cancel') return closeRemoteSetup();
  if (c === 'lens') { send({ type: 'useCam', id: b.dataset.id }, S.code); S.lens = b.dataset.id; S.img = null; setTimeout(() => send({ type: 'previewOn' }, S.code), 1500); return render(); }
  if (c === 'reset') { S.pts = []; S.extra = []; S.auto = []; S.rms = null; return render(); }
  if (c === 'still') { S.still = null; S.auto = []; S.rms = null; return render(); }
  if (c === 'redo') { S.step = 2; S.pts = []; S.extra = []; S.auto = []; S.rms = null; return render(); }
  if (c === 'back') { S.step = 3; return render(); }
  if (c === 'repoint') { const i = Number(b.dataset.i); S.replace = S.replace === i ? null : i; return render(); }
  if (c === 'auto') return autoRefine();
  if (c === 'clearx') { S.extra = []; S.auto = []; S.rms = null; return render(); }
  if (c === 'fix') { S.step = 2; return render(); }
  if (c === 'next') {
    if (S.step === 2 && !S.auto.length) { autoRefine().then(() => { if (S) { S.step = 3; render(); } }); return; } // nach den 4 Punkten automatisch verfeinern
    if (S.step === 3) { send({ type: 'calibrate', pts: S.pts, extra: [...S.extra, ...S.auto] }, S.code); S.test = []; }
    S.step++; return render();
  }
  if (c === 'finish') { S.toast?.('Kamera eingerichtet'); return closeRemoteSetup(); }
}
