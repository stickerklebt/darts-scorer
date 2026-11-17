/* Einstieg: Konfiguration, Datenbank, HTTP-Server, Aufräumen, sauberes Beenden (SIGTERM von systemd). */
import { createServer } from 'node:http';
import { join } from 'node:path';
import { loadConfig } from './config.js';
import { createLogger } from './log.js';
import { openDb, schemaVersion } from './db.js';
import { readFileSync } from 'node:fs';
import { createApp } from './app.js';

const config = loadConfig();
const log = createLogger();
const t0 = Date.now();

/* Abstürze nie still: Fehler loggen, dann beenden – systemd startet neu (Restart=on-failure) */
process.on('uncaughtException', (e) => { log.error('crash', { e }); process.exit(1); });
process.on('unhandledRejection', (e) => log.error('unhandled_rejection', { e: e instanceof Error ? e : new Error(String(e)) }));

/** Aktueller Git-Stand (für „welche Version läuft?“), ohne git aufzurufen */
function gitRev() {
  try {
    const dir = join(config.appDir, '.git'), head = readFileSync(join(dir, 'HEAD'), 'utf8').trim();
    const ref = head.startsWith('ref: ') ? readFileSync(join(dir, head.slice(5)), 'utf8').trim() : head;
    return ref.slice(0, 7);
  } catch { return undefined; }
}

let db;
try { db = openDb(join(config.dataDir, 'darts.db'), log); } catch (e) { log.error('db_open_failed', { data: config.dataDir, e }); process.exit(1); }
const app = createApp({ config, db, log });

const server = createServer({ requestTimeout: 30e3, headersTimeout: 15e3, keepAliveTimeout: 5e3 }, app.handler);
server.on('error', (e) => { log.error('listen_failed', { port: config.port, e }); process.exit(1); });
server.on('clientError', (e, socket) => { if (e.code !== 'ECONNRESET') log.debug('client_error_http', { code: e.code }); socket.destroy(); });
server.listen(config.port, config.host, () => log.info('listening', {
  host: config.host, port: config.port, data: config.dataDir, schema: schemaVersion(db), rev: gitRev(), node: process.version, ms: Date.now() - t0,
}));

// Abgelaufene Sitzungen stündlich entfernen
const sweep = setInterval(() => { try { const n = app.sessions.sweep(); if (n) log.info('sessions_swept', { n }); } catch (e) { log.error('sweep_failed', { e }); } }, 3600e3);
sweep.unref();

let stopping = false;
function shutdown(sig) {
  if (stopping) return;
  stopping = true;
  log.info('shutdown', { sig, uptime_s: Math.round(process.uptime()) });
  clearInterval(sweep);
  server.close(() => {
    app.close();
    try { db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); db.close(); } catch (e) { log.warn('db_close_failed', { e }); }
    log.info('stopped');
    process.exit(0);
  });
  server.closeIdleConnections?.();
  setTimeout(() => { log.warn('shutdown_forced'); process.exit(1); }, 10e3).unref(); // Notbremse
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
