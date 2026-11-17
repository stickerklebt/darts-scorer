/* Konfiguration. Von außen einstellbar sind nur PORT und DATA_DIR (setzt darts.service), alles andere ist fest.
   Node lauscht nur auf 127.0.0.1 – erreichbar ist der Server ausschließlich über nginx davor, deshalb werden die
   Proxy-Header (X-Forwarded-For/-Proto/-Host) ausgewertet. `over` ist nur für Tests. */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

export function loadConfig(env = process.env, over = {}) {
  return {
    host: '127.0.0.1',
    port: Number(env.PORT) || 8080,
    /** Persistente Daten (SQLite + Backups) */
    dataDir: resolve(env.DATA_DIR || resolve(here, '../../.data')),
    /** Ordner mit index.html, js/, css/ … (Repo-Wurzel) */
    appDir: resolve(here, '../..'),
    trustProxy: true,
    /** Secure-Cookie, sobald der äußere Proxy HTTPS meldet (X-Forwarded-Proto: https) */
    cookieSecure: 'auto',
    sessionDays: 90,
    maxBodyBytes: 20 * 1024 * 1024,   // passend zu client_max_body_size 20m in nginx.conf
    authRatePerMin: 30,               // Anfragen pro Minute und IP auf /api/auth/*
    scryptLogN: 15,                   // scrypt-Kosten: ≈ 32 MB RAM, ~50–100 ms pro Hash
    logRequests: true,
    ...over,
  };
}
