/* Eigener Caller: selbst eingesprochene Ansagen je Punktzahl (0–180). Liegen im Konto, damit sie auf jedem Gerät da sind.
   Die App nimmt auf und wandelt in WAV (überall abspielbar); hier wird nur gespeichert und ausgeliefert. */
import { HttpError, bad } from '../http.js';

const TYPES = ['audio/wav', 'audio/x-wav', 'audio/wave'];
const MAX_BYTES = 400 * 1024;   // ≈ 9 s Mono-WAV bei 22 kHz
const MAX_CLIPS = 200;

export function callerRoutes(r, { db }) {
  const q = {
    list: db.prepare('SELECT score, mime, length(data) AS size, updated_at AS updatedAt FROM caller_clips WHERE user_id = ? ORDER BY score'),
    get: db.prepare('SELECT mime, data, updated_at FROM caller_clips WHERE user_id = ? AND score = ?'),
    count: db.prepare('SELECT COUNT(*) AS n FROM caller_clips WHERE user_id = ?'),
    exists: db.prepare('SELECT 1 FROM caller_clips WHERE user_id = ? AND score = ?'),
    put: db.prepare(`INSERT INTO caller_clips (user_id, score, mime, data, updated_at) VALUES (?, ?, ?, ?, ?)
                     ON CONFLICT (user_id, score) DO UPDATE SET mime = excluded.mime, data = excluded.data, updated_at = excluded.updated_at`),
    del: db.prepare('DELETE FROM caller_clips WHERE user_id = ? AND score = ?'),
  };
  const score = (c) => {
    const s = Number(c.params.score);
    if (!Number.isInteger(s) || s < 0 || s > 180) throw bad('bad_score', 'Punktzahl 0–180.');
    return s;
  };

  r.get('/api/calls', (c) => ({ calls: q.list.all(c.user.id) }));

  r.get('/api/calls/:score', (c) => {
    const row = q.get.get(c.user.id, score(c));
    if (!row) throw new HttpError(404, 'not_found', 'Keine Aufnahme für diese Zahl.');
    const body = Buffer.from(row.data);
    c.res.writeHead(200, { 'Content-Type': row.mime, 'Content-Length': body.length, 'Cache-Control': 'private, no-cache', ETag: `"${row.updated_at}"` });
    c.res.end(body);
  });

  r.put('/api/calls/:score', async (c) => {
    const s = score(c);
    if (!q.exists.get(c.user.id, s) && q.count.get(c.user.id).n >= MAX_CLIPS) throw new HttpError(409, 'too_many', 'Zu viele Aufnahmen.');
    const { type, data } = await c.binary(MAX_BYTES, TYPES);
    if (data.length < 44 || data.toString('ascii', 0, 4) !== 'RIFF' || data.toString('ascii', 8, 12) !== 'WAVE') throw bad('bad_audio', 'Keine gültige WAV-Datei.');
    const now = Date.now();
    q.put.run(c.user.id, s, type === 'audio/wav' ? type : 'audio/wav', data, now);
    c.log.info('call_saved', { score: s, bytes: data.length });
    return { score: s, size: data.length, updatedAt: now };
  });

  r.delete('/api/calls/:score', (c) => { const s = score(c); if (q.del.run(c.user.id, s).changes) c.log.info('call_deleted', { score: s }); return { ok: true }; });
}
