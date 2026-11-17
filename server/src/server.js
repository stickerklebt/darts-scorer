/* Einstieg: Konfiguration, Datenbank, HTTP-Server, Aufräumen, sauberes Beenden (SIGTERM von Docker). */
import { createServer } from 'node:http';
import { join } from 'node:path';
import { loadConfig } from './config.js';
import { createLogger } from './log.js';
import { openDb } from './db.js';
import { createApp } from './app.js';

const config = loadConfig();
const log = createLogger();
const db = openDb(join(config.dataDir, 'darts.db'));
const app = createApp({ config, db, log });

const server = createServer({ requestTimeout: 30e3, headersTimeout: 15e3, keepAliveTimeout: 5e3 }, app.handler);
server.listen(config.port, config.host, () => log.info('listening', { port: config.port, env: config.env, data: config.dataDir }));

// Abgelaufene Sitzungen stündlich entfernen
const sweep = setInterval(() => { try { const n = app.sessions.sweep(); if (n) log.info('sessions_swept', { n }); } catch (e) { log.error('sweep_failed', { err: String(e) }); } }, 3600e3);
sweep.unref();

let stopping = false;
function shutdown(sig) {
  if (stopping) return;
  stopping = true;
  log.info('shutdown', { sig });
  clearInterval(sweep);
  server.close(() => {
    app.close();
    try { db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); db.close(); } catch { /* */ }
    process.exit(0);
  });
  server.closeIdleConnections?.();
  setTimeout(() => process.exit(1), 10e3).unref(); // Notbremse
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (e) => log.error('unhandled_rejection', { err: String(e?.stack || e) }));
