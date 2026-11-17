/* HTTP-Anwendung: Sicherheits-Header, API-Routen, statische Dateien, Fehlerbehandlung, Request-Log.
   createApp() ist ohne Netzwerk testbar (tests/server.test.mjs startet sie auf einem freien Port). */
import { performance } from 'node:perf_hooks';
import { HttpError, sendJson, readJson, clientIp, isHttps } from './http.js';
import { createRouter } from './router.js';
import { createSessions } from './sessions.js';
import { createLimiter } from './ratelimit.js';
import { createStatic } from './static.js';
import { authRoutes } from './routes/auth.js';
import { accountRoutes } from './routes/account.js';
import { syncRoutes } from './routes/sync.js';
import { friendRoutes } from './routes/friends.js';

const CSP = [
  "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:", "font-src 'self'",
  "connect-src 'self'", "manifest-src 'self'", "worker-src 'self'", "object-src 'none'", "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'",
].join('; ');

export function createApp({ config, db, log }) {
  const sessions = createSessions(db, config);
  const limits = {
    auth: createLimiter({ limit: config.authRatePerMin, windowMs: 60e3 }),
    login: createLimiter({ limit: 10, windowMs: 15 * 60e3 }),      // Fehlversuche je IP + E-Mail
    sync: createLimiter({ limit: 240, windowMs: 60e3 }),
    search: createLimiter({ limit: 90, windowMs: 60e3 }),
  };
  const router = createRouter();
  const deps = { db, sessions, config, limits, log };
  authRoutes(router, deps);
  accountRoutes(router, deps);
  syncRoutes(router, deps);
  friendRoutes(router, deps);
  router.get('/healthz', () => { db.prepare('SELECT 1').get(); return { ok: true }; }, { public: true });
  const serveStatic = createStatic(config.appDir);

  function securityHeaders(req, res) {
    res.setHeader('Content-Security-Policy', CSP);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    if (isHttps(req, config.trustProxy)) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  }

  /** Schreibende Anfragen nur von der eigenen Seite (zusätzlich zu SameSite-Cookie und JSON-Pflicht). */
  function checkOrigin(req) {
    if (req.headers['sec-fetch-site'] === 'cross-site') throw new HttpError(403, 'forbidden', 'Anfrage von fremder Seite.');
    const origin = req.headers.origin;
    if (!origin || origin === 'null') return;
    const host = (config.trustProxy && String(req.headers['x-forwarded-host'] || '').split(',')[0].trim()) || req.headers.host;
    let o;
    try { o = new URL(origin).host; } catch { o = ''; }
    if (o !== host) throw new HttpError(403, 'forbidden', 'Anfrage von fremder Seite.');
  }

  async function api(req, res, url) {
    const hit = router.match(req.method, url.pathname);
    if (hit === 'method') throw new HttpError(405, 'method', 'Methode nicht erlaubt.');
    if (!hit) throw new HttpError(404, 'not_found', 'Unbekannte Adresse.');
    if (req.method !== 'GET' && req.method !== 'HEAD') checkOrigin(req);
    const c = {
      req, res, log, params: hit.params, query: url.searchParams, ip: clientIp(req, config.trustProxy),
      user: sessions.user(req, res),
      json: () => readJson(req, config.maxBodyBytes),
    };
    if (!hit.route.opts.public && !c.user) throw new HttpError(401, 'unauthenticated', 'Bitte anmelden.');
    res.locals = { user: c.user?.id };
    const out = await hit.route.handler(c);
    if (res.headersSent) return;
    if (out && typeof out.status === 'number' && 'body' in out) sendJson(res, out.status, out.body);
    else sendJson(res, 200, out ?? { ok: true });
  }

  const handler = async (req, res) => {
    const t0 = performance.now();
    let url;
    try { url = new URL(req.url, 'http://localhost'); } catch { res.writeHead(400).end(); return; }
    res.on('finish', () => {
      if (config.logRequests && url.pathname !== '/healthz') {
        log.info('req', { m: req.method, p: url.pathname, s: res.statusCode, ms: Math.round(performance.now() - t0), u: res.locals?.user });
      }
    });
    securityHeaders(req, res);
    try {
      if (url.pathname.startsWith('/api/') || url.pathname === '/healthz') return await api(req, res, url);
      if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'method', 'Methode nicht erlaubt.');
      if (!(await serveStatic(req, res, url.pathname))) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Nicht gefunden'); }
    } catch (e) {
      if (res.headersSent) { res.destroy(); return; }
      if (e instanceof HttpError) {
        const headers = e.extra?.retryAfter ? { 'Retry-After': String(e.extra.retryAfter) } : {};
        sendJson(res, e.status, { error: e.code, message: e.message, ...(e.extra || {}) }, headers);
      } else {
        log.error('unhandled', { p: url.pathname, err: e.stack || String(e) });
        sendJson(res, 500, { error: 'internal', message: 'Interner Fehler. Bitte später erneut versuchen.' });
      }
    }
  };

  return {
    handler, sessions,
    close() { Object.values(limits).forEach((l) => l.stop()); },
  };
}
