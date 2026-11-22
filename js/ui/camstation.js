/* Kamera-Station (eigene Ebene außerhalb von #app):
   · mode 'cam'    – Kamera-Gerät: Livebild mit Overlay, großer Status, Spielername, Code zum Verbinden, Neu kalibrieren, Pause, Debug.
                     Würfe gehen per camera-link.js an das Steuer-Gerät.
   · mode 'single' – Ein-Geräte-Modus: kleines Vorschaufenster neben dem Scoreboard, Würfe gehen direkt ins lokale Spiel.
   Fällt Kamera/Worker aus, kommt eine Meldung – das Spiel läuft mit manueller Eingabe weiter. */
import { startCamera, stopCamera, listCameras, cameraStream } from '../camera.js';
import { runCalibration, loadCalib, thumb, thumbDiff, drawOverlay } from '../calibration.js';
import { CamDetector } from '../detector.js';
import { link, openAsCamera, send, disconnect } from '../camera-link.js';

let st = null; // { mode, video, det, el, calib, paused, status, player, overlay, debug, hooks }

export const stationActive = () => !!st;
/** Kann gerade per Kamera gespielt werden? Steuer-Gerät: verbunden + kalibriert. Ein-Gerät: kalibriert. */
export function camReady() {
  if (link.role === 'ctl') { const connected = link.status === 'connected'; return { connected, calibrated: link.calibrated, ready: connected && link.calibrated && !link.moved }; }
  if (st?.mode === 'single') return { connected: true, calibrated: !!st.calib, ready: !!st.calib && !link.moved };
  return { connected: false, calibrated: false, ready: false };
}
export const stationMode = () => st?.mode || null;

/** Station öffnen. hooks: { toast, onThrow(msg), onTakeout(), onMoved(), onCalibrated(ok), onClose(), debug } */
export async function openStation(mode, hooks) {
  if (st) closeStation(true);
  let video;
  try { video = await startCamera(); }
  catch (e) { hooks.toast?.(e.message); return false; }
  st = { mode, video, det: null, el: null, calib: null, paused: false, status: 'Kamera an', player: '', overlay: true, debug: !!hooks.debug, hooks, cams: [] };
  build();
  st.cams = (await listCameras()).filter((c) => !/front|vorder|user/i.test(c.label));
  if (mode === 'cam') { try { await openAsCamera(); } catch (e) { hooks.toast?.(e.message || 'Server nicht erreichbar – erneuter Versuch läuft'); } }
  paint();
  const prev = loadCalib();
  // Kamera-Gerät: eingerichtet wird am anderen Gerät (dieses Handy steht dann schon und wird nicht mehr angefasst).
  // Gleiches Bild wie beim letzten Mal → alte Kalibrierung gleich nutzen.
  if (mode === 'cam') {
    if (prev?.pts?.length === 4 && thumbDiff(prev.thumb, thumb(video)) < 22) useCalib(prev);
    else setStatus('Kamera läuft – jetzt am anderen Gerät einrichten');
    return true;
  }
  // Letzte Kalibrierung nur anbieten, wenn das Bild noch ähnlich aussieht
  if (prev?.pts?.length === 4 && thumbDiff(prev.thumb, thumb(video)) < 22) {
    if (window.confirm('Letzte Kalibrierung verwenden? Das Bild sieht noch gleich aus.')) { useCalib(prev); return true; }
  }
  await calibrateNow();
  return true;
}

export function closeStation(silent = false) {
  if (!st) return;
  st.det?.destroy(); stopCamera(); st.el?.remove();
  const h = st.hooks; const mode = st.mode; st = null;
  if (mode === 'cam') disconnect();
  if (!silent) h.onClose?.();
}

/** Vom Steuer-Gerät bzw. lokal: wer ist dran, Darts gezogen, Korrektur */
export function stationMessage(m) {
  if (!st) return;
  if (m.type === 'turnChanged') { st.player = m.bot ? `${m.name} (Bot)` : m.name || ''; if (m.bot) st.status = 'Bot wirft – Kamera wartet'; paint(); }
  else if (m.type === 'takeout') { st.det?.takeout(); setStatus('Bereit'); }
  else if (m.type === 'throwCorrected') setStatus(`Korrigiert: ${m.label}`);
  else if (m.type === 'hello') send({ type: 'calibrationStatus', ok: !!st.calib });
  // Einrichtung vom anderen Gerät
  else if (m.type === 'previewOn') { st.previewUntil = Date.now() + 3 * 60e3; previewLoop(); }
  else if (m.type === 'previewOff') st.previewUntil = 0;
  else if (m.type === 'still') sendFrame(1280, 0.72, true);
  else if (m.type === 'calibrate' && Array.isArray(m.pts) && m.pts.length === 4) {
    const cal = { pts: m.pts, vw: st.video.videoWidth, vh: st.video.videoHeight, thumb: thumb(st.video), at: Date.now() };
    try { localStorage.setItem('darts.calib', JSON.stringify(cal)); } catch { /* */ }
    st.det?.destroy(); st.det = null; useCalib(cal);
  } else if (m.type === 'recalibrate') { st.det?.destroy(); st.det = null; st.calib = null; send({ type: 'calibrationStatus', ok: false }); setStatus('Wird am anderen Gerät eingerichtet …'); }
}

/** Livebild ans andere Gerät (kleines JPEG, ~1 pro Sekunde, solange es angefordert ist) */
let pvTimer = null;
function previewLoop() {
  clearTimeout(pvTimer);
  if (!st || !st.previewUntil || Date.now() > st.previewUntil) return;
  sendFrame(640, 0.55, false);
  pvTimer = setTimeout(previewLoop, 900);
}
/** Bild als JPEG schicken – so lange kleiner machen (erst Qualität, dann Auflösung), bis es sicher durch den Server passt */
const FRAME_MAX = 280 * 1024;
function sendFrame(maxW, q, still) {
  const v = st?.video; if (!v?.videoWidth) return;
  let w = Math.min(maxW, v.videoWidth), img = null, h = 0;
  for (let tries = 0; tries < 8; tries++) {
    h = Math.round((w * v.videoHeight) / v.videoWidth);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(v, 0, 0, w, h);
    try { img = c.toDataURL('image/jpeg', q); } catch { return; }
    if (img.length <= FRAME_MAX) break;
    if (q > 0.45) q -= 0.12; else w = Math.round(w * 0.8);
  }
  if (!img || img.length > FRAME_MAX) return;
  send({ type: 'frame', still, img, w, h, calibrated: !!st.calib });
}
export function stationTakeout() { st?.det?.takeout(); setStatus('Bereit'); }
export function stationDebug(on) { if (st) { st.debug = on; st.det?.setDebug(on); paint(); } }

async function calibrateNow() {
  if (!st) return;
  st.det?.destroy(); st.det = null;
  if (st.mode === 'cam') send({ type: 'calibrationStatus', ok: false });
  st.el.style.display = 'none';
  const cal = await runCalibration(st.video, { skipPlacement: !!st.calib });
  if (!st) return;
  st.el.style.display = '';
  if (cal) useCalib(cal);
  else if (st.calib) useCalib(st.calib);
  else { setStatus('Nicht kalibriert'); st.hooks.onCalibrated?.(false); }
}

function useCalib(cal) {
  st.calib = cal;
  try {
    st.det = new CamDetector(st.video, cal.pts, onEvent);
    st.det.setDebug(st.debug);
    st.det.start();
  } catch { st.hooks.toast?.('Erkennung konnte nicht starten – bitte manuell eingeben'); }
  setStatus('Bereit');
  if (st.mode === 'cam') send({ type: 'calibrationStatus', ok: true });
  st.hooks.onCalibrated?.(true);
}

let n = 0;
function onEvent(e) {
  if (!st) return;
  if (st.debug && e.mask) drawDebug(e);
  if (e.event === 'dart') {
    const msg = { type: 'throw', id: `t${Date.now().toString(36)}${n++}`, dartIndex: e.dartIndex, label: e.score.label, segment: e.score.segment,
      multiplier: e.score.multiplier, points: e.score.points, boardX: Math.round(e.boardX * 10) / 10, boardY: Math.round(e.boardY * 10) / 10,
      confidence: e.confidence, snapshot: e.snapshot };
    setStatus(e.dartIndex >= 3 ? `Dart erkannt: ${msg.label} – Darts ziehen` : `Dart erkannt: ${msg.label}`);
    if (st.mode === 'cam') send(msg); else st.hooks.onThrow?.(msg);
  } else if (e.event === 'takeout') { setStatus('Bereit'); if (st.mode === 'cam') send({ type: 'takeout' }); else st.hooks.onTakeout?.(); }
  else if (e.event === 'moved') {
    setStatus('Kamera verrutscht – bitte neu kalibrieren', true);
    if (st.mode === 'cam') send({ type: 'cameraMoved' }); else st.hooks.onMoved?.();
  } else if (e.state === 'motion' && !/erkannt|verrutscht/i.test(st.status)) setStatus('Bewegung …');
  else if (e.state === 'ready' && st.status === 'Bewegung …') setStatus('Bereit');
}

function setStatus(t, alarm = false) {
  if (!st) return;
  st.status = t; st.alarm = alarm;
  const s = st.el?.querySelector('.cs-st'); if (s) { s.textContent = t; s.classList.toggle('alarm', alarm); }
}

/* ---------- Oberfläche ---------- */
function build() {
  st.el = document.createElement('div');
  st.el.className = st.mode === 'cam' ? 'camstation' : 'campanel';
  document.body.appendChild(st.el);
  st.el.addEventListener('click', onClick);
  st.el.addEventListener('change', async (e) => {
    if (e.target.matches('.cs-cam') && e.target.value) {
      try { const v = await startCamera(e.target.value); st.det?.destroy(); st.video = v; paint(); await calibrateNow(); } catch (err) { st.hooks.toast?.(err.message); }
    }
  });
}

function paint() {
  if (!st) return;
  const camSel = st.cams.length > 1 ? `<select class="cs-cam">${['<option value="">Kamera wählen …</option>', ...st.cams.map((c, i) => `<option value="${c.deviceId}">${c.label || `Kamera ${i + 1}`}</option>`)].join('')}</select>` : '';
  if (st.mode === 'single') {
    st.el.innerHTML = `<div class="cs-vid"><canvas class="cs-ov"></canvas></div><div class="cs-st">${st.status}</div>
      <div class="cs-b"><button data-cs="calib">Kalibrieren</button><button data-cs="pause">${st.paused ? 'Weiter' : 'Pause'}</button><button data-cs="off">Aus</button></div>${camSel}
      <small class="cs-beta">Nur Vorschlag – korrigierbar</small>`;
  } else {
    const dot = link.status === 'connected' ? 'ok' : link.status === 'lost' ? 'bad' : 'wait';
    st.el.innerHTML = `<div class="cs-top"><span class="cs-link ${dot}">● ${link.status === 'connected' ? 'Steuer-Gerät verbunden' : link.status === 'lost' ? 'Getrennt – verbinde neu …' : 'Warte auf Steuer-Gerät …'}</span>
        <span class="cs-code"><small>Code</small><b>${link.code ? link.code.replace(/(\d{3})(\d{3})/, '$1 $2') : '……'}</b></span></div>
      <div class="cs-vid"><canvas class="cs-ov"></canvas><canvas class="cs-dbg"></canvas></div>
      <div class="cs-info"><b class="cs-st ${st.alarm ? 'alarm' : ''}">${st.status}</b><span class="cs-pl">${st.player ? `Dran: ${st.player}` : ''}</span></div>
      <div class="cs-b">
        <button data-cs="calib">Neu kalibrieren</button><button data-cs="pause">${st.paused ? 'Weiter' : 'Pause'}</button>
        <button data-cs="overlay">Overlay ${st.overlay ? 'aus' : 'an'}</button><button data-cs="share">Link teilen</button><button data-cs="off">Beenden</button></div>
      ${camSel}
      <p class="cs-hint">Jetzt am anderen Gerät mit demselben Konto anmelden – auf dem Startbildschirm erscheint die Kamera mit allen Hilfen.
        Anderes Konto: dort „Kamera-Gerät verbinden“ und diesen Code eingeben.</p>`;
  }
  st.el.querySelector('.cs-vid').prepend(st.video);
  const ov = st.el.querySelector('.cs-ov');
  if (ov && st.calib && st.overlay) requestAnimationFrame(() => drawOverlay(ov, st.video, st.calib.pts));
}

async function onClick(e) {
  const b = e.target.closest('[data-cs]'); if (!b || !st) return;
  const c = b.dataset.cs;
  if (c === 'off') return closeStation();
  if (c === 'calib') return calibrateNow();
  if (c === 'pause') { st.paused = !st.paused; if (st.paused) { st.det?.stop(); setStatus('Pausiert'); } else { st.det?.resume(); st.det?.start(); setStatus('Bereit'); } return paint(); }
  if (c === 'overlay') { st.overlay = !st.overlay; return paint(); }
  if (c === 'share') {
    const url = `${location.origin}${location.pathname}?join=${link.code}`;
    try { if (navigator.share) await navigator.share({ title: 'Darts – Kamera verbinden', text: `Code ${link.code}`, url }); else { await navigator.clipboard.writeText(url); st.hooks.toast?.('Link kopiert'); } } catch { /* abgebrochen */ }
  }
}

/** Debug: Differenzbild, Achse und Spitze über das Livebild legen */
function drawDebug(e) {
  const c = st.el?.querySelector('.cs-dbg'); if (!c || !st.det) return;
  const { w, h } = st.det; c.width = w; c.height = h;
  const g = c.getContext('2d'), img = g.createImageData(w, h), m = new Uint8Array(e.mask);
  for (let i = 0; i < m.length; i++) if (m[i]) { img.data[i * 4] = 255; img.data[i * 4 + 1] = 60; img.data[i * 4 + 2] = 40; img.data[i * 4 + 3] = 170; }
  g.putImageData(img, 0, 0);
  if (e.axis && e.tip) {
    const [cx, cy] = e.axis.center, [ux, uy] = e.axis.dir, L = e.axis.length / 2;
    g.strokeStyle = '#2f6fe4'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - ux * L, cy - uy * L); g.lineTo(cx + ux * L, cy + uy * L); g.stroke();
    g.strokeStyle = '#ffd23f'; g.beginPath(); g.arc(e.tip[0], e.tip[1], 6, 0, Math.PI * 2); g.stroke();
  }
}

/** Verbindungsstatus geändert (vom Link) → Anzeige auffrischen */
export function stationLinkChanged() { if (st?.mode === 'cam') paint(); }
export const stationVideo = () => (cameraStream() ? st?.video : null);
