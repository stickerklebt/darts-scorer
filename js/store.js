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
  },
  prefs: { voice: false, hints: true, dartInput: 'keys', anim: true },
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

export function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* privater Modus */ } }
export function resetAll() {
  const seeded = S.demoSeeded; // Testdaten nach „Alle Daten löschen“ nicht erneut einfügen
  try { localStorage.removeItem(KEY); } catch (e) { /* */ }
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, DEF());
  S.demoSeeded = !!seeded;
  S.cleanV = 1;
}

export const uid = (p) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/* ---------- Profile ---------- */
export const profile = (id) => S.profiles.find((p) => p.id === id);
export const nameOf = (id) => profile(id)?.name ?? bot(id)?.name ?? '?';
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
