/* Kopplung Kamera-Geräte ↔ Regie (Hauptgerät) über den eigenen Server (routes/camlink.js) statt PeerJS.
   Ein Kamera-Gerät hat genau einen Raum (Code). Die Regie kann mit MEHREREN Kameras verbunden sein (z. B. Handy + iPad als Kameras).
   Nachrichten sind JSON mit `type`:
     Kamera → Regie:  hello · calibrationStatus { ok } · throw {…} · takeout · cameraMoved · frame { img, still } · pong
     Regie → Kamera:  hello · turnChanged · throwCorrected · takeout · previewOn/Off · still · calibrate { pts } · recalibrate · ping
   Verbunden = das andere Gerät hat sich in den letzten 6 s gemeldet. Bei Fehlern alle 3 s neu (gleicher Code). */
import { api } from './api.js';

const KEY = 'darts.camlink';
/** Gesamtstand (für Anzeige/Logik): bei der Regie zusammengefasst über alle Kameras */
export const link = { role: null, code: null, status: 'off', calibrated: false, moved: false, cams: [] };
const conns = new Map(); // code → { code, n, after, status, calibrated, moved, timer, outbox, sending, lastPing }
let onMsg = () => {}, onChange = () => {};

export function onLink(h) { onMsg = h.message || onMsg; onChange = h.change || onChange; }
const save = () => { try { if (link.role) localStorage.setItem(KEY, JSON.stringify({ role: link.role, codes: [...conns.keys()] })); else localStorage.removeItem(KEY); } catch { /* */ } };

function summarize() {
  const list = [...conns.values()];
  link.cams = list.map((c) => ({ code: c.code, n: c.n, status: c.status, calibrated: c.calibrated, moved: c.moved, text: c.text || '', paused: !!c.paused, lenses: c.lenses || [], lens: c.lens || null, device: c.device || '', pts: c.pts || null, extra: c.extra || [] }));
  link.code = link.role === 'cam' ? list[0]?.code ?? null : null;
  link.status = !list.length ? 'off' : list.some((c) => c.status === 'connected') ? 'connected' : list.some((c) => c.status === 'connecting') ? 'connecting' : 'lost';
  link.calibrated = list.some((c) => c.status === 'connected' && c.calibrated);
  link.moved = list.some((c) => c.status === 'connected' && c.moved);
}
const changed = () => { summarize(); onChange(); };
export const camCount = () => conns.size;
export const readyCams = () => [...conns.values()].filter((c) => c.status === 'connected' && c.calibrated && !c.moved).length;

/** Kamera-Gerät: Raum öffnen (Code bleibt nach Neustart gleich, wenn möglich) */
export async function openAsCamera() {
  let prev = null; try { prev = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { /* */ }
  const r = await api('POST', 'api/camlink', { code: prev?.role === 'cam' ? prev.codes?.[0] : undefined });
  stopAll(); link.role = 'cam';
  add(r.code); save();
  send({ type: 'hello', role: 'cam' });
  return r.code;
}
/** Regie: mit einer (weiteren) Kamera verbinden */
export async function joinAsController(code) {
  code = String(code || '').replace(/\D/g, '');
  if (code.length !== 6) throw new Error('Der Code hat 6 Ziffern.');
  if (link.role === 'cam') stopAll();
  if (conns.has(code)) return;
  await api('POST', `api/camlink/${code}/join`, {});
  link.role = 'ctl'; add(code); save();
  send({ type: 'hello', role: 'ctl' }, code);
}
/** Eine Kamera (code) oder alles trennen */
export function disconnect(code = null) {
  if (code) { const c = conns.get(code); if (c) { clearTimeout(c.timer); conns.delete(code); } if (!conns.size) link.role = null; }
  else { if (link.role === 'cam' && link.code) api('DELETE', `api/camlink/${link.code}`).catch(() => {}); stopAll(); link.role = null; }
  save(); changed();
}
function stopAll() { for (const c of conns.values()) clearTimeout(c.timer); conns.clear(); }

/** Nach App-Neustart: letzte Verbindungen wieder aufnehmen → Rolle */
export function resumeLink() {
  let prev = null; try { prev = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { /* */ }
  const codes = prev?.codes || (prev?.code ? [prev.code] : []);
  if (!codes.length || link.role) return null;
  link.role = prev.role;
  codes.forEach((c) => add(c));
  return prev.role;
}

/** Senden: Kamera → an ihre Regie; Regie → an eine Kamera (code) oder an alle */
export function send(msg, code = null) {
  for (const c of conns.values()) if (!code || c.code === code) { c.outbox.push(msg); flush(c); }
}
async function flush(c) {
  if (c.sending || !c.outbox.length || !conns.has(c.code)) return;
  c.sending = true;
  const msgs = c.outbox.splice(0, 20);
  try { await api('POST', `api/camlink/${c.code}/send`, { from: link.role, msgs }); }
  catch (e) {
    // Vom Server abgelehnt (z. B. zu groß): einzeln nochmal, Kaputtes verwerfen – nie die ganze Warteschlange blockieren
    if (e?.status >= 400 && e.status < 500 && e.status !== 404 && e.status !== 429) {
      if (msgs.length > 1) for (const m of msgs) await api('POST', `api/camlink/${c.code}/send`, { from: link.role, msgs: [m] }).catch(() => {});
    } else { c.outbox.unshift(...msgs.filter((m) => m.type !== 'frame')); c.outbox = c.outbox.slice(-40); } // alte Bilder nicht nachschicken
  }
  finally { c.sending = false; if (c.outbox.length) setTimeout(() => flush(c), 500); }
}

function add(code) {
  const c = { code, n: conns.size + 1, after: 0, status: 'connecting', calibrated: false, moved: false, timer: null, outbox: [], sending: false, lastPing: 0 };
  conns.set(code, c); changed();
  const tick = async () => {
    if (conns.get(code) !== c) return;
    let delay = link.role === 'ctl' ? 450 : 700;
    if (!document.hidden || link.role === 'cam') {
      try {
        const r = await api('GET', `api/camlink/${code}/recv?side=${link.role}&after=${c.after}`);
        for (const m of r.msgs || []) {
          c.after = Math.max(c.after, m.seq);
          if (m.type === 'ping') { send({ type: 'pong' }, code); continue; }
          if (m.type === 'calibrationStatus') { c.calibrated = !!m.ok; c.pts = m.ok ? m.pts || c.pts : null; c.extra = m.ok ? m.extra || [] : []; if (m.ok) c.moved = false; changed(); }
          if (m.type === 'cameraMoved') { c.moved = true; changed(); }
          if (m.type === 'camStatus') { c.text = m.text; c.paused = !!m.paused; if (m.device) c.device = m.device; changed(); }
          if (m.type === 'cams') { c.lenses = m.list || []; c.lens = m.current; changed(); }
          onMsg(m, code);
        }
        const st = r.peerAge !== null && r.peerAge < 6000 ? 'connected' : 'connecting';
        if (st !== c.status) { c.status = st; changed(); }
        if (link.role === 'ctl' && Date.now() - c.lastPing > 2000) { c.lastPing = Date.now(); send({ type: 'ping' }, code); }
      } catch (e) {
        if (c.status !== 'lost') { c.status = 'lost'; changed(); }
        delay = 3000;
        if (e?.status === 404 && link.role === 'cam') { try { await openAsCamera(); return; } catch { /* weiter versuchen */ } }
        if (e?.status === 404 && link.role === 'ctl') { disconnect(code); return; } // Kamera wurde beendet
      }
    }
    c.timer = setTimeout(tick, delay);
  };
  tick();
}
