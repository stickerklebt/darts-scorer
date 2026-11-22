/* Kopplung Kamera-Gerät ↔ Steuer-Gerät über den eigenen Server (routes/camlink.js) statt PeerJS.
   Nachrichten sind JSON mit `type`:
     Kamera → Steuer:  hello · calibrationStatus { ok } · throw { id, dartIndex, label, segment, multiplier, points, boardX, boardY, confidence, snapshot }
                       takeout · cameraMoved · pong
     Steuer → Kamera:  hello · turnChanged { name, bot } · throwCorrected { id, label } · takeout (Knopf „Darts gezogen“) · ping
   Verbunden = das andere Gerät hat sich in den letzten 6 s gemeldet. Bei Fehlern alle 3 s neu versuchen (gleicher Code). */
import { api } from './api.js';

const KEY = 'darts.camlink';
export const link = { role: null, code: null, status: 'off', calibrated: false, moved: false, error: null };
let after = 0, timer = null, outbox = [], sending = false, onMsg = () => {}, onChange = () => {}, lastPing = 0;

export function onLink(handlers) { onMsg = handlers.message || onMsg; onChange = handlers.change || onChange; }
const save = () => { try { if (link.role) localStorage.setItem(KEY, JSON.stringify({ role: link.role, code: link.code })); else localStorage.removeItem(KEY); } catch { /* */ } };
const set = (st) => { if (link.status !== st) { link.status = st; onChange(); } };

/** Kamera-Gerät: Raum öffnen (Code bleibt nach Neustart gleich, wenn möglich) */
export async function openAsCamera() {
  let prev = null; try { prev = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { /* */ }
  const r = await api('POST', 'api/camlink', { code: prev?.role === 'cam' ? prev.code : undefined });
  Object.assign(link, { role: 'cam', code: r.code, error: null }); after = 0; save(); start();
  send({ type: 'hello', role: 'cam' });
  return r.code;
}
/** Steuer-Gerät: mit Code verbinden */
export async function joinAsController(code) {
  code = String(code || '').replace(/\D/g, '');
  if (code.length !== 6) throw new Error('Der Code hat 6 Ziffern.');
  await api('POST', `api/camlink/${code}/join`, {});
  Object.assign(link, { role: 'ctl', code, error: null, calibrated: false, moved: false }); after = 0; save(); start();
  send({ type: 'hello', role: 'ctl' });
}
export function disconnect() {
  clearTimeout(timer); timer = null;
  if (link.role === 'cam' && link.code) api('DELETE', `api/camlink/${link.code}`).catch(() => {});
  Object.assign(link, { role: null, code: null, calibrated: false, moved: false }); outbox = []; save(); set('off');
}
/** Nach App-Neustart: letzte Verbindung wieder aufnehmen */
export function resumeLink() {
  let prev = null; try { prev = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { /* */ }
  if (!prev?.code || link.role) return null;
  Object.assign(link, { role: prev.role, code: prev.code }); after = 0; start();
  return prev.role;
}

export function send(msg) { if (!link.code) return; outbox.push(msg); flush(); }
async function flush() {
  if (sending || !outbox.length || !link.code) return;
  sending = true;
  const msgs = outbox.splice(0, 20);
  try { await api('POST', `api/camlink/${link.code}/send`, { from: link.role, msgs }); }
  catch { outbox.unshift(...msgs); outbox = outbox.slice(-40); }
  finally { sending = false; if (outbox.length) setTimeout(flush, 500); }
}

function start() {
  clearTimeout(timer);
  set('connecting');
  const tick = async () => {
    if (!link.code) return;
    let delay = link.role === 'ctl' ? 450 : 700;
    if (!document.hidden || link.role === 'cam') {
      try {
        const r = await api('GET', `api/camlink/${link.code}/recv?side=${link.role}&after=${after}`);
        for (const m of r.msgs || []) { after = Math.max(after, m.seq); if (m.type === 'ping') send({ type: 'pong' }); else onMsg(m); }
        set(r.peerAge !== null && r.peerAge < 6000 ? 'connected' : 'connecting');
        if (Date.now() - lastPing > 2000) { lastPing = Date.now(); if (link.role === 'ctl') send({ type: 'ping' }); }
      } catch (e) {
        set('lost'); delay = 3000;
        if (e?.status === 404 && link.role === 'cam') { try { await openAsCamera(); } catch { /* weiter versuchen */ } }
      }
    }
    timer = setTimeout(tick, delay);
  };
  tick();
}
