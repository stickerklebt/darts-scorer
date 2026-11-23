/* Persistenter Zustand (localStorage), Profile, UI-Zustand. */
import { bot, BOTS } from './bots.js';

const KEY = 'darts.v3';
const OLD_KEYS = ['dartscorer.v1', 'dartscorer.v2'];

const DEF = () => ({
  version: 3,
  mainId: null,
  profiles: [],                 // { id, name, createdAt }
  matches: [],                  // abgeschlossene Matches
  current: null,                // laufendes Match
  lineup: [],                   // [{ id, team }]
  teamMode: false,
  demoSeeded: false,            // Testdaten wurden schon einmal eingefügt
  anwurf: 'list',               // 'list' = wer oben steht, fängt an · 'bull' = Ausbullen
  opts: {
    x01: { start: 501, out: 'double', mode: 'legs', target: 2 },
    highscore: { rounds: 10 },
    shanghai: { rounds: 7 },
    halveit: {},
    atc: { bull: 1 },
    cricket: { mode: 'points', rounds: 20 },
    football: { goal: 16, target: 3 },
  },
  prefs: { voice: false, hints: true, dartInput: 'board', anim: true, ownCalls: true, showAvg: true, showDarts: true, camAuto: true, camPlay: true, camDebug: false },
  screen: 'home',
  tab: 'play',
  statsPid: null,
  statsPeriod: 'all',
  statsSub: 'overview',
  cmpA: null,
  cmpB: null,
  game: 'x01',
});

function load() {
  try { for (const k of OLD_KEYS) localStorage.removeItem(k); } catch (e) { /* */ }
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && d.version === 3) {
      const def = DEF();
      return { ...def, ...d, opts: Object.fromEntries(Object.keys(def.opts).map((k) => [k, { ...def.opts[k], ...(d.opts?.[k] || {}) }])), prefs: { ...def.prefs, ...d.prefs } };
    }
  } catch (e) { /* */ }
  return DEF();
}

/** Der gesamte gespeicherte Zustand. Wird nur verändert, nie ersetzt. */
export const S = load();
/** Flüchtiger UI-Zustand (nicht gespeichert). */
export const ui = { entry: '', mult: 1, modal: null, toast: null, moment: null, tabFrom: null, moreOpen: false };

let saveHook = null;
/** Wird nach jedem Speichern aufgerufen (Sync zum Server, siehe sync.js). */
export const setSaveHook = (fn) => { saveHook = fn; };
export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* privater Modus */ }
  if (saveHook) saveHook();
}
/** Lokale Daten dieses Geräts komplett leeren (Abmelden, anderes Konto). Keine Testdaten nachladen. */
export function clearLocal() {
  try { localStorage.removeItem(KEY); } catch (e) { /* */ }
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, DEF());
  S.demoSeeded = true;
  S.cleanV = 1;
}
/** Spielstand-Teile, die mit dem Konto synchronisiert werden (Matches laufen getrennt, UI-Zustand bleibt lokal). */
export const SYNC_KEYS = ['version', 'mainId', 'profiles', 'lineup', 'teamMode', 'anwurf', 'opts', 'prefs', 'demoSeeded', 'cleanV'];
/** Zustand vom Server übernehmen (Einstellungen mit Standardwerten auffüllen). */
export function applyState(st) {
  const def = DEF();
  for (const k of SYNC_KEYS) {
    if (!(k in st)) continue;
    if (k === 'opts') S.opts = Object.fromEntries(Object.keys(def.opts).map((g) => [g, { ...def.opts[g], ...(st.opts?.[g] || {}) }]));
    else if (k === 'prefs') S.prefs = { ...def.prefs, ...st.prefs };
    else S[k] = st[k];
  }
}
/* Löschen geht nur ausdrücklich: gelöschte Match-ids merken, der nächste Sync meldet sie dem Server.
   (Fehlt ein Match bloß lokal – z. B. weil ein anderer Tab alten Stand gespeichert hat –, wird es NICHT gelöscht, sondern neu geholt.) */
export function markRemoved(ids) { S.pendingRemove = [...new Set([...(S.pendingRemove || []), ...ids])]; }
export function unmarkRemoved(id) { if (S.pendingRemove?.length) S.pendingRemove = S.pendingRemove.filter((x) => x !== id); }

export function resetAll() {
  const gone = S.matches.map((m) => m.id).concat(S.pendingRemove || []);
  const seeded = S.demoSeeded; // Testdaten nach „Alle Daten löschen“ nicht erneut einfügen
  try { localStorage.removeItem(KEY); } catch (e) { /* */ }
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, DEF());
  S.demoSeeded = !!seeded;
  S.cleanV = 1;
  S.pendingRemove = gone; // „Alle Daten löschen“ löscht auch im Konto
}

export const uid = (p) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/* ---------- Profile ---------- */
export const profile = (id) => S.profiles.find((p) => p.id === id);
/** Namen von Freunden (keine eigenen Profile): aus der Aufstellung bzw. aus m.names der Matches */
let namesIdx = { n: -1, map: new Map() };
function friendName(id) {
  const e = S.lineup.find((x) => x.id === id && x.name); if (e) return e.name;
  if (S.current?.names?.[id]) return S.current.names[id];
  if (namesIdx.n !== S.matches.length) {
    const map = new Map();
    for (const m of S.matches) if (m.names) for (const [k, v] of Object.entries(m.names)) map.set(k, v);
    namesIdx = { n: S.matches.length, map };
  }
  return namesIdx.map.get(id);
}
export const nameOf = (id) => profile(id)?.name ?? bot(id)?.name ?? friendName(id) ?? '?';
/** Ist dieser Spieler ein Freund aus einem anderen Konto (kein eigenes Profil, kein Bot)? */
export const isFriendId = (id) => !profile(id) && !bot(id) && id !== S.mainId;
export const findProfile = (name) => { const k = name.trim().toLowerCase(); return S.profiles.find((p) => p.name.toLowerCase() === k); };
/** Ist der Name schon vergeben (Profil oder Bot)? Groß/Klein und Leerzeichen am Rand egal. */
export const nameTaken = (name) => { const k = name.trim().toLowerCase(); return !!k && (!!findProfile(k) || BOTS.some((b) => b.name.toLowerCase() === k)); };
/** Profil zum Namen holen oder neu anlegen (Groß/Klein egal). Gibt die id zurück. */
export function ensureProfile(name) {
  const n = name.trim();
  if (!n) return null;
  let p = findProfile(n);
  if (!p) { p = { id: uid('p'), name: n, createdAt: Date.now() }; S.profiles.push(p); }
  return p.id;
}

/* ---------- Anzeige von Seiten (Einzelspieler oder Team) ---------- */
export const isTeam = (side) => side.length > 1;
export const sideName = (side) => (isTeam(side) ? `TEAM ${side.map(nameOf).join(' · ')}` : nameOf(side[0]));
export const possessive = (n) => (/[sßxz]$/i.test(n) ? `${n}’` : `${n}s`);
