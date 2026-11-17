/* Einfaches Rate-Limit (festes Zeitfenster, im Speicher). Für eine Instanz ausreichend;
   bei mehreren Instanzen müsste das in einen gemeinsamen Speicher (z. B. Redis). */
import { HttpError } from './http.js';

export function createLimiter({ limit, windowMs }) {
  const hits = new Map();
  const sweep = setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (v.reset <= now) hits.delete(k); }, windowMs);
  sweep.unref?.();
  return {
    /** Zählt einen Treffer; wirft 429, wenn das Limit überschritten ist. */
    hit(key) {
      const now = Date.now();
      let e = hits.get(key);
      if (!e || e.reset <= now) { e = { n: 0, reset: now + windowMs }; hits.set(key, e); }
      e.n++;
      if (e.n > limit) {
        const retry = Math.ceil((e.reset - now) / 1000);
        throw new HttpError(429, 'rate_limited', `Zu viele Versuche. Bitte in ${retry} s erneut probieren.`, { retryAfter: retry });
      }
    },
    reset(key) { hits.delete(key); },
    stop() { clearInterval(sweep); },
  };
}
