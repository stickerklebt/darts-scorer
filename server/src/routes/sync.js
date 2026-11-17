/* Delta-Sync der Spieldaten. Jede Änderung bekommt eine fortlaufende Nummer (rev) pro Nutzer.
   Gerät schickt: { since, upsert: [Match], remove: [id], state? }  (state = alles außer matches)
   Antwort:       { rev, matches: [geändert von anderen Geräten], removed: [id], state?, stateConflict?, resync? }
   Matches sind über ihre id idempotent. Der übrige Zustand (Profile, Einstellungen …) wird nur übernommen, wenn das
   Gerät den letzten Stand kannte – sonst bekommt es den Serverstand zurück (stateConflict) und führt zusammen. */
import { bad } from '../http.js';
import { tx } from '../db.js';
import { isId, isPlainObject } from '../validate.js';

const MAX_MATCH = 512 * 1024, MAX_STATE = 4 * 1024 * 1024, MAX_UPSERT = 500, MAX_REMOVE = 10000;

export function syncRoutes(r, { db, limits }) {
  const q = {
    state: db.prepare('SELECT rev, state, state_rev FROM user_state WHERE user_id = ?'),
    upsert: db.prepare(`INSERT INTO matches (user_id, id, rev, deleted, game, ended_at, data) VALUES (?, ?, ?, 0, ?, ?, ?)
                        ON CONFLICT (user_id, id) DO UPDATE SET rev = excluded.rev, deleted = 0, game = excluded.game, ended_at = excluded.ended_at, data = excluded.data`),
    remove: db.prepare('UPDATE matches SET deleted = 1, data = NULL, rev = ? WHERE user_id = ? AND id = ? AND deleted = 0'),
    setState: db.prepare('UPDATE user_state SET state = ?, state_rev = ?, rev = ?, updated_at = ? WHERE user_id = ?'),
    bump: db.prepare('UPDATE user_state SET rev = ?, updated_at = ? WHERE user_id = ?'),
    changes: db.prepare('SELECT id, deleted, data FROM matches WHERE user_id = ? AND rev > ? AND rev <> ? ORDER BY rev'),
  };

  r.post('/api/sync', async (c) => {
    limits.sync.hit(c.user.id);
    const b = await c.json();
    const upsert = b.upsert ?? [], remove = b.remove ?? [];
    if (!Array.isArray(upsert) || !Array.isArray(remove)) throw bad('sync_invalid', 'Ungültige Sync-Daten.');
    if (upsert.length > MAX_UPSERT || remove.length > MAX_REMOVE) throw bad('sync_too_many', 'Zu viele Änderungen auf einmal.');
    const rows = upsert.map((m) => {
      if (!isPlainObject(m) || !isId(m.id)) throw bad('sync_invalid', 'Ungültiges Match.');
      const data = JSON.stringify(m);
      if (data.length > MAX_MATCH) throw bad('sync_too_large', 'Ein Match ist zu groß.');
      return { id: m.id, game: typeof m.game === 'string' ? m.game.slice(0, 24) : null, ended: Number.isFinite(m.endedAt) ? m.endedAt : null, data };
    });
    if (!remove.every(isId)) throw bad('sync_invalid', 'Ungültige Match-id.');
    let stateJson = null;
    if (b.state !== undefined && b.state !== null) {
      if (!isPlainObject(b.state)) throw bad('sync_invalid', 'Ungültiger Zustand.');
      const { matches: _ignored, ...rest } = b.state;
      stateJson = JSON.stringify(rest);
      if (stateJson.length > MAX_STATE) throw bad('sync_too_large', 'Zustand zu groß.');
    }
    const uid = c.user.id, now = Date.now();

    return tx(db, () => {
      const cur = q.state.get(uid);
      let since = Number.isSafeInteger(b.since) && b.since >= 0 ? b.since : 0;
      const resync = since > cur.rev; // Server kennt den Stand des Geräts nicht (z. B. Backup zurückgespielt)
      if (resync) since = 0;
      const conflict = stateJson !== null && cur.state_rev > since;
      const writeState = stateJson !== null && !conflict;
      const changed = rows.length > 0 || remove.length > 0 || writeState;
      const rev = changed ? cur.rev + 1 : cur.rev;
      for (const x of rows) q.upsert.run(uid, x.id, rev, x.game, x.ended, x.data);
      for (const id of remove) q.remove.run(rev, uid, id);
      if (writeState) q.setState.run(stateJson, rev, rev, now, uid);
      else if (changed) q.bump.run(rev, now, uid);

      const out = { rev, matches: [], removed: [] };
      for (const o of q.changes.all(uid, since, changed ? rev : -1)) {
        if (o.deleted) out.removed.push(o.id); else out.matches.push(JSON.parse(o.data));
      }
      if (!writeState && cur.state && cur.state_rev > since) out.state = JSON.parse(cur.state);
      if (conflict) out.stateConflict = true;
      if (resync) out.resync = true;
      return out;
    });
  });
}
