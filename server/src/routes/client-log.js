/* Fehler aus der App (JavaScript-Fehler im Browser) landen im Server-Log, damit man sie überhaupt sieht.
   Ohne Anmeldung erlaubt (auch der Anmeldebildschirm kann abstürzen), aber gedrosselt und gekürzt. */
import { anonIp } from '../log.js';

const cut = (v, n) => (typeof v === 'string' ? v.slice(0, n) : undefined);

export function clientLogRoutes(r, { limits }) {
  r.post('/api/client-log', async (c) => {
    limits.clientLog.hit(c.ip);
    const b = await c.json();
    const level = b.level === 'error' ? 'error' : 'warn';
    c.log[level]('client_error', {
      kind: cut(b.kind, 30), err: cut(b.msg, 400), src: cut(b.src, 200), line: Number.isInteger(b.line) ? b.line : undefined,
      stack: cut(b.stack, 1500), ua: cut(c.req.headers['user-agent'], 160), ip: anonIp(c.ip),
    });
    return { ok: true };
  }, { public: true });
}
