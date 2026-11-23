/* Anmeldung: E-Mail oder Namen prüfen → Anmelden (Passwort) oder Registrieren (nur mit E-Mail: Passwort festlegen + eindeutiger Name). */
import { randomUUID } from 'node:crypto';
import { HttpError } from '../http.js';
import { tx } from '../db.js';
import { hashPassword, verifyPassword, needsRehash } from '../passwords.js';
import { normEmail, checkUsername, checkPassword } from '../validate.js';

export const publicUser = (u) => ({ id: u.id, email: u.email, username: u.username, createdAt: u.createdAt ?? u.created_at });

export function authRoutes(r, { db, sessions, config, limits }) {
  const q = {
    byEmail: db.prepare('SELECT id, email, username, pw_hash, created_at FROM users WHERE email = ?'),
    byKey: db.prepare('SELECT id FROM users WHERE username_key = ?'),
    byName: db.prepare('SELECT id, email, username, pw_hash, created_at FROM users WHERE username_key = ?'),
    insertUser: db.prepare('INSERT INTO users (id, email, username, username_key, pw_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'),
    insertState: db.prepare('INSERT INTO user_state (user_id, rev, state, state_rev, updated_at) VALUES (?, 0, NULL, 0, ?)'),
    setHash: db.prepare('UPDATE users SET pw_hash = ?, updated_at = ? WHERE id = ?'),
  };
  // Für gleiche Antwortzeit bei unbekannter E-Mail (kein Timing-Leck)
  const dummy = hashPassword('dummy-password-for-timing', config.scryptLogN);

  /** Anmelden geht mit E-Mail ODER Namen (ohne „@“ = Name, Groß/Klein egal). Namen sind ohnehin öffentlich (Freundessuche). */
  const isName = (v) => typeof v === 'string' && !v.includes('@');
  const nameKey = (v) => String(v || '').trim().toLowerCase().slice(0, 40);

  /** Schritt 1: Gibt es zu dieser E-Mail (bzw. diesem Namen) schon ein Konto? (→ Anmelden oder Registrieren) */
  r.post('/api/auth/email', async (c) => {
    limits.auth.hit(c.ip);
    const v = (await c.json()).email;
    if (isName(v)) {
      if (!nameKey(v)) throw new HttpError(400, 'login_empty', 'Bitte E-Mail oder Namen eingeben.');
      return { exists: !!q.byName.get(nameKey(v)), byName: true };
    }
    const email = normEmail(v);
    return { exists: !!q.byEmail.get(email) };
  }, { public: true });

  /** Live-Prüfung eines Namens beim Tippen (frei? gültig?). Eigener Name gilt als frei. */
  r.get('/api/auth/username', (c) => {
    limits.auth.hit(c.ip);
    try {
      const { name, key } = checkUsername(c.query.get('name'));
      const row = q.byKey.get(key);
      const taken = !!row && row.id !== c.user?.id;
      return { available: !taken, name, reason: taken ? `„${name}“ ist schon vergeben.` : null };
    } catch (e) {
      if (e.status === 400) return { available: false, reason: e.message };
      throw e;
    }
  }, { public: true });

  r.post('/api/auth/register', async (c) => {
    limits.auth.hit(c.ip);
    const b = await c.json();
    const email = normEmail(b.email);
    const password = checkPassword(b.password, email);
    const { name, key } = checkUsername(b.username);
    if (q.byEmail.get(email)) throw new HttpError(409, 'email_taken', 'Zu dieser E-Mail gibt es schon ein Konto. Bitte anmelden.');
    if (q.byKey.get(key)) throw new HttpError(409, 'username_taken', `„${name}“ ist schon vergeben.`);
    const hash = await hashPassword(password, config.scryptLogN);
    const id = randomUUID(), now = Date.now();
    try {
      tx(db, () => { q.insertUser.run(id, email, name, key, hash, now, now); q.insertState.run(id, now); });
    } catch (e) {
      // Wettlauf: zwischen Prüfung und Einfügen hat jemand anderes dieselbe E-Mail/denselben Namen genommen
      if (/UNIQUE constraint failed: users\.email/.test(e.message)) throw new HttpError(409, 'email_taken', 'Zu dieser E-Mail gibt es schon ein Konto.');
      if (/UNIQUE constraint failed: users\.username_key/.test(e.message)) throw new HttpError(409, 'username_taken', `„${name}“ ist schon vergeben.`);
      throw e;
    }
    sessions.start(c.req, c.res, id);
    c.log.info('user_registered', { u: id });
    return { status: 201, body: { user: publicUser({ id, email, username: name, createdAt: now }) } };
  }, { public: true });

  r.post('/api/auth/login', async (c) => {
    limits.auth.hit(c.ip);
    const b = await c.json();
    const byName = isName(b.email);
    const email = byName ? nameKey(b.email) : normEmail(b.email); // bei Namen: der kleingeschriebene Name als Schlüssel
    const password = typeof b.password === 'string' ? b.password.slice(0, 256) : '';
    limits.login.hit(`${c.ip}|${email}`);
    const u = byName ? q.byName.get(email) : q.byEmail.get(email);
    const ok = u ? await verifyPassword(password, u.pw_hash) : (await verifyPassword(password, await dummy), false);
    if (!ok) {
      c.log.warn('login_failed', { reason: u ? 'bad_password' : 'unknown_account', target: u?.id });
      throw new HttpError(401, 'bad_credentials', byName ? 'Name oder Passwort ist falsch.' : 'E-Mail oder Passwort ist falsch.');
    }
    limits.login.reset(`${c.ip}|${email}`);
    if (needsRehash(u.pw_hash, config.scryptLogN)) q.setHash.run(await hashPassword(password, config.scryptLogN), Date.now(), u.id);
    sessions.start(c.req, c.res, u.id);
    c.log.info('login', { u: u.id });
    return { user: publicUser(u) };
  }, { public: true });

  r.post('/api/auth/logout', (c) => { sessions.end(c.req, c.res); if (c.user) c.log.info('logout'); return { ok: true }; }, { public: true });
}
