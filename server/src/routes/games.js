/* Gegen Freunde spielen.
   1) Online (jeder an seinem Gerät): Gastgeber lädt ein → Freund nimmt an → beide Geräte gleichen das laufende Match über
      rev ab (wer dran ist, schreibt; das andere Gerät fragt regelmäßig nach). Am Ende speichert jedes Gerät das Match im eigenen Konto.
   2) Auf dem Gerät des Gastgebers: nach dem Match landet es beim Freund als „Hast du dieses Spiel gespielt?“ –
      erst mit seinem Haken kommt es in sein Konto (und damit in seine Statistik). */
import { randomUUID } from 'node:crypto';
import { HttpError, bad } from '../http.js';
import { tx } from '../db.js';
import { isId, isPlainObject } from '../validate.js';

const MAX_MATCH = 512 * 1024;
const INVITE_TTL = 10 * 60e3;     // Einladungen verfallen nach 10 Minuten
const IDLE_TTL = 6 * 3600e3;      // laufende Spiele ohne Eingabe nach 6 Stunden

export function gameRoutes(r, { db, limits }) {
  const q = {
    friends: db.prepare(`SELECT 1 FROM friendships WHERE status = 'accepted' AND ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))`),
    user: db.prepare('SELECT id, username FROM users WHERE id = ?'),
    state: db.prepare('SELECT rev, state FROM user_state WHERE user_id = ?'),
    game: db.prepare('SELECT * FROM games WHERE id = ?'),
    insertGame: db.prepare(`INSERT INTO games (id, host_id, guest_id, status, rev, data, created_at, updated_at) VALUES (?, ?, ?, 'invited', 1, ?, ?, ?)`),
    setStatus: db.prepare('UPDATE games SET status = ?, rev = rev + 1, updated_at = ? WHERE id = ?'),
    write: db.prepare('UPDATE games SET data = ?, rev = ?, status = ?, updated_at = ? WHERE id = ? AND rev = ?'),
    inbox: db.prepare(`SELECT g.id, g.data, g.created_at, u.username AS host FROM games g JOIN users u ON u.id = g.host_id
                       WHERE g.guest_id = ? AND g.status = 'invited' AND g.created_at > ? ORDER BY g.created_at DESC LIMIT 5`),
    cancelOld: db.prepare(`UPDATE games SET status = 'aborted', rev = rev + 1, updated_at = ? WHERE host_id = ? AND status IN ('invited', 'active')`),
    sweep: db.prepare(`DELETE FROM games WHERE (status IN ('done', 'declined', 'aborted') AND updated_at < ?) OR (status = 'invited' AND created_at < ?) OR (status = 'active' AND updated_at < ?)`),
    confirmIns: db.prepare(`INSERT INTO match_confirms (id, from_id, to_id, match_id, data, created_at) VALUES (?, ?, ?, ?, ?, ?)
                            ON CONFLICT (to_id, match_id) DO UPDATE SET data = excluded.data, created_at = excluded.created_at, from_id = excluded.from_id`),
    confirmList: db.prepare(`SELECT c.id, c.data, c.created_at, u.username AS sender FROM match_confirms c JOIN users u ON u.id = c.from_id
                             WHERE c.to_id = ? ORDER BY c.created_at DESC LIMIT 50`),
    confirmGet: db.prepare('SELECT * FROM match_confirms WHERE id = ? AND to_id = ?'),
    confirmDel: db.prepare('DELETE FROM match_confirms WHERE id = ?'),
    upsertMatch: db.prepare(`INSERT INTO matches (user_id, id, rev, deleted, game, ended_at, data) VALUES (?, ?, ?, 0, ?, ?, ?)
                             ON CONFLICT (user_id, id) DO UPDATE SET rev = excluded.rev, deleted = 0, game = excluded.game, ended_at = excluded.ended_at, data = excluded.data`),
    bump: db.prepare('UPDATE user_state SET rev = ?, updated_at = ? WHERE user_id = ?'),
  };

  const isFriend = (a, b) => !!q.friends.get(a, b, b, a);
  const mainIdOf = (uid) => { try { return JSON.parse(q.state.get(uid)?.state || 'null')?.mainId ?? null; } catch { return null; } };
  function readMatch(m) {
    if (!isPlainObject(m) || !isId(m.id) || typeof m.game !== 'string' || !Array.isArray(m.playerIds) || !Array.isArray(m.sides)) throw bad('match_invalid', 'Ungültiges Spiel.');
    const data = JSON.stringify(m);
    if (data.length > MAX_MATCH) throw bad('match_too_large', 'Das Spiel ist zu groß.');
    return data;
  }
  function friendTarget(c, id) {
    if (!isId(id) || id === c.user.id) throw bad('bad_user', 'Unbekannter Spieler.');
    const u = q.user.get(id);
    if (!u) throw new HttpError(404, 'not_found', 'Diesen Spieler gibt es nicht (mehr).');
    if (!isFriend(c.user.id, u.id)) throw new HttpError(403, 'not_friends', 'Ihr seid keine Freunde.');
    return u;
  }
  function myGame(c) {
    const g = isId(c.params.id) ? q.game.get(c.params.id) : null;
    if (!g || (g.host_id !== c.user.id && g.guest_id !== c.user.id)) throw new HttpError(404, 'not_found', 'Dieses Spiel gibt es nicht (mehr).');
    return g;
  }
  const view = (g) => {
    const host = q.user.get(g.host_id), guest = q.user.get(g.guest_id);
    return { id: g.id, status: g.status, rev: g.rev, match: JSON.parse(g.data), host: host?.username, guest: guest?.username };
  };
  let lastSweep = 0;
  const sweep = () => { const now = Date.now(); if (now - lastSweep < 60e3) return; lastSweep = now; q.sweep.run(now - 864e5, now - INVITE_TTL, now - IDLE_TTL); };

  /* ---------- Online-Spiel ---------- */
  r.post('/api/games', async (c) => {
    limits.search.hit(c.user.id);
    const b = await c.json();
    const u = friendTarget(c, b.to);
    const data = readMatch(b.match);
    const pid = mainIdOf(u.id);
    if (!pid || !b.match.playerIds.includes(pid)) throw bad('match_invalid', 'Der Freund fehlt im Spiel.');
    const now = Date.now();
    tx(db, () => {
      q.cancelOld.run(now, c.user.id);                    // nur ein offenes Online-Spiel je Gastgeber
      if (q.game.get(b.match.id)) throw new HttpError(409, 'exists', 'Dieses Spiel gibt es schon.');
      q.insertGame.run(b.match.id, c.user.id, u.id, data, now, now);
    });
    c.log.info('game_invited', { other: u.id, game: b.match.game });
    return { status: 201, body: { id: b.match.id, rev: 1, status: 'invited' } };
  });

  /** Offene Einladungen an mich (fragt die App regelmäßig) */
  r.get('/api/games/inbox', (c) => {
    c.res.locals.quiet = true;
    sweep();
    return { invites: q.inbox.all(c.user.id, Date.now() - INVITE_TTL).map((x) => {
      let m = null; try { m = JSON.parse(x.data); } catch { /* */ }
      return { id: x.id, host: x.host, at: x.created_at, game: m?.game, opts: m?.opts || {} };
    }) };
  });

  r.get('/api/games/:id', (c) => {
    c.res.locals.quiet = true;
    const g = myGame(c);
    const since = Number(c.query.get('rev'));
    if (Number.isFinite(since) && since === g.rev) return { id: g.id, status: g.status, rev: g.rev, same: true };
    return view(g);
  });

  r.post('/api/games/:id/accept', (c) => {
    const g = myGame(c);
    if (g.guest_id !== c.user.id) throw new HttpError(403, 'forbidden', 'Nur der Eingeladene kann annehmen.');
    if (g.status !== 'invited' || g.created_at < Date.now() - INVITE_TTL) throw new HttpError(410, 'gone', 'Die Einladung gilt nicht mehr.');
    q.setStatus.run('active', Date.now(), g.id);
    c.log.info('game_accepted', { other: g.host_id });
    return view(q.game.get(g.id));
  });
  r.post('/api/games/:id/decline', (c) => {
    const g = myGame(c);
    if (g.status === 'invited') q.setStatus.run('declined', Date.now(), g.id);
    c.log.info('game_declined', { other: g.host_id });
    return { ok: true };
  });
  r.post('/api/games/:id/abort', (c) => {
    const g = myGame(c);
    if (g.status === 'invited' || g.status === 'active') q.setStatus.run('aborted', Date.now(), g.id);
    c.log.info('game_aborted', { game: g.id });
    return { ok: true };
  });

  /** Neuer Stand nach einer Eingabe. rev = Stand, den das Gerät kannte; passt er nicht, gibt es den aktuellen zurück (409). */
  r.put('/api/games/:id', async (c) => {
    limits.sync.hit(c.user.id);
    const g = myGame(c), b = await c.json();
    if (g.status !== 'active') throw new HttpError(409, 'not_active', g.status === 'aborted' ? 'Das Spiel wurde abgebrochen.' : 'Das Spiel läuft nicht mehr.', { game: view(g) });
    const data = readMatch(b.match);
    if (b.match.id !== g.id) throw bad('match_invalid', 'Falsches Spiel.');
    const status = b.match.done ? 'done' : 'active';
    const res = q.write.run(data, g.rev + 1, status, Date.now(), g.id, Number(b.rev));
    if (res.changes !== 1) throw new HttpError(409, 'conflict', 'Das andere Gerät war schneller.', { game: view(q.game.get(g.id)) });
    if (status === 'done') c.log.info('game_done', { game: g.id });
    return { rev: g.rev + 1, status };
  });

  /* ---------- Spiele auf fremdem Gerät bestätigen ---------- */
  r.post('/api/confirms', async (c) => {
    limits.search.hit(c.user.id);
    const b = await c.json();
    const u = friendTarget(c, b.to);
    const data = readMatch(b.match);
    const pid = mainIdOf(u.id);
    if (!pid || !b.match.playerIds.includes(pid) || !b.match.done) throw bad('match_invalid', 'Der Freund fehlt im Spiel.');
    q.confirmIns.run(randomUUID(), c.user.id, u.id, b.match.id, data, Date.now());
    c.log.info('confirm_sent', { other: u.id, game: b.match.game });
    return { status: 201, body: { ok: true } };
  });

  r.get('/api/confirms', (c) => {
    c.res.locals.quiet = true;
    return { confirms: q.confirmList.all(c.user.id).map((x) => {
      let m = null; try { m = JSON.parse(x.data); } catch { /* */ }
      return { id: x.id, sender: x.sender, at: x.created_at, match: m };
    }).filter((x) => x.match) };
  });

  /** Haken (accept: true) übernimmt das Match ins eigene Konto, sonst wird es verworfen. */
  r.post('/api/confirms/:id', async (c) => {
    const b = await c.json();
    const row = isId(c.params.id) ? q.confirmGet.get(c.params.id, c.user.id) : null;
    if (!row) throw new HttpError(404, 'not_found', 'Diese Anfrage gibt es nicht (mehr).');
    if (!b.accept) { q.confirmDel.run(row.id); c.log.info('confirm_rejected', { other: row.from_id }); return { ok: true }; }
    const m = JSON.parse(row.data), now = Date.now();
    const rev = tx(db, () => {
      const cur = q.state.get(c.user.id);
      const next = cur.rev + 1;
      q.upsertMatch.run(c.user.id, m.id, next, typeof m.game === 'string' ? m.game.slice(0, 24) : null, Number.isFinite(m.endedAt) ? m.endedAt : null, row.data);
      q.bump.run(next, now, c.user.id);
      q.confirmDel.run(row.id);
      return next;
    });
    c.log.info('confirm_accepted', { other: row.from_id, rev });
    return { ok: true, match: m };
  });
}
