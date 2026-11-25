/* Einrichtungs-Assistent auf dem Kamera-Gerät (eigene Ebene außerhalb von #app, damit das Video nicht neu angelegt wird):
   1 Platzierung · 2 Vier Punkte mit Lupe (verschiebbar) · 3 Kontrolle mit Ring-Overlay + Draufsicht · 4 Testdart (überspringbar).
   Kalibrierung in localStorage ('darts.calib'), mit kleinem Referenzbild zum Wiedererkennen. */
import { calibrate, project, CALIB_NAMES } from './homography.js';
import { OVERLAY, RADII, scoreFromBoardMM } from './board-geometry.js';
import { mirrorVideo } from './camera.js';
import { CamDetector } from './detector.js';

const KEY = 'darts.calib';
export const loadCalib = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
const storeCalib = (c) => { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* */ } };

/** Kleines Graustufen-Referenzbild (32×18) zum Vergleich „steht die Kamera noch gleich?“ */
export function thumb(video) {
  const c = document.createElement('canvas'); c.width = 32; c.height = 18;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(video, 0, 0, 32, 18);
  const d = g.getImageData(0, 0, 32, 18).data, out = [];
  for (let i = 0; i < d.length; i += 4) out.push((d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8);
  return out;
}
export const thumbDiff = (a, b) => (a && b && a.length === b.length ? a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / a.length : 999);

/** Wo liegt das Bild im Video-Element (object-fit: contain)? */
export function fitOf(v) {
  const r = v.getBoundingClientRect(), vr = v.videoWidth / v.videoHeight, er = r.width / r.height;
  if (vr > er) { const h = r.width / vr; return { x: 0, y: (r.height - h) / 2, w: r.width, h, r }; }
  const w = r.height * vr; return { x: (r.width - w) / 2, y: 0, w, h: r.height, r };
}

/** Ringe und Segmentlinien über das Video zeichnen (canvas liegt genau über dem Video-Element) */
export function drawOverlay(canvas, video, pts, color = 'rgba(255,214,107,.85)') {
  const f = fitOf(video), dpr = window.devicePixelRatio || 1;
  canvas.width = f.r.width * dpr; canvas.height = f.r.height * dpr;
  const g = canvas.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, f.r.width, f.r.height);
  if (!pts || pts.length < 4) return;
  const vw = video.videoWidth, vh = video.videoHeight;
  const cal = calibrate(pts.map(([x, y]) => [x * vw, y * vh]));
  if (!cal) return;
  const toScr = (mx, my) => { const [px, py] = project(cal.toImage, mx, my); return [f.x + (px / vw) * f.w, f.y + (py / vh) * f.h]; };
  g.strokeStyle = color; g.lineWidth = 1.4;
  for (const R of OVERLAY.rings) { g.beginPath(); for (let i = 0; i <= 96; i++) { const a = (i / 96) * Math.PI * 2, [x, y] = toScr(R * Math.sin(a), -R * Math.cos(a)); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  for (const deg of OVERLAY.spokes) { const a = (deg * Math.PI) / 180, [x0, y0] = toScr(RADII.outer * Math.sin(a), -RADII.outer * Math.cos(a)), [x1, y1] = toScr(RADII.dblOut * Math.sin(a), -RADII.dblOut * Math.cos(a)); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
}

/** Entzerrte Draufsicht (Board von vorn) in ein Canvas zeichnen */
function drawTopView(canvas, video, pts) {
  const vw = video.videoWidth, vh = video.videoHeight, cal = calibrate(pts.map(([x, y]) => [x * vw, y * vh]));
  if (!cal) return;
  const src = document.createElement('canvas'); src.width = vw; src.height = vh;
  const sg = src.getContext('2d', { willReadFrequently: true }); sg.drawImage(video, 0, 0);
  const sd = sg.getImageData(0, 0, vw, vh).data, N = canvas.width, g = canvas.getContext('2d'), out = g.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const [px, py] = project(cal.toImage, ((x / N) - 0.5) * 380, ((y / N) - 0.5) * 380);
    const xi = Math.round(px), yi = Math.round(py), o = (y * N + x) * 4;
    if (xi >= 0 && yi >= 0 && xi < vw && yi < vh) { const i = (yi * vw + xi) * 4; out.data[o] = sd[i]; out.data[o + 1] = sd[i + 1]; out.data[o + 2] = sd[i + 2]; }
    out.data[o + 3] = 255;
  }
  g.putImageData(out, 0, 0);
  g.strokeStyle = 'rgba(255,214,107,.8)'; g.lineWidth = 1;
  for (const R of OVERLAY.rings) { g.beginPath(); g.arc(N / 2, N / 2, (R / 380) * N, 0, Math.PI * 2); g.stroke(); }
}

const SKETCH = `<svg class="cal-sketch" viewBox="0 0 220 120" aria-hidden="true">
  <rect x="2" y="2" width="216" height="116" fill="none" stroke="#3a3229"/>
  <circle cx="70" cy="60" r="40" fill="#1d1913" stroke="#e3ae2b" stroke-width="2"/><circle cx="70" cy="60" r="4" fill="#e5402c"/>
  <rect x="160" y="70" width="14" height="26" rx="2" fill="#0b0a08" stroke="#f3e9d2" stroke-width="1.5"/><circle cx="167" cy="76" r="2" fill="#f3e9d2"/>
  <path d="M160 80 L112 64" stroke="#ffd86b" stroke-dasharray="3 3"/><path d="M118 108 H160" stroke="#a89d87"/><text x="122" y="104" fill="#a89d87" font-size="9">40–80 cm</text>
  <text x="140" y="24" fill="#a89d87" font-size="9">≥ 30 cm vom Rand</text></svg>`;

/**
 * Assistent öffnen. video: laufendes Kamera-Video. → Promise<{ pts } | null>
 */
export function runCalibration(video, { skipPlacement = false } = {}) {
  return new Promise((done) => {
    const el = document.createElement('div');
    el.className = 'calib';
    document.body.appendChild(el);
    let step = skipPlacement ? 2 : 1, pts = [], drag = -1, test = null, ovTimer = null;
    const big = mirrorVideo();
    const close = (res) => { clearInterval(ovTimer); test?.destroy(); el.remove(); done(res); };

    function render() {
      clearInterval(ovTimer);
      if (step === 1) {
        el.innerHTML = `<div class="cal-h"><small>Schritt 1 von 4</small><b>Handy aufstellen</b></div>
          <div class="cal-body"><p class="cal-big">Stell dein Handy seitlich neben das Board (Stuhl, Regal oder Klemmhalter), ca. 40–80 cm entfernt,
          etwa auf Boardhöhe oder leicht darunter, schräg auf das Board gerichtet. Mindestens 30 cm außerhalb des Boardrands,
          damit keine Darts das Handy treffen. Das ganze Board muss im Bild sein.</p>${SKETCH}</div>
          <div class="cal-btns"><button data-c="cancel">Abbrechen</button><button class="go" data-c="next">Weiter</button></div>`;
        return;
      }
      if (step === 2) {
        el.innerHTML = `<div class="cal-h"><small>Schritt 2 von 4</small><b>${pts.length < 4 ? `Tippe auf Punkt ${pts.length + 1}: ${CALIB_NAMES[pts.length]}` : 'Alle 4 Punkte gesetzt'}</b>
          <span>Äußerer Rand des Doppelrings, jeweils in der Mitte des Feldes. Punkte lassen sich verschieben.</span></div>
          <div class="cal-v"><canvas class="cal-ov"></canvas><canvas class="cal-lupe"></canvas></div>
          <div class="cal-btns"><button data-c="reset">Zurücksetzen</button><button data-c="cancel">Abbrechen</button><button class="go" data-c="next" ${pts.length < 4 ? 'disabled' : ''}>Weiter</button></div>`;
        el.querySelector('.cal-v').prepend(big);
        bindPoints();
        drawPoints();
        return;
      }
      if (step === 3) {
        el.innerHTML = `<div class="cal-h"><small>Schritt 3 von 4</small><b>Passt das Gitter?</b><span>Ringe und Linien sollten genau auf den Drähten liegen.</span></div>
          <div class="cal-v"><canvas class="cal-ov"></canvas><canvas class="cal-top" width="180" height="180"></canvas></div>
          <div class="cal-btns"><button data-c="redo">Neu kalibrieren</button><button class="go" data-c="next">Passt</button></div>`;
        el.querySelector('.cal-v').prepend(big);
        const ov = el.querySelector('.cal-ov'), top = el.querySelector('.cal-top');
        const draw = () => drawOverlay(ov, big, pts);
        draw(); drawTopView(top, big, pts);
        ovTimer = setInterval(draw, 700);
        return;
      }
      el.innerHTML = `<div class="cal-h"><small>Schritt 4 von 4</small><b>Wirf einen Testdart</b><span>Optional – zeigt, was die Kamera erkennt.</span></div>
        <div class="cal-test"><b class="cal-res">Warte auf Wurf …</b></div>
        <div class="cal-btns"><button data-c="finish">Überspringen</button><button class="go" data-c="finish">Fertig</button></div>`;
      test?.destroy();
      test = new CamDetector(video, pts, (e) => { if (e.event === 'dart') el.querySelector('.cal-res').textContent = `Erkannt: ${e.score.label} (${Math.round(e.confidence * 100)} % sicher)`; });
      test.start();
    }

    function bindPoints() {
      const box = el.querySelector('.cal-v'), lupe = el.querySelector('.cal-lupe');
      const norm = (e) => { const f = fitOf(big); return [(e.clientX - f.r.left - f.x) / f.w, (e.clientY - f.r.top - f.y) / f.h]; };
      const showLupe = (e, p) => {
        const f = fitOf(big), L = 130, zoom = 3, vw = big.videoWidth, vh = big.videoHeight, sw = (L / zoom) * (vw / f.w), sh = (L / zoom) * (vh / f.h);
        lupe.width = L; lupe.height = L; lupe.style.display = 'block';
        lupe.style.left = `${e.clientX - f.r.left - L / 2}px`; lupe.style.top = `${e.clientY - f.r.top - L - 40}px`;
        const g = lupe.getContext('2d');
        g.drawImage(big, p[0] * vw - sw / 2, p[1] * vh - sh / 2, sw, sh, 0, 0, L, L);
        g.strokeStyle = '#ffd23f'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(L / 2, L / 2 - 14); g.lineTo(L / 2, L / 2 + 14); g.moveTo(L / 2 - 14, L / 2); g.lineTo(L / 2 + 14, L / 2); g.stroke();
      };
      box.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.cal-lupe')) return;
        const p = norm(e); if (p[0] < 0 || p[1] < 0 || p[0] > 1 || p[1] > 1) return;
        const f = fitOf(big);
        drag = pts.findIndex(([x, y]) => Math.hypot((x - p[0]) * f.w, (y - p[1]) * f.h) < 28);
        if (drag < 0 && pts.length < 4) { pts.push(p); drag = pts.length - 1; }
        box.setPointerCapture(e.pointerId); showLupe(e, pts[drag] || p); drawPoints();
      });
      box.addEventListener('pointermove', (e) => { if (drag < 0) return; const p = norm(e); pts[drag] = [Math.min(1, Math.max(0, p[0])), Math.min(1, Math.max(0, p[1]))]; showLupe(e, pts[drag]); drawPoints(); });
      const end = () => { if (drag < 0) return; drag = -1; lupe.style.display = 'none'; render(); };
      box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
    }
    function drawPoints() {
      const ov = el.querySelector('.cal-ov'); if (!ov) return;
      drawOverlay(ov, big, pts.length === 4 ? pts : null);
      const f = fitOf(big), g = ov.getContext('2d');
      pts.forEach(([x, y], i) => {
        const sx = f.x + x * f.w, sy = f.y + y * f.h;
        g.strokeStyle = '#ffd23f'; g.fillStyle = 'rgba(255,210,63,.25)'; g.lineWidth = 2;
        g.beginPath(); g.arc(sx, sy, 11, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = '#f3e9d2'; g.font = '13px sans-serif'; g.textAlign = 'center'; g.fillText(String(i + 1), sx, sy - 16);
      });
    }

    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-c]'); if (!b || b.disabled) return;
      const c = b.dataset.c;
      if (c === 'cancel') return close(null);
      if (c === 'reset' || c === 'redo') { pts = []; step = 2; return render(); }
      if (c === 'next') { step++; return render(); }
      if (c === 'finish') {
        const cal = { pts, vw: video.videoWidth, vh: video.videoHeight, thumb: thumb(video), at: Date.now() };
        storeCalib(cal); return close(cal);
      }
    });
    big.addEventListener('loadedmetadata', () => { if (step === 2) drawPoints(); });
    render();
  });
}

/** Erkannte Würfe als Punkt anzeigen (für Tests/Debug) */
export const labelAt = (x, y) => scoreFromBoardMM(x, y).label;
