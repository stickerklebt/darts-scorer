/* Kamera-Kopplung: das Kamera-Gerät öffnet einen Raum mit 6-stelligem Code, das Steuer-Gerät tritt mit dem Code bei.
   Nachrichten (JSON mit `type`) werden im Speicher zwischengelagert und vom anderen Gerät abgeholt (kurzes Abfragen).
   Ersetzt PeerJS/WebRTC: kein fremder Server, keine CDN-Skripte (CSP script-src/connect-src 'self'). Nichts wird gespeichert. */
import { randomInt } from 'node:crypto';
import { HttpError, bad } from '../http.js';
import { isPlainObject } from '../validate.js';

const ROOM_TTL = 12 * 3600e3, MSG_TTL = 120e3, MAX_QUEUE = 60, MAX_MSG = 400 * 1024, MAX_ROOMS = 2000; // Standbild zum Kalibrieren ≈ 150 KB
const SIDES = ['cam', 'ctl'];
const other = (s) => (s === 'cam' ? 'ctl' : 'cam');

export function camlinkRoutes(r, { limits }) {
  const rooms = new Map();
  const sweep = () => { const now = Date.now(); for (const [k, v] of rooms) if (now - v.touched > ROOM_TTL) rooms.delete(k); };
  const timer = setInterval(sweep, 10 * 60e3); timer.unref?.();
  const room = (c) => {
    const code = String(c.params.code || '');
    const x = /^\d{6}$/.test(code) ? rooms.get(code) : null;
    if (!x) throw new HttpError(404, 'no_room', 'Kein Kamera-Gerät mit diesem Code. Code am Kamera-Gerät prüfen.');
    x.touched = Date.now();
    return x;
  };
  const side = (v) => { if (!SIDES.includes(v)) throw bad('bad_side', 'Unbekannte Rolle.'); return v; };

  /** Kamera-Gerät: neuen Raum öffnen (oder einen bestehenden eigenen Code weiterverwenden) */
  r.post('/api/camlink', async (c) => {
    limits.camlink.hit(c.user.id);
    const b = await c.json();
    if (/^\d{6}$/.test(String(b.code || '')) && rooms.has(b.code)) { const x = rooms.get(b.code); x.touched = Date.now(); x.owner = c.user.id; return { code: b.code }; }
    if (rooms.size >= MAX_ROOMS) sweep();
    if (rooms.size >= MAX_ROOMS) throw new HttpError(503, 'busy', 'Gerade zu viele Kamera-Verbindungen. Bitte gleich nochmal.');
    let code; do code = String(randomInt(0, 1e6)).padStart(6, '0'); while (rooms.has(code));
    rooms.set(code, { owner: c.user.id, touched: Date.now(), seq: 0, q: { cam: [], ctl: [] }, seen: { cam: Date.now(), ctl: 0 } });
    c.log.info('camlink_open');
    return { status: 201, body: { code } };
  });

  /** Steuer-Gerät: läuft gerade ein Kamera-Gerät im selben Konto? (Startbildschirm zeigt dann die Kamera) */
  r.get('/api/camlink/mine', (c) => {
    c.res.locals.quiet = true;
    let best = null;
    for (const [code, x] of rooms) if (x.owner === c.user.id && Date.now() - x.seen.cam < 20e3 && (!best || x.seen.cam > best.seen)) best = { code, seen: x.seen.cam };
    return { code: best?.code ?? null };
  });

  /** Steuer-Gerät: mit Code beitreten */
  r.post('/api/camlink/:code/join', (c) => {
    limits.camlink.hit(c.user.id);
    const x = room(c);
    x.seen.ctl = Date.now();
    c.log.info('camlink_join');
    return { ok: true, peer: Date.now() - x.seen.cam };
  });

  r.post('/api/camlink/:code/send', async (c) => {
    limits.camlink.hit(c.user.id);
    c.res.locals.quiet = true;
    const x = room(c), b = await c.json(), from = side(b.from);
    const msgs = Array.isArray(b.msgs) ? b.msgs.slice(0, 20) : [];
    x.seen[from] = Date.now();
    const q = x.q[other(from)], now = Date.now();
    for (const m of msgs) {
      if (!isPlainObject(m) || typeof m.type !== 'string') throw bad('bad_msg', 'Ungültige Nachricht.');
      if (JSON.stringify(m).length > MAX_MSG) throw bad('too_large', 'Nachricht zu groß.');
      q.push({ seq: ++x.seq, at: now, msg: m });
    }
    while (q.length > MAX_QUEUE || (q.length && now - q[0].at > MSG_TTL)) q.shift();
    return { ok: true };
  });

  r.get('/api/camlink/:code/recv', (c) => {
    limits.camlink.hit(c.user.id);
    c.res.locals.quiet = true;
    const x = room(c), s = side(c.query.get('side')), after = Number(c.query.get('after')) || 0, now = Date.now();
    x.seen[s] = now;
    return { msgs: x.q[s].filter((m) => m.seq > after).map((m) => ({ seq: m.seq, ...m.msg })), peerAge: x.seen[other(s)] ? now - x.seen[other(s)] : null };
  });

  r.delete('/api/camlink/:code', (c) => { const x = room(c); rooms.delete(c.params.code); void x; return { ok: true }; });
}
