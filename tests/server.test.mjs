import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { openDb } from '../server/src/db.js';
import { createApp } from '../server/src/app.js';
import { loadConfig } from '../server/src/config.js';
import { createLogger, anonIp } from '../server/src/log.js';
import { hashPassword, verifyPassword } from '../server/src/passwords.js';
import { checkUsername } from '../server/src/validate.js';
import { createMatch } from '../js/match.js';
import * as X from '../js/x01.js';

/* Server mit In-Memory-DB auf freiem Port; schnelles scrypt nur für Tests */
async function boot(over = {}) {
  const config = loadConfig({}, { scryptLogN: 10, logRequests: false, authRatePerMin: 1000, ...over });
  const db = openDb(':memory:');
  const logs = [];
  const app = createApp({ config, db, log: createLogger({ level: 'debug', sink: (e) => logs.push(e) }) });
  const srv = createServer(app.handler);
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${srv.address().port}`;
  return { base, db, logs, stop: () => new Promise((ok) => { app.close(); srv.close(() => { db.close(); ok(); }); }) };
}

/** Kleiner Client mit Cookie-Speicher (wie ein Browser) */
function client(base) {
  let jar = '';
  return async (method, path, body, headers = {}) => {
    const res = await fetch(base + path, {
      method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(jar ? { Cookie: jar } : {}), ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const sc = res.headers.get('set-cookie');
    if (sc) { const v = sc.split(';')[0]; jar = v.endsWith('=') ? '' : v; }
    const text = await res.text();
    return { status: res.status, body: text && res.headers.get('content-type')?.includes('json') ? JSON.parse(text) : text, headers: res.headers };
  };
}

const register = (api, email, username, password = 'geheim123') => api('POST', '/api/auth/register', { email, username, password });

function match501(pid, opp, now) {
  const m = createMatch('x01', [[pid], [opp]], { start: 501, out: 'double', mode: 'legs', target: 1 }, 0, now);
  X.submitSum(m, 180); X.submitSum(m, 60); X.submitSum(m, 180); X.submitSum(m, 60);
  X.throwDart(m, 20, 3); X.throwDart(m, 19, 3); X.throwDart(m, 12, 2);
  m.endedAt = now;
  return m;
}

test('Passwort: scrypt-Hash prüft richtig/falsch', async () => {
  const h = await hashPassword('richtig-123', 10);
  assert.match(h, /^scrypt\$10\$8\$1\$/);
  assert.equal(await verifyPassword('richtig-123', h), true);
  assert.equal(await verifyPassword('falsch-123', h), false);
});

test('Name: Regeln, reservierte Namen (Bots), Groß/Klein', () => {
  assert.equal(checkUsername('  Lasse_99 ').key, 'lasse_99');
  assert.throws(() => checkUsername('ab'), /mindestens/);
  assert.throws(() => checkUsername('mit leer'), /Erlaubt/);
  assert.throws(() => checkUsername('Shrek'), /reserviert/);
  assert.equal(checkUsername('Jörg.Ü').name, 'Jörg.Ü');
});

test('Anmeldung: E-Mail-Schritt, Registrieren, Name eindeutig, Login, Logout', async () => {
  const s = await boot();
  try {
    const a = client(s.base), b = client(s.base);
    assert.deepEqual((await a('POST', '/api/auth/email', { email: 'A@Test.de ' })).body, { exists: false });
    assert.equal((await a('GET', '/api/me')).status, 401);
    const r = await register(a, 'A@Test.de', 'Anna');
    assert.equal(r.status, 201);
    assert.equal(r.body.user.email, 'a@test.de');
    assert.match(r.headers.get('set-cookie'), /HttpOnly/);
    assert.equal((await a('GET', '/api/me')).body.user.username, 'Anna');
    assert.deepEqual((await b('POST', '/api/auth/email', { email: 'a@test.de' })).body, { exists: true });
    // Name schon vergeben (Groß/Klein egal), E-Mail schon vergeben
    assert.equal((await register(b, 'b@test.de', 'ANNA')).status, 409);
    assert.equal((await register(b, 'a@test.de', 'Berta')).status, 409);
    assert.equal((await b('GET', '/api/auth/username?name=anna')).body.available, false);
    assert.equal((await b('GET', '/api/auth/username?name=Berta')).body.available, true);
    // Zu kurzes Passwort
    assert.equal((await b('POST', '/api/auth/register', { email: 'b@test.de', username: 'Berta', password: 'kurz' })).status, 400);
    // Login
    assert.equal((await b('POST', '/api/auth/login', { email: 'a@test.de', password: 'falsch!!' })).status, 401);
    assert.equal((await b('POST', '/api/auth/login', { email: 'a@test.de', password: 'geheim123' })).status, 200);
    assert.equal((await b('GET', '/api/me')).body.user.username, 'Anna');
    await b('POST', '/api/auth/logout', {});
    assert.equal((await b('GET', '/api/me')).status, 401);
    assert.equal((await a('GET', '/api/me')).status, 200); // andere Sitzung bleibt
  } finally { await s.stop(); }
});

test('Sicherheit: JSON-Pflicht, fremde Herkunft, Rate-Limit, keine Serverdateien', async () => {
  const s = await boot({ authRatePerMin: 3 });
  try {
    const a = client(s.base);
    const form = await fetch(`${s.base}/api/auth/email`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'email=x' });
    assert.equal(form.status, 415);
    assert.equal((await a('POST', '/api/auth/email', { email: 'x@y.de' }, { Origin: 'https://boese.example' })).status, 403);
    for (let i = 0; i < 3; i++) await a('POST', '/api/auth/email', { email: 'x@y.de' });
    const limited = await a('POST', '/api/auth/email', { email: 'x@y.de' });
    assert.equal(limited.status, 429);
    assert.ok(limited.headers.get('retry-after'));
    for (const p of ['/server/src/app.js', '/tests/run.mjs', '/.git/config', '/js/../server/src/db.js', '/CLAUDE.md', '/package.json']) {
      assert.equal((await fetch(s.base + p)).status, 404, p);
    }
    const idx = await fetch(`${s.base}/`);
    assert.equal(idx.status, 200);
    assert.match(idx.headers.get('content-security-policy'), /default-src 'self'/);
    assert.equal((await fetch(`${s.base}/js/stats.js`)).status, 200);
    assert.equal((await fetch(`${s.base}/healthz`)).status, 200);
  } finally { await s.stop(); }
});

test('Hinter dem Proxy: Secure-Cookie und HSTS nur bei X-Forwarded-Proto https, Client-IP aus X-Forwarded-For', async () => {
  const s = await boot({ authRatePerMin: 2 });
  try {
    const plain = await client(s.base)('POST', '/api/auth/register', { email: 'p@x.de', username: 'Paula', password: 'geheim123' });
    assert.doesNotMatch(plain.headers.get('set-cookie'), /Secure/);
    const https = await client(s.base)('POST', '/api/auth/register', { email: 'q@x.de', username: 'Quentin', password: 'geheim123' }, { 'X-Forwarded-Proto': 'https' });
    assert.match(https.headers.get('set-cookie'), /Secure/);
    assert.match(https.headers.get('strict-transport-security'), /max-age/);
    // Rate-Limit je echter Client-IP (erster Eintrag), nicht je Proxy-Adresse
    const other = await client(s.base)('POST', '/api/auth/email', { email: 'z@x.de' }, { 'X-Forwarded-For': '203.0.113.9, 10.0.0.1' });
    assert.equal(other.status, 200);
  } finally { await s.stop(); }
});

test('Sync: hochladen, zweites Gerät bekommt Delta, Löschen, Zustandskonflikt', async () => {
  const s = await boot();
  try {
    const d1 = client(s.base);
    await register(d1, 'c@test.de', 'Carl');
    const d2 = client(s.base);
    await d2('POST', '/api/auth/login', { email: 'c@test.de', password: 'geheim123' });
    const m1 = match501('p1', 'p2', Date.now());
    let r = await d1('POST', '/api/sync', { since: 0, upsert: [m1], state: { mainId: 'p1', profiles: [{ id: 'p1', name: 'Carl' }] } });
    assert.equal(r.status, 200);
    assert.equal(r.body.rev, 1);
    assert.equal(r.body.matches.length, 0); // eigene Änderung kommt nicht zurück
    // Gerät 2 holt alles
    r = await d2('POST', '/api/sync', { since: 0 });
    assert.equal(r.body.matches.length, 1);
    assert.equal(r.body.state.mainId, 'p1');
    // Gerät 2 löscht, Gerät 1 bekommt den Grabstein
    r = await d2('POST', '/api/sync', { since: 1, remove: [m1.id] });
    assert.equal(r.body.rev, 2);
    r = await d1('POST', '/api/sync', { since: 1 });
    assert.deepEqual(r.body.removed, [m1.id]);
    // Zustandskonflikt: Gerät 1 kennt rev 2, Gerät 2 ändert Zustand, Gerät 1 schickt veralteten Zustand
    await d2('POST', '/api/sync', { since: 2, state: { mainId: 'p1', profiles: [{ id: 'p1', name: 'Carl' }, { id: 'p9', name: 'Gast' }] } });
    r = await d1('POST', '/api/sync', { since: 2, state: { mainId: 'p1', profiles: [{ id: 'p1', name: 'Carl' }] } });
    assert.equal(r.body.stateConflict, true);
    assert.equal(r.body.state.profiles.length, 2);
    // Ungültige Daten
    assert.equal((await d1('POST', '/api/sync', { upsert: [{ id: '../x' }] })).status, 400);
  } finally { await s.stop(); }
});

test('Freunde: suchen, anfragen, annehmen, Statistik nur für Freunde, entfernen', async () => {
  const s = await boot();
  try {
    const a = client(s.base), b = client(s.base), c = client(s.base);
    const ua = (await register(a, 'a@f.de', 'Anton')).body.user;
    const ub = (await register(b, 'b@f.de', 'Bruno')).body.user;
    await register(c, 'c@f.de', 'Brunhilde');
    // Bruno hat ein 501-Match gespielt
    await b('POST', '/api/sync', { since: 0, upsert: [match501('pb', 'gast', Date.now())], state: { mainId: 'pb', profiles: [{ id: 'pb', name: 'Bruno' }] } });

    const found = (await a('GET', '/api/users/search?q=bru')).body.users;
    assert.deepEqual(found.map((u) => u.username), ['Bruno', 'Brunhilde']);
    assert.equal(found[0].relation, 'none');
    assert.equal((await a('GET', '/api/users/search?q=anton')).body.users.length, 0); // sich selbst nicht

    assert.equal((await a('GET', `/api/friends/${ub.id}`)).status, 403);
    assert.equal((await a('POST', '/api/friends', { username: 'bruno' })).body.status, 'outgoing');
    assert.equal((await a('POST', '/api/friends', { username: 'niemand' })).status, 404);
    let fb = (await b('GET', '/api/friends')).body;
    assert.equal(fb.incoming[0].username, 'Anton');
    assert.equal((await b('POST', `/api/friends/${ua.id}/accept`, {})).body.status, 'friend');

    const fa = (await a('GET', '/api/friends')).body;
    assert.equal(fa.friends[0].username, 'Bruno');
    assert.equal(fa.friends[0].avg, 167);
    const prof = (await a('GET', `/api/friends/${ub.id}`)).body;
    assert.equal(prof.stats.x501.avg, 167);
    assert.equal(prof.stats.x501.highestCo, 141);
    assert.equal(prof.stats.x501.counts.t180, 2);
    assert.equal(prof.stats.total, 1);
    assert.ok(!JSON.stringify(prof).includes('gast')); // keine Mitspieler-Daten

    // Gegenseitige Anfrage wird direkt Freundschaft
    const uc = (await c('GET', '/api/me')).body.user;
    await c('POST', '/api/friends', { username: 'Anton' });
    assert.equal((await a('POST', '/api/friends', { username: 'Brunhilde' })).body.status, 'friend');
    assert.equal((await a('GET', `/api/friends/${uc.id}`)).status, 200);

    // Entfernen
    await b('DELETE', `/api/friends/${ua.id}`);
    assert.equal((await a('GET', `/api/friends/${ub.id}`)).status, 403);
  } finally { await s.stop(); }
});

test('Konto: Name ändern, Passwort ändern, löschen', async () => {
  const s = await boot();
  try {
    const a = client(s.base), a2 = client(s.base);
    await register(a, 'd@k.de', 'Dora');
    await register(client(s.base), 'e@k.de', 'Emil');
    await a2('POST', '/api/auth/login', { email: 'd@k.de', password: 'geheim123' });
    assert.equal((await a('PATCH', '/api/me', { username: 'emil' })).status, 409);
    assert.equal((await a('PATCH', '/api/me', { username: 'DORA' })).body.user.username, 'DORA');
    assert.equal((await a('POST', '/api/me/password', { current: 'falsch', next: 'neues-pw-1' })).status, 403);
    assert.equal((await a('POST', '/api/me/password', { current: 'geheim123', next: 'neues-pw-1' })).status, 200);
    assert.equal((await a2('GET', '/api/me')).status, 401); // anderes Gerät abgemeldet
    assert.equal((await a('DELETE', '/api/me', { password: 'neues-pw-1' })).status, 200);
    assert.equal((await client(s.base)('POST', '/api/auth/email', { email: 'd@k.de' })).body.exists, false);
    assert.equal(s.db.prepare('SELECT COUNT(*) AS n FROM user_state').get().n, 1);
  } finally { await s.stop(); }
});

/** Minimales gültiges WAV (Mono, 8 kHz, n Samples Stille) */
function wav(n = 800) {
  const b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(8000, 24); b.writeUInt32LE(16000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  return b;
}

test('Eigener Caller: Ansage hochladen, auflisten, abrufen, löschen; nur WAV, nur eigene', async () => {
  const s = await boot();
  try {
    const a = client(s.base), b = client(s.base);
    await register(a, 'call@x.de', 'Caller');
    await register(b, 'other@x.de', 'Andere');
    // Rohes PUT mit Cookie: Cookie über einen Login-Request holen
    const login = await fetch(`${s.base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'call@x.de', password: 'geheim123' }) });
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const put = (score, body, type = 'audio/wav') => fetch(`${s.base}/api/calls/${score}`, { method: 'PUT', headers: { 'Content-Type': type, Cookie: cookie }, body });
    assert.equal((await put(180, wav())).status, 200);
    assert.equal((await put(181, wav())).status, 400);
    assert.equal((await put(60, Buffer.from('kein wav hier, nur text....................................'))).status, 400);
    assert.equal((await put(60, wav(), 'audio/webm')).status, 415);
    assert.equal((await put(60, Buffer.alloc(500 * 1024))).status, 413);
    const list = await (await fetch(`${s.base}/api/calls`, { headers: { Cookie: cookie } })).json();
    assert.deepEqual(list.calls.map((c) => c.score), [180]);
    const got = await fetch(`${s.base}/api/calls/180`, { headers: { Cookie: cookie } });
    assert.equal(got.headers.get('content-type'), 'audio/wav');
    assert.equal(Buffer.from(await got.arrayBuffer()).toString('ascii', 0, 4), 'RIFF');
    assert.equal((await b('GET', '/api/calls')).body.calls.length, 0); // andere sehen sie nicht
    assert.equal((await b('GET', '/api/calls/180')).status, 404);
    assert.equal((await fetch(`${s.base}/api/calls/180`, { method: 'DELETE', headers: { Cookie: cookie } })).status, 200);
    assert.equal((await fetch(`${s.base}/api/calls/180`, { headers: { Cookie: cookie } })).status, 404);
  } finally { await s.stop(); }
});

test('Logger: Stufen, feste Felder, Fehler mit Stack, gekürzte IP', () => {
  const out = [];
  const log = createLogger({ level: 'info', sink: (e) => out.push(e) });
  log.debug('leise'); log.info('laut', { a: 1, b: undefined });
  log.child({ rid: 'abc' }).error('kaputt', { e: new Error('Boom') });
  assert.deepEqual(out.map((e) => e.msg), ['laut', 'kaputt']);
  assert.equal('b' in out[0], false);
  assert.equal(out[1].rid, 'abc');
  assert.equal(out[1].err, 'Boom');
  assert.match(out[1].stack, /Error: Boom/);
  assert.equal(anonIp('203.0.113.77'), '203.0.113.0');
  assert.equal(anonIp('::ffff:10.1.2.3'), '10.1.2.0');
  assert.equal(anonIp('2001:db8:abcd:12::1'), '2001:db8:abcd::');
});

test('Logging im Server: Request-ID, Anmelde-Ereignisse ohne E-Mail/Passwort, App-Fehler', async () => {
  const s = await boot({ logRequests: true });
  try {
    const a = client(s.base);
    const r = await register(a, 'log@x.de', 'Logger');
    assert.match(r.headers.get('x-request-id'), /^[0-9a-f]{16}$/);
    // eigene Request-ID vom Proxy wird übernommen
    const own = await fetch(`${s.base}/api/auth/email`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Request-Id': 'proxy-id-12345' }, body: '{"email":"x@y.de"}' });
    assert.equal(own.headers.get('x-request-id'), 'proxy-id-12345');
    await a('POST', '/api/auth/login', { email: 'log@x.de', password: 'falsch!!!' });
    await a('POST', '/api/auth/login', { email: 'log@x.de', password: 'geheim123' });
    await a('POST', '/api/sync', { since: 0 });                       // Leer-Abgleich → nur debug
    assert.equal((await a('POST', '/api/client-log', { kind: 'error', msg: 'x is undefined', src: '/js/main.js', line: 12 })).status, 200);
    await new Promise((ok) => setTimeout(ok, 30)); // Anfrage-Zeilen entstehen beim „finish“ der Antwort
    const msgs = s.logs.map((e) => `${e.level}:${e.msg}`);
    for (const m of ['info:user_registered', 'warn:login_failed', 'info:login', 'debug:sync', 'warn:client_error']) assert.ok(msgs.includes(m), m);
    const failed = s.logs.find((e) => e.msg === 'login_failed');
    assert.equal(failed.reason, 'bad_password');
    const req401 = s.logs.find((e) => e.msg === 'req' && e.s === 401);
    assert.equal(req401.level, 'warn');
    assert.equal(req401.err, 'bad_credentials');
    assert.ok(s.logs.every((e) => e.rid || e.msg === 'db_migrated'), 'jede Anfrage-Zeile hat eine rid');
    const all = JSON.stringify(s.logs);
    assert.ok(!all.includes('log@x.de') && !all.includes('geheim123') && !all.includes('darts_sid'), 'keine E-Mail, kein Passwort, kein Cookie');
    // statische Dateien erzeugen keine Logzeilen (außer bei Fehlern)
    const n = s.logs.length;
    await fetch(`${s.base}/js/stats.js`);
    await new Promise((ok) => setTimeout(ok, 20));
    assert.equal(s.logs.length, n);
  } finally { await s.stop(); }
});
