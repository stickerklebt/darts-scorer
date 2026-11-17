/* Sitzungen: zufälliges Token im HttpOnly-Cookie, in der DB nur als SHA-256-Hash. Gleitende Laufzeit. */
import { randomBytes, createHash } from 'node:crypto';
import { cookie, parseCookies, isHttps } from './http.js';

export const COOKIE = 'darts_sid';
const DAY = 864e5;
const sha = (t) => createHash('sha256').update(t).digest('hex');

export function createSessions(db, config) {
  const ttl = config.sessionDays * DAY;
  const q = {
    insert: db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at, last_seen) VALUES (?, ?, ?, ?, ?)'),
    find: db.prepare(`SELECT s.token_hash, s.expires_at, s.last_seen, u.id, u.email, u.username, u.created_at
                      FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?`),
    touch: db.prepare('UPDATE sessions SET last_seen = ?, expires_at = ? WHERE token_hash = ?'),
    del: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
    delUser: db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?'),
    sweep: db.prepare('DELETE FROM sessions WHERE expires_at <= ?'),
  };
  const secure = (req) => (config.cookieSecure === 'auto' ? isHttps(req, config.trustProxy) : config.cookieSecure);
  const setCookie = (req, res, token, maxAgeMs) => res.setHeader('Set-Cookie', cookie(COOKIE, token, { maxAge: maxAgeMs / 1000, secure: secure(req) }));

  return {
    /** Neue Sitzung anlegen und Cookie setzen. */
    start(req, res, userId) {
      const token = randomBytes(32).toString('base64url'), now = Date.now();
      q.insert.run(sha(token), userId, now, now + ttl, now);
      setCookie(req, res, token, ttl);
    },
    /** Angemeldeten Nutzer zur Anfrage holen (oder null). Verlängert die Sitzung höchstens einmal pro Tag. */
    user(req, res) {
      const token = parseCookies(req.headers.cookie)[COOKIE];
      if (!token || token.length > 100) return null;
      const now = Date.now(), h = sha(token);
      const row = q.find.get(h, now);
      if (!row) return null;
      if (now - row.last_seen > DAY) { q.touch.run(now, now + ttl, h); setCookie(req, res, token, ttl); }
      return { id: row.id, email: row.email, username: row.username, createdAt: row.created_at, sessionHash: h };
    },
    end(req, res) {
      const token = parseCookies(req.headers.cookie)[COOKIE];
      if (token) q.del.run(sha(token));
      res.setHeader('Set-Cookie', cookie(COOKIE, '', { maxAge: 0, secure: secure(req) }));
    },
    /** Alle anderen Sitzungen des Nutzers beenden (z. B. nach Passwortänderung). */
    endOthers(userId, keepHash) { q.delUser.run(userId, keepHash); },
    sweep() { return q.sweep.run(Date.now()).changes; },
  };
}
