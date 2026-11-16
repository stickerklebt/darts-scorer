/* Einstieg: Rendering, Aktionen, Events. */
import { S, ui, save, resetAll, ensureProfile, findProfile, profile, nameOf, sideName } from './store.js';
import { createMatch } from './match.js';
import * as X from './x01.js';
import * as G from './party.js';
import { GAMES, MAX_PLAYERS } from './games.js';
import { esc } from './ui/common.js';
import { onboardView, tabsBar, playView } from './ui/play.js';
import { statsView } from './ui/stats-view.js';
import { setupView } from './ui/setup.js';
import { gameView } from './ui/game.js';
import { resultView } from './ui/result.js';
import { momentView } from './ui/moments.js';
import { sheetView } from './ui/sheets.js';
import { crest } from './ui/svg.js';

const $ = (s) => document.querySelector(s);

/* ---------------- Rendering ---------------- */
function render() {
  save();
  const m = S.current;
  let html;
  if (!S.mainId || !profile(S.mainId)) html = onboardView();
  else if (S.screen === 'game' && m && !m.done) html = gameView() + momentView();
  else if (S.screen === 'result' && m && m.done) html = tabsBar() + resultView();
  else if (S.screen === 'setup' && GAMES[S.game]) html = setupView();
  else { S.screen = 'home'; html = tabsBar() + (S.tab === 'stats' ? statsView() : playView()); }
  html += sheetView();
  if (ui.toast) html += `<div class="toast">${esc(ui.toast)}</div>`;
  $('#app').innerHTML = html;
  // Tab-Strich gleitet von der alten zur neuen Position
  const tl = $('.tabline');
  if (tl) {
    const to = S.tab === 'stats' && S.screen === 'home' ? 1 : 0;
    if (ui.tabFrom !== null && ui.tabFrom !== to) requestAnimationFrame(() => requestAnimationFrame(() => tl.style.setProperty('--i', to)));
    else tl.style.setProperty('--i', to);
    ui.tabFrom = to;
  }
}

let toastTimer = null;
function toast(msg) { ui.toast = msg; clearTimeout(toastTimer); toastTimer = setTimeout(() => { ui.toast = null; render(); }, 1800); }
let momentTimer = null;
function moment(mo, autoClose = 0) {
  ui.moment = mo;
  clearTimeout(momentTimer);
  if (autoClose) momentTimer = setTimeout(() => { if (ui.moment === mo) { ui.moment = null; render(); } }, autoClose);
}

/* ---------------- Ansage & Display an ---------------- */
function say(txt) {
  if (!S.prefs.voice || !('speechSynthesis' in window)) return;
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(txt); u.lang = 'de-DE'; u.rate = 1.05; speechSynthesis.speak(u); } catch (e) { /* */ }
}
let wakeLock = null;
async function requestWakeLock() {
  try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch (e) { wakeLock = null; }
}
function releaseWakeLock() { try { wakeLock && wakeLock.release(); } catch (e) { /* */ } wakeLock = null; }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.screen === 'game') requestWakeLock(); });

/* ---------------- Match-Ablauf ---------------- */
const archive = (m) => { S.matches.push(JSON.parse(JSON.stringify({ ...m, pending: [], endedAt: Date.now() }))); };
const unarchive = (m) => { const i = S.matches.findIndex((x) => x.id === m.id); if (i >= 0) S.matches.splice(i, 1); };

function finish() {
  const m = S.current;
  m.endedAt = Date.now();
  archive(m);
  say(`${sideName(m.sides[m.winners[0]])} gewinnt`);
  ui.modal = null; ui.moment = null; ui.entry = ''; ui.mult = 1;
  S.screen = 'result';
  releaseWakeLock();
  render();
  window.scrollTo(0, 0);
}

function handle(res) {
  const m = S.current;
  if (res.type === 'error') { toast(res.msg); return render(); }
  const t = res.turn;
  if (res.type === 'match') return finish();
  if (m.game === 'x01') {
    if (res.type === 'bust') { toast('Überworfen'); say('Überworfen'); }
    else if (res.type === 'turn') {
      say(t.score === 0 ? 'Kein Score' : t.score === 180 ? 'Einhundertachtzig!' : String(t.score));
      if (t.score === 180) moment({ kind: '180', pid: t.pid }, 2600);
    } else if (res.type === 'leg' || res.type === 'set') {
      moment({ kind: 'leg', s: t.s, pid: t.pid, score: t.score, darts: t.darts, set: res.type === 'set' });
      say(`${res.type === 'set' ? 'Set' : 'Leg'}, ${sideName(m.sides[t.s])}`);
    }
  } else if (res.type === 'halved') { toast(`Halbiert: ${res.before} → ${res.after}`); say('Halbiert'); }
  else if (res.type === 'turn') say(String(t.v));
  render();
}

function undo() {
  const m = S.current;
  if (!m) return;
  ui.modal = null; ui.moment = null; ui.entry = '';
  if (m.done) { unarchive(m); m.endedAt = undefined; S.screen = 'game'; requestWakeLock(); }
  if (m.game === 'x01') X.undo(m); else G.undo(m);
  render();
}

function buildSides() {
  const L = S.lineup;
  if (!S.teamMode) return L.map((e) => [e.id]);
  const groups = new Map();
  for (const e of L) { if (!groups.has(e.team)) groups.set(e.team, []); groups.get(e.team).push(e.id); }
  return [...groups.keys()].sort().map((k) => groups.get(k));
}

function startGame() {
  if (!S.lineup.length) { toast('Mindestens ein Spieler'); return render(); }
  const sides = buildSides();
  if (S.teamMode && sides.length < 2) { toast('Mindestens zwei Teams nötig'); return render(); }
  S.current = createMatch(S.game, sides, S.opts[S.game], 0);
  S.screen = 'game';
  ui.entry = ''; ui.modal = null; ui.moment = null; ui.mult = 1;
  requestWakeLock();
  render();
}

function addToLineup(id) {
  if (!id) return;
  if (S.lineup.some((e) => e.id === id)) { toast(`${nameOf(id)} ist schon dabei`); return render(); }
  if (S.lineup.length >= MAX_PLAYERS) { toast(`Maximal ${MAX_PLAYERS} Spieler`); return render(); }
  const teams = S.lineup.map((e) => e.team);
  const team = teams.filter((t) => t === 'A').length <= teams.filter((t) => t === 'B').length ? 'A' : 'B';
  S.lineup.push({ id, team });
  render();
}

/* ---------------- Aktionen ---------------- */
const field = (id) => ($(`#${id}`)?.value || '').trim();
const actions = {
  onboard() {
    const n = field('nameField');
    if (!n) return $('#nameField').focus();
    S.mainId = ensureProfile(n);
    S.lineup = [{ id: S.mainId, team: 'A' }];
    S.screen = 'home'; S.tab = 'play'; render();
  },
  tab(el) { S.tab = el.dataset.v; S.screen = 'home'; if (S.current && S.current.done) S.current = null; render(); window.scrollTo(0, 0); },
  rename() { ui.modal = { type: 'rename' }; render(); setTimeout(() => $('#nameField')?.focus(), 50); },
  saveName() {
    const n = field('nameField'), other = findProfile(n);
    if (!n) return;
    if (other && other.id !== S.mainId) { toast(`„${other.name}“ gibt es schon`); return render(); }
    profile(S.mainId).name = n; ui.modal = null; render();
  },
  settings() { ui.modal = { type: 'settings' }; render(); },
  statsWho() { ui.modal = { type: 'pickStats' }; render(); },
  statsPick(el) { S.statsPid = el.dataset.v; ui.modal = null; ui.heatSel = null; render(); },
  period(el) { S.statsPeriod = el.dataset.v; render(); },
  heat(el) { ui.heatSel = ui.heatSel === el.dataset.v ? null : el.dataset.v; render(); },
  heatSort(el) { ui.heatSort = el.dataset.v; render(); },
  play501() {
    const pid = S.statsPid && profile(S.statsPid) ? S.statsPid : S.mainId;
    S.game = 'x01'; S.opts.x01.start = 501;
    if (!S.lineup.some((e) => e.id === pid)) S.lineup.unshift({ id: pid, team: 'A' });
    S.lineup = S.lineup.slice(0, MAX_PLAYERS);
    S.screen = 'setup'; render(); window.scrollTo(0, 0);
  },
  wipe() { ui.modal = { type: 'wipe' }; render(); },
  wipeForce() { resetAll(); ui.modal = null; releaseWakeLock(); render(); },
  home() {
    ui.modal = null; ui.moment = null; ui.entry = '';
    if (S.current && S.current.done) S.current = null;
    S.screen = 'home'; S.tab = 'play'; releaseWakeLock(); render();
  },
  pick(el) { S.game = el.dataset.v; S.screen = 'setup'; render(); window.scrollTo(0, 0); },
  quickstart() {
    S.game = 'x01';
    if (!S.lineup.length) { S.screen = 'setup'; return render(); }
    actions.start();
  },
  resume() { S.screen = 'game'; requestWakeLock(); render(); },
  opt(el) {
    const o = S.opts[S.game], k = el.dataset.k, v = el.dataset.v;
    o[k] = /^\d+$/.test(v) ? Number(v) : v;
    if (k === 'mode') o.target = Math.min(o.target, o.mode === 'sets' ? 5 : 7);
    render();
  },
  teamMode(el) {
    S.teamMode = el.dataset.v === '1';
    if (S.teamMode) S.lineup.forEach((e, i) => { e.team = i === 0 ? 'A' : 'B'; });
    render();
  },
  team(el) {
    const e = S.lineup[Number(el.dataset.v)], letters = 'ABCDEF'.slice(0, Math.max(2, Math.min(6, S.lineup.length)));
    e.team = letters[(letters.indexOf(e.team) + 1) % letters.length];
    render();
  },
  addNew() { const n = field('newPlayer'); if (!n) return $('#newPlayer')?.focus(); addToLineup(ensureProfile(n)); },
  addProfile(el) { addToLineup(el.dataset.v); },
  pdel(el) { S.lineup.splice(Number(el.dataset.v), 1); render(); },
  pup(el) { const i = Number(el.dataset.v), L = S.lineup; [L[i - 1], L[i]] = [L[i], L[i - 1]]; render(); },
  pshuffle() { const L = S.lineup; for (let i = L.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [L[i], L[j]] = [L[j], L[i]]; } render(); },
  start() { if (S.current && !S.current.done) { ui.modal = { type: 'confirmNew' }; render(); } else startGame(); },
  startForce() { startGame(); },
  key(el) {
    const next = (ui.entry + el.dataset.v).replace(/^0+(?=\d)/, '');
    if (Number(next) > 180) { toast('Maximal 180'); return render(); }
    ui.entry = next; render();
  },
  back() { if (ui.entry) { ui.entry = ui.entry.slice(0, -1); render(); } else undo(); },
  ok() { actions.submit(ui.entry === '' ? 0 : parseInt(ui.entry, 10)); },
  quick(el) { actions.submit(Number(el.dataset.v)); },
  submit(v) { ui.entry = ''; const m = S.current; handle(m.game === 'x01' ? X.submitSum(m, v) : G.submit(m, v)); },
  hits(el) { handle(G.submit(S.current, Number(el.dataset.v))); },
  mult(el) { ui.mult = Number(el.dataset.v); render(); },
  dart(el) { const n = Number(el.dataset.v), mult = n === 0 ? 1 : ui.mult; ui.mult = 1; handle(X.throwDart(S.current, n, mult)); },
  bull(el) { ui.mult = 1; handle(X.throwDart(S.current, 25, Number(el.dataset.v))); },
  board(el) { ui.mult = 1; handle(X.throwDart(S.current, Number(el.dataset.n), Number(el.dataset.m))); },
  dartInput(el) { S.prefs.dartInput = el.dataset.v; render(); },
  momentClose() { ui.moment = null; clearTimeout(momentTimer); render(); },
  undo() { undo(); },
  gear() { ui.modal = { type: 'gear' }; render(); },
  pref(el) { const k = el.dataset.k; S.prefs[k] = !S.prefs[k]; if (k === 'voice' && !S.prefs.voice) try { speechSynthesis.cancel(); } catch (e) { /* */ } render(); },
  abort() { ui.modal = { type: 'abort' }; render(); },
  abortForce() { S.current = null; ui.modal = null; ui.moment = null; S.screen = 'home'; releaseWakeLock(); render(); },
  closeModal() { ui.modal = null; render(); },
  scrim() { ui.modal = null; render(); },
  rematch() {
    const m = S.current;
    S.current = createMatch(m.game, m.sides, m.opts, m.first + 1);
    S.screen = 'game'; ui.entry = ''; ui.modal = null; ui.moment = null; ui.mult = 1;
    requestWakeLock(); render();
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  if (el.dataset.act === 'scrim' && e.target !== el) return;
  actions[el.dataset.act]?.(el);
});
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input')) {
    if (e.key !== 'Enter') return;
    if (e.target.id === 'newPlayer') actions.addNew();
    else if (e.target.id === 'nameField') (ui.modal ? actions.saveName : actions.onboard)();
    return;
  }
  const m = S.current;
  if (S.screen !== 'game' || ui.modal || !m || m.done || m.game === 'atc') return;
  if (ui.moment) { if (e.key === 'Enter' || e.key === 'Escape') actions.momentClose(); return; }
  if (m.game === 'x01' && X.inputMode(m) === 'darts') { if (e.key === 'Backspace') undo(); return; }
  if (/^\d$/.test(e.key)) actions.key({ dataset: { v: e.key } });
  else if (e.key === 'Enter') actions.ok();
  else if (e.key === 'Backspace') actions.back();
});

/* ---------------- Start ---------------- */
render();
const splash = document.createElement('div');
splash.className = 'splash';
splash.innerHTML = crest({ size: 220 });
document.body.appendChild(splash);
setTimeout(() => { splash.classList.add('out'); setTimeout(() => splash.remove(), 500); }, 900);
if (S.screen === 'game') requestWakeLock();
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
