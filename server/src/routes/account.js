/* Eigenes Konto: anzeigen, Namen ändern, Passwort ändern, Konto löschen. */
import { HttpError, bad } from '../http.js';
import { hashPassword, verifyPassword } from '../passwords.js';
import { checkUsername, checkPassword } from '../validate.js';
import { publicUser } from './auth.js';

export function accountRoutes(r, { db, sessions, config }) {
  const q = {
    hash: db.prepare('SELECT pw_hash FROM users WHERE id = ?'),
    byKey: db.prepare('SELECT id FROM users WHERE username_key = ?'),
    rename: db.prepare('UPDATE users SET username = ?, username_key = ?, updated_at = ? WHERE id = ?'),
    setHash: db.prepare('UPDATE users SET pw_hash = ?, updated_at = ? WHERE id = ?'),
    del: db.prepare('DELETE FROM users WHERE id = ?'),
  };
  const needPassword = async (c, pw) => {
    if (typeof pw !== 'string' || !(await verifyPassword(pw, q.hash.get(c.user.id).pw_hash))) throw new HttpError(403, 'bad_password', 'Das Passwort stimmt nicht.');
  };

  r.get('/api/me', (c) => ({ user: publicUser(c.user) }));

  r.patch('/api/me', async (c) => {
    const { name, key } = checkUsername((await c.json()).username);
    const row = q.byKey.get(key);
    if (row && row.id !== c.user.id) throw new HttpError(409, 'username_taken', `„${name}“ ist schon vergeben.`);
    try { q.rename.run(name, key, Date.now(), c.user.id); } catch (e) {
      if (/UNIQUE/.test(e.message)) throw new HttpError(409, 'username_taken', `„${name}“ ist schon vergeben.`);
      throw e;
    }
    return { user: publicUser({ ...c.user, username: name }) };
  });

  r.post('/api/me/password', async (c) => {
    const b = await c.json();
    await needPassword(c, b.current);
    const next = checkPassword(b.next, c.user.email);
    if (next === b.current) throw bad('password_same', 'Das neue Passwort ist dasselbe wie das alte.');
    q.setHash.run(await hashPassword(next, config.scryptLogN), Date.now(), c.user.id);
    sessions.endOthers(c.user.id, c.user.sessionHash); // andere Geräte abmelden
    return { ok: true };
  });

  /** Konto endgültig löschen (DSGVO): Spieldaten, Sitzungen und Freundschaften gehen per ON DELETE CASCADE mit. */
  r.delete('/api/me', async (c) => {
    await needPassword(c, (await c.json()).password);
    q.del.run(c.user.id);
    sessions.end(c.req, c.res);
    c.log.info('user_deleted', { user: c.user.id });
    return { ok: true };
  });
}
