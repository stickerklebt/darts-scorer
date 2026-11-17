/* Konfiguration ausschließlich über Umgebungsvariablen (12-Factor). Werte siehe .env.example. */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const bool = (v, d) => (v === undefined || v === '' ? d : /^(1|true|yes|on)$/i.test(v));
const num = (v, d) => (v === undefined || v === '' || Number.isNaN(Number(v)) ? d : Number(v));

export function loadConfig(env = process.env, over = {}) {
  const cookieSecure = (env.COOKIE_SECURE || 'auto').toLowerCase();
  return {
    env: env.NODE_ENV || 'production',
    host: env.HOST || '0.0.0.0',
    port: num(env.PORT, 8080),
    /** Persistente Daten (SQLite). Im Container ein Volume unter /data. */
    dataDir: resolve(env.DATA_DIR || resolve(here, '../../.data')),
    /** Ordner mit index.html, js/, css/ … (Repo-Wurzel bzw. /app im Container) */
    appDir: resolve(env.APP_DIR || resolve(here, '../..')),
    /** Hinter einem Reverse-Proxy (Caddy/Traefik/nginx): X-Forwarded-For/-Proto auswerten */
    trustProxy: bool(env.TRUST_PROXY, false),
    /** 'auto' = Secure-Cookie, wenn die Anfrage über HTTPS kam · 'true' · 'false' */
    cookieSecure: cookieSecure === 'true' ? true : cookieSecure === 'false' ? false : 'auto',
    sessionDays: num(env.SESSION_DAYS, 90),
    maxBodyBytes: num(env.MAX_BODY_MB, 20) * 1024 * 1024,
    /** Anfragen pro Minute und IP auf /api/auth/* */
    authRatePerMin: num(env.AUTH_RATE_PER_MIN, 30),
    /** scrypt-Kosten (log2 N). 15 ≈ 32 MB RAM, ~50–100 ms pro Hash. */
    scryptLogN: num(env.SCRYPT_LOG_N, 15),
    logRequests: bool(env.LOG_REQUESTS, true),
    ...over,
  };
}
