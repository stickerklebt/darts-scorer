/* Konto + Datensync. Das Gerät behält alles in localStorage (Offline-Spielen geht immer), der Server ist die
   dauerhafte Ablage pro Konto. Abgleich als Delta (siehe server/src/routes/sync.js):
   - Matches einzeln über ihre id (Hash pro Match merkt sich, was der Server schon hat; Löschen wird mitgeschickt)
   - übriger Zustand (SYNC_KEYS) als Ganzes; bei Konflikt gewinnt der Server, eigene Spieler werden ergänzt.
   Meta in localStorage['darts.sync'] = { uid, user, rev, hashes: { matchId: hash }, stateHash } */
import { S, save, clearLocal, applyState, SYNC_KEYS, profile, uid, setSaveHook } from './store.js';
import { api, ApiError, apiGate } from './api.js';

const META = 'darts.sync';
const BATCH = 200;

/** Anmeldestand: user = { id, email, username, createdAt } oder null */
export const auth = { user: null, checked: false, offline: false };
/** Sync-Stand für die Anzeige: 'idle' | 'busy' | 'ok' | 'offline' | 'error' */
export const sync = { state: 'idle', at: null, msg: '' };

let onChange = () => {};
export const setOnChange = (fn) => { onChange = fn; };

/* ---------------- Meta ---------------- */
const fresh = () => ({ uid: null, user: null, rev: 0, hashes: {}, stateHash: null });
function loadMeta() { try { return { ...fresh(), ...JSON.parse(localStorage.getItem(META)) }; } catch (e) { return fresh(); } }
let meta = loadMeta();
function saveMeta() { try { localStorage.setItem(META, JSON.stringify(meta)); } catch (e) { /* */ } }

/* ---------------- Hashes ---------------- */
export function hashStr(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36) + s.length.toString(36);
}
const mHash = new WeakMap(); // Matches werden nach dem Archivieren nicht mehr verändert → Hash je Objekt merken
const hashMatch = (m) => { let h = mHash.get(m); if (!h) { h = hashStr(JSON.stringify(m)); mHash.set(m, h); } return h; };
export const pickState = (src) => Object.fromEntries(SYNC_KEYS.filter((k) => k in src).map((k) => [k, src[k]]));

/** Konflikt: Serverstand als Basis, eigene (dort unbekannte) Spieler ergänzen. */
export function mergeState(server, local) {
  const ids = new Set((server.profiles || []).map((p) => p.id));
  return { ...server, mainId: server.mainId || local.mainId, profiles: [...(server.profiles || []), ...(local.profiles || []).filter((p) => !ids.has(p.id))] };
}
/** Spieler-id in Matches/Aufstellung ersetzen (lokale Daten vor dem ersten Login → Hauptspieler des Kontos). */
export function remapPid(obj, from, to) {
  return JSON.parse(JSON.stringify(obj).split(JSON.stringify(from)).join(JSON.stringify(to)));
}

/** Hauptspieler = Kontoname. Fehlt er (neues Konto, Daten gelöscht), wird er angelegt. */
export function ensureMainProfile() {
  const u = auth.user;
  if (!u) return;
  let p = profile(S.mainId);
  if (!p) { p = { id: uid('p'), name: u.username, createdAt: Date.now() }; S.profiles.push(p); S.mainId = p.id; }
  if (p.name !== u.username) p.name = u.username;
  dropExtraProfiles();
  if (!S.lineup.length) S.lineup = [{ id: S.mainId, team: 'A' }];
}

/** Außer dem Hauptspieler gibt es keine gespeicherten Spieler mehr (Gäste nur pro Spiel, Freunde haben ein eigenes Konto).
    Alte Zweitspieler aus früheren Versionen werden entfernt – immer wieder, auch wenn ein altes Gerät sie zurückbringt.
    Ihr Name bleibt in den betroffenen Matches (m.names), damit Historie und Gegnernamen stimmen; Statistik gibt es für sie nicht. */
function dropExtraProfiles() {
  const extra = S.profiles.filter((x) => x.id !== S.mainId);
  if (!extra.length) return;
  const names = new Map(extra.map((x) => [x.id, x.name]));
  for (const m of [...S.matches, S.current].filter(Boolean)) {
    const hit = (m.playerIds || []).filter((id) => names.has(id) && !m.names?.[id]);
    if (hit.length) m.names = { ...(m.names || {}), ...Object.fromEntries(hit.map((id) => [id, names.get(id)])) };
  }
  S.profiles = S.profiles.filter((x) => x.id === S.mainId);
  S.lineup = S.lineup.filter((e) => !names.has(e.id));
  for (const k of ['statsPid', 'cmpA', 'cmpB']) if (names.has(S[k])) S[k] = S.mainId;
}

/* ---------------- Antwort einspielen ---------------- */
function applyResponse(r, sent) {
  const byId = new Map(S.matches.map((m, i) => [m.id, i]));
  let touched = false;
  for (const m of r.matches || []) {
    const i = byId.get(m.id);
    if (i === undefined) { S.matches.push(m); byId.set(m.id, S.matches.length - 1); } else S.matches[i] = m;
    meta.hashes[m.id] = hashMatch(m);
    touched = true;
  }
  if (r.removed?.length) {
    const gone = new Set(r.removed);
    S.matches = S.matches.filter((m) => !gone.has(m.id));
    for (const id of gone) delete meta.hashes[id];
    touched = true;
  }
  for (const [id, h] of sent.upsert) meta.hashes[id] = h;
  for (const id of sent.remove) delete meta.hashes[id];
  if (r.state) {
    const local = pickState(S);
    applyState(r.stateConflict || sent.merge ? mergeState(r.state, local) : r.state);
    meta.stateHash = hashStr(JSON.stringify(pickState(r.state))); // Serverstand merken → Zusammengeführtes geht beim nächsten Mal hoch
    touched = true;
  } else if (sent.stateHash) meta.stateHash = sent.stateHash;
  if (r.resync) { meta.hashes = {}; meta.stateHash = null; }
  meta.rev = r.rev;
  if (touched) {
    S.matches.sort((a, b) => (a.endedAt ?? a.startedAt ?? 0) - (b.endedAt ?? b.startedAt ?? 0));
    ensureMainProfile();
  }
  saveMeta();
  return touched || !!r.resync;
}

/* ---------------- Abgleich ---------------- */
let running = null, again = false, timer = null, retry = 0;

/** Einmal vollständig abgleichen (mehrere Pakete bei vielen Matches). */
export function syncNow() {
  if (!auth.user || auth.user.demo) return Promise.resolve(false);
  if (running) { again = true; return running; }
  clearTimeout(timer);
  running = (async () => {
    let changed = false;
    sync.state = 'busy';
    try {
      for (let guard = 0; guard < 200; guard++) {
        const local = new Map(S.matches.map((m) => [m.id, m]));
        const upsert = [];
        for (const [id, m] of local) { const h = hashMatch(m); if (meta.hashes[id] !== h) upsert.push([id, m, h]); }
        // Gelöscht wird NUR, was ausdrücklich gelöscht wurde (S.pendingRemove). Fehlt ein bekanntes Match bloß lokal
        // (alter Stand aus einem anderen Tab/Fenster), wird es nicht gelöscht, sondern vom Server neu geholt (since = 0).
        const pend = new Set(S.pendingRemove || []);
        const remove = [...pend].filter((id) => !local.has(id));
        const lost = Object.keys(meta.hashes).filter((id) => !local.has(id) && !pend.has(id));
        if (lost.length) { for (const id of lost) delete meta.hashes[id]; meta.rev = 0; }
        const stJson = JSON.stringify(pickState(S)), sh = hashStr(stJson);
        const sendState = sh !== meta.stateHash && !lost.length;
        const part = upsert.slice(0, BATCH);
        const body = { since: meta.rev };
        if (part.length) body.upsert = part.map(([, m]) => m);
        if (remove.length) body.remove = remove;
        if (sendState) body.state = JSON.parse(stJson);
        const r = await api('POST', 'api/sync', body);
        if (remove.length) { S.pendingRemove = (S.pendingRemove || []).filter((id) => !remove.includes(id)); changed = true; }
        if (applyResponse(r, { upsert: part.map(([id, , h]) => [id, h]), remove, stateHash: sendState ? sh : null })) changed = true;
        if (lost.length) { again = true; break; } // danach gleich noch ein normaler Abgleich
        if (upsert.length <= BATCH && !r.stateConflict && !r.resync) break;
      }
      sync.state = 'ok'; sync.at = Date.now(); sync.msg = ''; retry = 0; auth.offline = false;
    } catch (e) {
      handleError(e);
    } finally {
      running = null;
      if (changed) { save(); onChange(); }
      if (again) { again = false; schedule(300); }
    }
    return changed;
  })();
  return running;
}

function handleError(e) {
  console.warn('[sync]', e?.status ?? '', e?.message || e);
  if (e instanceof ApiError && e.status === 401) { sessionLost(); return; }
  const offline = e instanceof ApiError && (e.status === 0 || e.code === 'no_server');
  sync.state = offline ? 'offline' : 'error';
  sync.msg = e.message;
  auth.offline = offline;
  retry = Math.min(retry + 1, 6);
  schedule([5, 10, 30, 60, 120, 300][retry - 1] * 1000); // später erneut versuchen
}

function schedule(ms) { clearTimeout(timer); timer = setTimeout(() => { syncNow(); }, ms); }

/* Nach jedem Speichern (verzögert) abgleichen. Während des Matches seltener. */
setSaveHook(() => { if (auth.user && !running) schedule(S.screen === 'game' ? 8000 : 1500); });
document.addEventListener('visibilitychange', () => { if (auth.user) syncNow(); });
setInterval(() => { if (auth.user && document.visibilityState === 'visible') syncNow(); }, 60e3);

/* ---------------- Anmelden / Abmelden ---------------- */
function sessionLost() {
  auth.user = null; // Daten und Meta bleiben – nach erneutem Anmelden mit demselben Konto geht der Abgleich weiter
  sync.state = 'idle';
  onChange();
}

/** Start der App: gemerkte Anmeldung sofort nutzen (offline spielbar), im Hintergrund beim Server bestätigen. */
export async function bootAuth() {
  if (S.simUser) { clearLocal(); save(); } // simulierter Nutzer lebt nur bis zum Neuladen
  if (meta.uid && meta.user) { auth.user = meta.user; ensureMainProfile(); }
  try {
    const r = await api('GET', 'api/me');
    if (meta.uid && meta.uid !== r.user.id) { await login(r.user); return; }
    if (!meta.uid) { await login(r.user); return; }
    auth.user = meta.user = r.user; saveMeta(); ensureMainProfile();
    auth.checked = true; auth.offline = false;
    onChange();
    syncNow();
  } catch (e) {
    auth.checked = true;
    if (e instanceof ApiError && e.status === 401) { auth.user = null; onChange(); return; }
    auth.offline = true; sync.state = 'offline'; sync.msg = e.message;
    onChange();
  }
}

/** Nach erfolgreichem Login/Registrieren. Erste Anmeldung auf diesem Gerät übernimmt vorhandene lokale Spiele ins Konto. */
export async function login(user) {
  if (meta.uid && meta.uid !== user.id) { clearLocal(); meta = fresh(); } // Daten eines anderen Kontos nicht vermischen
  const first = meta.uid !== user.id || !meta.rev;
  meta.uid = user.id; meta.user = user; saveMeta();
  auth.user = user; auth.checked = true;
  if (first) {
    try {
      // Erst nur holen: Hat das Konto schon einen Hauptspieler? Dann eigene lokale Spiele auf ihn umschreiben.
      const r = await api('POST', 'api/sync', { since: 0 });
      const srvMain = r.state?.mainId;
      if (srvMain && S.mainId && srvMain !== S.mainId) {
        const old = S.mainId;
        S.matches = S.matches.map((m) => (m.playerIds?.includes(old) ? remapPid(m, old, srvMain) : m));
        S.lineup = remapPid(S.lineup, old, srvMain);
        S.profiles = S.profiles.filter((p) => p.id !== old);
        S.mainId = srvMain;
      }
      applyResponse(r, { upsert: [], remove: [], stateHash: null, merge: S.matches.length > 0 || S.profiles.length > 0 });
    } catch (e) { handleError(e); }
  }
  ensureMainProfile();
  save();
  onChange();
  await syncNow();
}

/** Abmelden: vorher sichern; lokale Daten werden vom Gerät entfernt (geteilte Geräte). */
export async function logout(force = false) {
  if (auth.user?.demo) { endDemo(); return true; }
  if (!force) {
    await syncNow();
    if (sync.state !== 'ok') return false;
  }
  try { await api('POST', 'api/auth/logout', {}); } catch (e) { /* offline: Cookie läuft ab */ }
  clearTimeout(timer);
  clearLocal();
  meta = fresh(); saveMeta();
  auth.user = null; sync.state = 'idle';
  onChange();
  return true;
}

/** Nach Konto-Löschung: alles lokal entfernen. */
export function forget() {
  clearTimeout(timer);
  clearLocal();
  meta = fresh(); saveMeta();
  auth.user = null; sync.state = 'idle';
}

/** Name im Konto geändert → Meta und Hauptspieler anpassen. */
export function setUser(user) {
  auth.user = meta.user = user; saveMeta();
  ensureMainProfile();
}

/** „Nutzer simulieren“: Demo-Spieler nur auf diesem Gerät (kein Konto, kein Sync, keine Server-Aufrufe).
    Beenden über Abmelden oder Neuladen – dann ist alles wieder weg. */
export const storedAccount = () => !!meta.uid; // abgelaufene Anmeldung mit Daten auf dem Gerät → kein Demo (würde sie löschen)
export function startDemo(name, makeMatches) {
  if (meta.uid) return false;
  clearLocal();
  const mainId = uid('p');
  S.mainId = mainId;
  S.profiles = [{ id: mainId, name, createdAt: Date.now() - 366 * 864e5 }];
  S.matches = makeMatches(mainId);
  S.simUser = true;
  auth.user = { id: 'demo', username: name, demo: true }; auth.checked = true; auth.offline = false;
  apiGate.demo = true;
  save(); onChange();
  return true;
}
export function endDemo() {
  clearTimeout(timer);
  clearLocal(); save();
  apiGate.demo = false;
  auth.user = null; sync.state = 'idle';
  onChange();
}
