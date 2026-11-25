/* Freunde: über den eindeutigen Namen suchen, Anfrage schicken, annehmen/ablehnen, entfernen, Profil mit Statistik.
   Statistik nur für bestätigte Freunde. Gemeinsam spielen: routes/games.js. */
import { HttpError, bad } from '../http.js';
import { isId, usernameKey } from '../validate.js';
import { friendStats } from '../friend-stats.js';

const MAX_PENDING = 50;

export function friendRoutes(r, { db, limits }) {
  const q = {
    userByKey: db.prepare('SELECT id, username FROM users WHERE username_key = ?'),
    userById: db.prepare('SELECT id, username FROM users WHERE id = ?'),
    rel: db.prepare(`SELECT requester_id, addressee_id, status, created_at, responded_at FROM friendships
                     WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)`),
    friends: db.prepare(`SELECT u.id, u.username, f.responded_at AS since FROM friendships f
                         JOIN users u ON u.id = CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END
                         WHERE f.status = 'accepted' AND (f.requester_id = ? OR f.addressee_id = ?) ORDER BY u.username_key`),
    incoming: db.prepare(`SELECT u.id, u.username, f.created_at AS at FROM friendships f JOIN users u ON u.id = f.requester_id
                          WHERE f.addressee_id = ? AND f.status = 'pending' ORDER BY f.created_at DESC`),
    outgoing: db.prepare(`SELECT u.id, u.username, f.created_at AS at FROM friendships f JOIN users u ON u.id = f.addressee_id
                          WHERE f.requester_id = ? AND f.status = 'pending' ORDER BY f.created_at DESC`),
    pendingCount: db.prepare(`SELECT COUNT(*) AS n FROM friendships WHERE requester_id = ? AND status = 'pending'`),
    insert: db.prepare(`INSERT INTO friendships (requester_id, addressee_id, status, created_at) VALUES (?, ?, 'pending', ?)`),
    accept: db.prepare(`UPDATE friendships SET status = 'accepted', responded_at = ? WHERE requester_id = ? AND addressee_id = ? AND status = 'pending'`),
    remove: db.prepare('DELETE FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)'),
    search: db.prepare(`SELECT id, username FROM users WHERE username_key LIKE ? ESCAPE '\\' AND id <> ? ORDER BY length(username_key), username_key LIMIT 10`),
    stateRow: db.prepare('SELECT rev, state FROM user_state WHERE user_id = ?'),
    matchData: db.prepare('SELECT data FROM matches WHERE user_id = ? AND deleted = 0'),
  };

  /* Statistik-Cache je Nutzer, gültig solange sich seine Daten (rev) nicht ändern */
  const cache = new Map();
  function statsFor(userId) {
    const row = q.stateRow.get(userId);
    if (!row) return null;
    return entryFor(userId, row).stats;
  }
  function entryFor(userId, row = q.stateRow.get(userId)) {
    if (!row) return null;
    const hit = cache.get(userId);
    if (hit && hit.rev === row.rev) return hit;
    const matches = q.matchData.all(userId).map((x) => { try { return JSON.parse(x.data); } catch { return null; } }).filter(Boolean);
    let state = null;
    try { state = row.state ? JSON.parse(row.state) : null; } catch { /* */ }
    const stats = friendStats(state, matches);
    // Eigener Dart (VIP › Profil › Dart fotografieren): PNG als data-URL in prefs.myDart – nur die Bytes werden gemerkt
    const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(typeof state?.prefs?.myDart === 'string' ? state.prefs.myDart : '');
    const dart = m ? Buffer.from(m[1], 'base64') : null;
    const e = { rev: row.rev, stats, dart: dart && dart.length > 8 && dart.length < 3e6 ? dart : null };
    cache.delete(userId);
    cache.set(userId, e);
    if (cache.size > 500) cache.delete(cache.keys().next().value);
    return e;
  }

  const relation = (me, other) => {
    const row = q.rel.get(me, other, other, me);
    if (!row) return 'none';
    if (row.status === 'accepted') return 'friend';
    return row.requester_id === me ? 'outgoing' : 'incoming';
  };
  const target = (c) => {
    const id = c.params.id;
    if (!isId(id) || id === c.user.id) throw bad('bad_user', 'Unbekannter Spieler.');
    const u = q.userById.get(id);
    if (!u) throw new HttpError(404, 'not_found', 'Diesen Spieler gibt es nicht (mehr).');
    return u;
  };

  r.get('/api/friends', (c) => {
    const me = c.user.id;
    const friends = q.friends.all(me, me, me).map((f) => {
      const e = entryFor(f.id), s = e?.stats;
      return { id: f.id, username: f.username, since: f.since, pid: s?.pid ?? null, avg: s?.x501?.avg ?? null, matches: s?.total ?? 0, lastPlayed: s?.lastPlayed ?? null, dart: e?.dart ? e.rev : null };
    });
    return { friends, incoming: q.incoming.all(me), outgoing: q.outgoing.all(me) };
  });

  r.get('/api/users/search', (c) => {
    limits.search.hit(c.user.id);
    const raw = (c.query.get('q') || '').trim().replace(/^@/, '');
    if (raw.length < 2) return { users: [] };
    const like = `${usernameKey(raw.slice(0, 20)).replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
    return { users: q.search.all(like, c.user.id).map((u) => ({ ...u, relation: relation(c.user.id, u.id) })) };
  });

  /** Anfrage per Name. Hat der andere schon angefragt, wird daraus direkt eine Freundschaft. */
  r.post('/api/friends', async (c) => {
    limits.search.hit(c.user.id);
    const name = String((await c.json()).username || '').trim().replace(/^@/, '');
    const u = name && q.userByKey.get(usernameKey(name));
    if (!u) throw new HttpError(404, 'not_found', `Niemand heißt „${name}“.`);
    if (u.id === c.user.id) throw bad('self', 'Das bist du selbst.');
    const rel = relation(c.user.id, u.id);
    if (rel === 'friend') return { status: 'friend', user: u };
    if (rel === 'outgoing') return { status: 'outgoing', user: u };
    if (rel === 'incoming') { q.accept.run(Date.now(), u.id, c.user.id); c.log.info('friend_accepted', { other: u.id }); return { status: 'friend', user: u }; }
    if (q.pendingCount.get(c.user.id).n >= MAX_PENDING) throw new HttpError(429, 'too_many_pending', 'Zu viele offene Anfragen.');
    q.insert.run(c.user.id, u.id, Date.now());
    c.log.info('friend_requested', { other: u.id });
    return { status: 201, body: { status: 'outgoing', user: u } };
  });

  r.post('/api/friends/:id/accept', (c) => {
    const u = target(c);
    if (q.accept.run(Date.now(), u.id, c.user.id).changes !== 1) throw new HttpError(404, 'no_request', 'Keine offene Anfrage von diesem Spieler.');
    c.log.info('friend_accepted', { other: u.id });
    return { status: 'friend', user: u };
  });

  /** Freund entfernen, Anfrage ablehnen oder eigene Anfrage zurückziehen – alles dasselbe: Verbindung löschen. */
  r.delete('/api/friends/:id', (c) => {
    const u = target(c);
    if (q.remove.run(c.user.id, u.id, u.id, c.user.id).changes) c.log.info('friend_removed', { other: u.id });
    return { status: 'none' };
  });

  r.get('/api/friends/:id', (c) => {
    const u = target(c);
    const row = q.rel.get(c.user.id, u.id, u.id, c.user.id);
    if (!row || row.status !== 'accepted') throw new HttpError(403, 'not_friends', 'Nur Freunde können die Statistik sehen.');
    const e = entryFor(u.id);
    return { user: { id: u.id, username: u.username, friendsSince: row.responded_at, dart: e?.dart ? e.rev : null }, stats: e?.stats ?? null };
  });

  /** Eingescannter Dart eines Freundes als Bild (nur für Freunde). ?v=rev im Link sorgt für frisches Bild nach einer Änderung. */
  r.get('/api/friends/:id/dart', (c) => {
    const u = target(c);
    const row = q.rel.get(c.user.id, u.id, u.id, c.user.id);
    if (!row || row.status !== 'accepted') throw new HttpError(403, 'not_friends', 'Nur Freunde können den Dart sehen.');
    const e = entryFor(u.id);
    if (!e?.dart) throw new HttpError(404, 'not_found', 'Kein eigener Dart.');
    c.res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': e.dart.length, 'Cache-Control': 'private, max-age=86400', ETag: `"${e.rev}"` });
    c.res.end(e.dart);
  });
}
