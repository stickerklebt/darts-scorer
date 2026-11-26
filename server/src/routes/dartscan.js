/* Dart-Scan-Protokoll: jedes Foto aus VIP › Profil › Dart fotografieren kommt mit dem Ergebnis der Erkennung hierher,
   damit man Fehlschläge später nachvollziehen kann. Ablage: DATA_DIR/dartscans/<Zeit>_<Nutzer>_<ok|fail>.<jpg|…> + .json (Meta).
   Es bleiben höchstens KEEP Scans (älteste fliegen raus). Kein Teil der Backups, nicht im Sync. */
import { mkdirSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { scanMeta } from '../validate.js';

const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif' };
const MAX_BYTES = 8 * 1024 * 1024;
const KEEP = 300;

export function dartscanRoutes(r, { config, limits }) {
  const dir = join(config.dataDir, 'dartscans');

  r.post('/api/dartscan', async (c) => {
    limits.dartscan.hit(c.user.id);
    const meta = scanMeta(c.req.headers['x-scan-meta']);
    const { type, data } = await c.binary(MAX_BYTES, Object.keys(TYPES));
    const base = `${new Date().toISOString().replace(/[:.]/g, '-')}_${c.user.id.slice(0, 8)}_${meta.ok ? 'ok' : 'fail'}`;
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${base}.${TYPES[type]}`), data);
    writeFileSync(join(dir, `${base}.json`), JSON.stringify({ ...meta, user: c.user.id, rid: c.res.locals.rid, ua: String(c.req.headers['user-agent'] || '').slice(0, 200), bytes: data.length, type }, null, 1));
    // aufräumen: nur die neuesten KEEP Scans behalten (Name beginnt mit der Zeit → sortierbar)
    const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
    for (const f of files.slice(0, Math.max(0, files.length - KEEP))) {
      const stem = f.slice(0, -5);
      for (const g of readdirSync(dir)) if (g.startsWith(stem + '.')) try { unlinkSync(join(dir, g)); } catch { /* */ }
    }
    c.log[meta.ok ? 'info' : 'warn']('dart_scan', { ok: meta.ok, step: meta.step, err: meta.err, ms: meta.ms, w: meta.img?.w, h: meta.img?.h, bytes: data.length, file: base });
    return { ok: true };
  });
}
