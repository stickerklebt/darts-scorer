/* Auslieferung der PWA-Dateien. Nur eine feste Liste von Pfaden ist erreichbar (Allowlist) –
   server/, tests/, tools/, .git usw. werden nie ausgeliefert, auch wenn sie im Ordner liegen. */
import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { join, normalize, extname, sep } from 'node:path';

const FILES = new Set(['index.html', 'manifest.webmanifest', 'sw.js', 'dartvader-180.png', 'dartvader-512.png', 'dartvader.svg', 'favicon.ico']);
const DIRS = new Set(['css', 'js', 'fonts', 'bots', 'assets']);
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

export function createStatic(appDir) {
  const root = normalize(appDir + sep);
  return async function serveStatic(req, res, pathname) {
    let rel;
    try { rel = decodeURIComponent(pathname).replace(/^\/+/, ''); } catch { return false; }
    if (rel === '') rel = 'index.html';
    if (rel.includes('\0') || rel.split('/').some((p) => p === '..' || p.startsWith('.'))) return false;
    const top = rel.split('/')[0];
    if (!(FILES.has(rel) || (DIRS.has(top) && rel.includes('/')))) return false;
    const ext = extname(rel).toLowerCase();
    if (!MIME[ext] || /\.(md|txt)$/i.test(rel)) return false;
    const file = normalize(join(root, rel));
    if (!file.startsWith(root)) return false;
    let st;
    try { st = await stat(file); } catch { return false; }
    if (!st.isFile()) return false;

    const etag = `W/"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`;
    // Schriften und Icons ändern sich selten → eine Woche cachen. HTML/JS/CSS immer neu prüfen (Service Worker cacht offline).
    const cache = ext === '.woff2' || ext === '.png' ? 'public, max-age=604800' : 'no-cache';
    const headers = { 'Content-Type': MIME[ext], 'Cache-Control': cache, ETag: etag, 'Last-Modified': st.mtime.toUTCString() };
    if (rel === 'sw.js') headers['Service-Worker-Allowed'] = '/';
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, headers); res.end(); return true; }
    res.writeHead(200, { ...headers, 'Content-Length': st.size });
    if (req.method === 'HEAD') { res.end(); return true; }
    createReadStream(file).on('error', () => res.destroy()).pipe(res);
    return true;
  };
}
